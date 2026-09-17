import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const adminClient = createClient(url, serviceKey);

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => null);
  const action = body?.action as string | undefined;
  const bookingId = body?.booking_id as string | undefined;
  if (!action || !bookingId) return json({ error: "action_and_booking_id_required" }, 400);

  const { data: booking, error: bookingError } = await adminClient
    .from("bookings")
    .select("*, partners!inner(id,user_id,full_name,verification_status,active)")
    .eq("id", bookingId)
    .maybeSingle();
  if (bookingError || !booking) return json({ error: "booking_not_found" }, 404);

  const isCustomer = booking.customer_id === user.id;
  const isPartner = booking.partners?.user_id === user.id;
  const { data: profile } = await adminClient.from("user_profiles").select("role").eq("id", user.id).maybeSingle();
  const isAdmin = profile?.role === "admin";

  if (!isCustomer && !isPartner && !isAdmin) return json({ error: "forbidden" }, 403);

  const now = new Date();
  const notify = async (userId: string, type: string, title: string, message: string) => {
    await adminClient.from("notifications").insert({ user_id: userId, type, title, body: message, booking_id: bookingId });
  };
  const audit = async (actionName: string, reason: string | null, beforeData: unknown, afterData: unknown) => {
    await adminClient.from("audit_logs").insert({ actor_user_id: user.id, action: actionName, entity_type: "booking", entity_id: bookingId, reason, before_data: beforeData, after_data: afterData });
  };

  if (action === "accept") {
    if (!isPartner && !isAdmin) return json({ error: "partner_or_admin_required" }, 403);
    if (booking.status !== "requested") return json({ error: "booking_not_requested" }, 409);
    if (!isAdmin && booking.partners?.user_id !== user.id) return json({ error: "not_assigned_partner" }, 403);
    if (booking.partner_response_deadline && new Date(booking.partner_response_deadline) <= now) return json({ error: "response_window_expired" }, 409);

    const { data: updated, error } = await adminClient.from("bookings").update({
      status: "accepted", accepted_at: now.toISOString(), updated_at: now.toISOString()
    }).eq("id", bookingId).eq("status", "requested").select().maybeSingle();
    if (error || !updated) return json({ error: "accept_failed" }, 409);
    await adminClient.from("chat_threads").upsert({ booking_id: bookingId }, { onConflict: "booking_id" });
    await notify(booking.customer_id, "booking_accepted", "Booking accepted", "Your partner accepted the booking request.");
    await audit("booking.accept", null, booking, updated);
    return json({ ok: true, booking: updated });
  }

  if (action === "reject") {
    if (!isPartner && !isAdmin) return json({ error: "partner_or_admin_required" }, 403);
    if (booking.status !== "requested") return json({ error: "booking_not_requested" }, 409);
    const { data: updated, error } = await adminClient.from("bookings").update({
      status: "rejected", rejected_at: now.toISOString(), updated_at: now.toISOString()
    }).eq("id", bookingId).eq("status", "requested").select().maybeSingle();
    if (error || !updated) return json({ error: "reject_failed" }, 409);

    const refundable = Number(booking.total_amount || 0);
    if (refundable > 0) {
      await adminClient.from("refunds").insert({ booking_id: bookingId, requested_by: user.id, amount: refundable, reason: "partner_rejection", status: "pending" });
      await adminClient.from("financial_ledger").insert({ booking_id: bookingId, user_id: booking.customer_id, entry_type: "refund_requested", direction: "credit", amount: refundable, status: "pending", metadata: { reason: "partner_rejection" } });
    }
    await notify(booking.customer_id, "booking_rejected", "Booking rejected", "The partner rejected the booking request. Any eligible refund is now queued for processing.");
    await audit("booking.reject", null, booking, updated);
    return json({ ok: true, booking: updated, refund_queued: refundable > 0 });
  }

  if (action === "cancel") {
    if (!isCustomer && !isPartner && !isAdmin) return json({ error: "participant_or_admin_required" }, 403);
    if (!["requested", "accepted", "confirmed"].includes(booking.status)) return json({ error: "booking_not_cancellable" }, 409);

    const cancelledBy = isAdmin ? "admin" : isPartner ? "partner" : "customer";
    const patch = { status: "cancelled", cancelled_at: now.toISOString(), cancelled_by: user.id, cancellation_reason: body?.reason ?? cancelledBy, updated_at: now.toISOString() };
    const { data: updated, error } = await adminClient.from("bookings").update(patch).eq("id", bookingId).select().maybeSingle();
    if (error || !updated) return json({ error: "cancel_failed" }, 409);

    // Refund percentage is calculated here only as policy state; actual provider refund is deliberately not claimed.
    let refundPercent = 0;
    if (booking.status === "requested" || cancelledBy === "partner" || cancelledBy === "admin") refundPercent = 100;
    else if (cancelledBy === "customer" && booking.booking_date && booking.booking_time) {
      const starts = new Date(`${booking.booking_date}T${String(booking.booking_time).slice(0, 8)}`);
      const hours = (starts.getTime() - now.getTime()) / 3600000;
      refundPercent = hours >= 24 ? 100 : hours >= 12 ? 75 : hours >= 6 ? 50 : 0;
    }
    const refundAmount = Math.round(Number(booking.total_amount || 0) * refundPercent) / 100;
    if (refundAmount > 0) {
      await adminClient.from("refunds").insert({ booking_id: bookingId, requested_by: user.id, amount: refundAmount, reason: `cancellation_${cancelledBy}_${refundPercent}pct`, status: "pending" });
      await adminClient.from("financial_ledger").insert({ booking_id: bookingId, user_id: booking.customer_id, entry_type: "refund_requested", direction: "credit", amount: refundAmount, status: "pending", metadata: { refund_percent: refundPercent, cancelled_by: cancelledBy } });
    }
    const otherUser = isCustomer ? booking.partners.user_id : booking.customer_id;
    await notify(otherUser, "booking_cancelled", "Booking cancelled", `The booking was cancelled. Refund policy result: ${refundPercent}% eligible, subject to provider processing.`);
    await audit("booking.cancel", body?.reason ?? cancelledBy, booking, updated);
    return json({ ok: true, booking: updated, refund_percent: refundPercent, refund_amount: refundAmount, refund_status: refundAmount > 0 ? "pending" : "not_eligible" });
  }

  return json({ error: "unsupported_action" }, 400);
});

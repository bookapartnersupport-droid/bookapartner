import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(url, serviceKey);
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: 'unauthorized' }, 401);

  const body = await req.json().catch(() => null) as Record<string, any> | null;
  if (!body?.partner_id || !body?.service || !body?.booking_date || !body?.booking_time || !body?.meeting_location) return json({ error: 'partner_service_date_time_location_required' }, 400);
  const duration = Number(body.duration_hours || 1);
  const rate = Number(body.partner_rate || 0);
  if (!Number.isInteger(duration) || duration < 1 || duration > 24) return json({ error: 'invalid_duration' }, 400);
  if (!Number.isFinite(rate) || rate <= 0) return json({ error: 'invalid_rate' }, 400);

  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'customer' && profile?.role !== 'admin') return json({ error: 'customer_required' }, 403);

  const { data: partner, error: partnerError } = await admin.from('partners').select('id,user_id,full_name,services,hourly_rate,verification_status,active').eq('id', body.partner_id).maybeSingle();
  if (partnerError || !partner) return json({ error: 'partner_not_found' }, 404);
  if (!partner.active || partner.verification_status !== 'approved') return json({ error: 'partner_not_available' }, 409);
  if (!Array.isArray(partner.services) || !partner.services.includes(String(body.service))) return json({ error: 'service_not_offered_by_partner' }, 409);

  const requestedRate = Math.round(rate * 100) / 100;
  const officialRate = Math.round(Number(partner.hourly_rate || 0) * 100) / 100;
  if (Math.abs(requestedRate - officialRate) > 0.01) return json({ error: 'partner_rate_changed_refresh_and_retry', official_rate: officialRate }, 409);

  const bookingDate = String(body.booking_date);
  const bookingTime = String(body.booking_time).slice(0, 8);
  const start = new Date(`${bookingDate}T${bookingTime}`);
  if (Number.isNaN(start.getTime())) return json({ error: 'invalid_booking_datetime' }, 400);
  if (start.getTime() < Date.now() + 5 * 60 * 1000) return json({ error: 'booking_must_be_at_least_5_minutes_in_future' }, 400);

  const durationDiscountPercent = duration === 1 ? 0 : duration === 2 ? 5 : duration === 3 ? 10 : duration === 4 ? 15 : 20;
  const gross = Math.round(officialRate * duration * 100) / 100;
  const discount = Math.round(gross * durationDiscountPercent / 100 * 100) / 100;
  const transport = Math.min(150, Math.max(0, Number(body.transport_charge || 0)));
  const total = Math.round((gross - discount + transport) * 100) / 100;
  const deadline = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const idempotencyKey = String(body.idempotency_key || crypto.randomUUID());

  const { data: existing } = await admin.from('action_idempotency').select('response_status,response_body,status').eq('actor_user_id', user.id).eq('idempotency_key', idempotencyKey).maybeSingle();
  if (existing?.status === 'completed' && existing.response_body) return json(existing.response_body, Number(existing.response_status || 200));
  if (existing?.status === 'processing') return json({ error: 'booking_request_already_processing' }, 409);

  const { data: idem, error: idemError } = await admin.from('action_idempotency').upsert({ actor_user_id: user.id, idempotency_key: idempotencyKey, action: 'booking.create', status: 'processing' }, { onConflict: 'actor_user_id,idempotency_key' }).select().maybeSingle();
  if (idemError) return json({ error: 'idempotency_error' }, 500);

  try {
    const { data: conflicts } = await admin.from('bookings').select('id,booking_time,duration_hours').eq('partner_id', partner.id).eq('booking_date', bookingDate).in('status',['requested','accepted','confirmed']);
    const requestedStart = start.getTime();
    const requestedEnd = requestedStart + duration * 60 * 60 * 1000;
    const overlap = (conflicts || []).some((b: any) => {
      const existingStart = new Date(`${bookingDate}T${String(b.booking_time).slice(0,8)}`).getTime();
      const existingEnd = existingStart + Number(b.duration_hours || 1) * 60 * 60 * 1000;
      return requestedStart < existingEnd && existingStart < requestedEnd;
    });
    if (overlap) return json({ error: 'partner_unavailable_for_selected_time' }, 409);

    const { data: booking, error: bookingError } = await admin.from('bookings').insert({
      customer_id: user.id,
      partner_id: partner.id,
      service: String(body.service),
      partner_gender_preference: body.partner_gender_preference ?? null,
      preferred_age: body.preferred_age ?? null,
      city: body.city ?? 'Gurgaon NCR',
      area: body.area ?? null,
      meeting_location: String(body.meeting_location),
      booking_date: bookingDate,
      booking_time: bookingTime,
      partner_rate: officialRate,
      transport_charge: transport,
      total_amount: total,
      status: 'requested',
      payment_status: 'held',
      payout_status: 'locked',
      duration_hours: duration,
      partner_response_deadline: deadline,
      issue_reported: false,
      updated_at: new Date().toISOString()
    }).select().single();
    if (bookingError || !booking) throw bookingError || new Error('booking_create_failed');

    const paymentReference = 'DEMO-' + booking.id;
    const { error: paymentError } = await admin.from('payment_transactions').insert({ booking_id: booking.id, customer_id: user.id, amount: total, currency: 'INR', status: 'captured', provider: 'demo', provider_reference: paymentReference, metadata: { mode: 'frontend_lifecycle_demo', duration_discount_percent: durationDiscountPercent, gross_amount: gross, discount_amount: discount, transport_charge: transport } });
    if (paymentError) throw paymentError;

    await admin.from('financial_ledger').insert({ booking_id: booking.id, user_id: user.id, entry_type: 'booking_payment', direction: 'debit', amount: total, currency: 'INR', status: 'held', provider: 'demo', provider_reference: paymentReference, metadata: { gross, discount, transport, duration } });
    await admin.from('notifications').insert({ user_id: partner.user_id, type: 'booking_request', title: 'New booking request', body: `New ${body.service} booking request. Please respond within 2 hours.`, booking_id: booking.id, data: { booking_id: booking.id, response_deadline: deadline }, priority: 'high' });
    await admin.from('notifications').insert({ user_id: user.id, type: 'booking_submitted', title: 'Booking request sent', body: 'Your payment is recorded as held and the partner has 2 hours to respond.', booking_id: booking.id, data: { booking_id: booking.id, response_deadline: deadline }, priority: 'normal' });
    await admin.from('audit_logs').insert({ actor_user_id: user.id, action: 'booking.create', entity_type: 'booking', entity_id: booking.id, reason: 'frontend booking request', after_data: booking });

    const response = { ok: true, booking, payment: { status: 'held', provider: 'demo', reference: paymentReference, gateway_pending: true }, pricing: { gross_amount: gross, discount_percent: durationDiscountPercent, discount_amount: discount, transport_charge: transport, total_amount: total } };
    await admin.from('action_idempotency').update({ status: 'completed', response_status: 200, response_body: response, completed_at: new Date().toISOString() }).eq('id', idem?.id);
    return json(response, 200);
  } catch (error) {
    await admin.from('action_idempotency').update({ status: 'failed', response_status: 500, response_body: { error: String((error as any)?.message || error) }, completed_at: new Date().toISOString() }).eq('id', idem?.id);
    console.error(error);
    return json({ error: String((error as any)?.message || 'booking_create_failed') }, 500);
  }
});

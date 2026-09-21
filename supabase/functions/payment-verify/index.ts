const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type,x-razorpay-signature,x-razorpay-event-id"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
async function hmac(m:string,s:string){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(s),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const x=await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(m));return [...new Uint8Array(x)].map(v=>v.toString(16).padStart(2,"0")).join("");}
function safe(a:string,b:string){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0;}
Deno.serve(async(req)=>{
if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});if(req.method!=="POST")return json({error:"method_not_allowed"},405);
const ah=req.headers.get("Authorization");if(!ah?.startsWith("Bearer "))return json({error:"unauthorized"},401);
const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,secret=Deno.env.get("RAZORPAY_KEY_SECRET");if(!secret)return json({error:"payment_gateway_not_configured"},503);
const uc=createClient(url,anon,{global:{headers:{Authorization:ah}}}),admin=createClient(url,service);const {data:{user},error:ae}=await uc.auth.getUser();if(ae||!user)return json({error:"unauthorized"},401);
const b=await req.json().catch(()=>null) as Record<string,any>|null,bookingId=String(b?.booking_id||""),paymentId=String(b?.razorpay_payment_id||""),orderId=String(b?.razorpay_order_id||""),sig=String(b?.razorpay_signature||"");if(!bookingId||!paymentId||!sig)return json({error:"payment_verification_fields_required"},400);
const {data:booking}=await admin.from("bookings").select("*").eq("id",bookingId).maybeSingle();if(!booking)return json({error:"booking_not_found"},404);if(booking.customer_id!==user.id)return json({error:"forbidden"},403);
const {data:tx}=await admin.from("payment_transactions").select("*").eq("booking_id",bookingId).eq("provider","razorpay").order("created_at",{ascending:false}).limit(1).maybeSingle();if(!tx?.provider_order_id)return json({error:"payment_order_not_found"},409);
if(orderId&&orderId!==tx.provider_order_id)return json({error:"payment_order_mismatch"},400);
if(tx.status==="captured"&&tx.provider_payment_id===paymentId&&booking.payment_status==="held")return json({ok:true,booking_id:bookingId,payment_status:"held",payment_id:paymentId,idempotent:true});
if(!safe(await hmac(tx.provider_order_id+"|"+paymentId,secret),sig))return json({error:"invalid_payment_signature"},400);
const keyId=Deno.env.get("RAZORPAY_KEY_ID")!,pr=await fetch("https://api.razorpay.com/v1/payments/"+encodeURIComponent(paymentId),{headers:{Authorization:"Basic "+btoa(keyId+":"+secret)}}),payment=await pr.json().catch(()=>({}));if(!pr.ok||payment?.order_id!==tx.provider_order_id)return json({error:"payment_backend_verification_failed"},400);
if(Number(payment.amount)!==Math.round(Number(booking.total_amount)*100)||payment.currency!=="INR")return json({error:"payment_amount_mismatch"},400);if(payment.status!=="captured")return json({error:"payment_not_captured",payment_status:payment.status},409);
const now=new Date().toISOString();
const upd=await admin.from("payment_transactions").update({status:"captured",provider_payment_id:paymentId,provider_reference:paymentId,metadata:{...(tx.metadata||{}),verified_via:"checkout_signature",payment_method:payment.method||null}}).eq("id",tx.id).in("status",["pending","authorized"]).select("id").maybeSingle();
if(upd.error)return json({error:"payment_transaction_update_failed"},500);
const bk=await admin.from("bookings").update({payment_status:"held",updated_at:now}).eq("id",bookingId).eq("payment_status","pending").select("id").maybeSingle();
if(bk.error)return json({error:"booking_payment_state_update_failed"},500);
if(upd.data){
  const led=await admin.from("financial_ledger").insert({booking_id:bookingId,user_id:user.id,entry_type:"booking_payment_captured",direction:"debit",amount:Number(booking.total_amount),currency:"INR",status:"held",provider:"razorpay",provider_reference:paymentId,metadata:{order_id:tx.provider_order_id}});
  if(led.error)return json({error:"financial_ledger_write_failed"},500);
  const note=await admin.from("notifications").insert({user_id:user.id,type:"payment_captured",title:"Payment successful",body:"Your booking payment was received and is now held for the booking.",booking_id:bookingId,data:{payment_id:paymentId,order_id:tx.provider_order_id},priority:"normal"});
  if(note.error)return json({error:"payment_notification_write_failed"},500);
}
return json({ok:true,booking_id:bookingId,payment_status:"held",payment_id:paymentId});
});
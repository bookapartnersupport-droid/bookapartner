const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type,x-razorpay-signature,x-razorpay-event-id"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
async function hmac(m:string,s:string){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(s),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const x=await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(m));return [...new Uint8Array(x)].map(v=>v.toString(16).padStart(2,"0")).join("");}
function safe(a:string,b:string){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0;}
Deno.serve(async(req)=>{
if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});if(req.method!=="POST")return json({error:"method_not_allowed"},405);
const secret=Deno.env.get("RAZORPAY_WEBHOOK_SECRET");if(!secret)return json({error:"webhook_not_configured"},503);
const raw=await req.text(),sig=req.headers.get("X-Razorpay-Signature")||"",valid=safe(await hmac(raw,secret),sig),url=Deno.env.get("SUPABASE_URL")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,admin=createClient(url,service);
let p:any;try{p=JSON.parse(raw)}catch{return json({error:"invalid_json"},400);}
const eventId=req.headers.get("X-Razorpay-Event-Id")||await hmac(raw,secret),eventType=String(p?.event||"");if(!valid)return json({error:"invalid_webhook_signature"},400);
let eventRow:any=null;
const ins=await admin.from("payment_webhook_events").insert({provider:"razorpay",event_id:eventId,event_type:eventType,signature_valid:true,processed:false,payload:p}).select("id").maybeSingle();
if(ins.error){
  if(ins.error.code!=="23505")return json({error:"webhook_event_store_failed"},500);
  const existing=await admin.from("payment_webhook_events").select("id,processed,error_message").eq("provider","razorpay").eq("event_id",eventId).maybeSingle();
  if(existing.error||!existing.data)return json({error:"webhook_event_lookup_failed"},500);
  if(existing.data.processed)return json({ok:true,duplicate:true});
  eventRow=existing.data;
}else eventRow=ins.data;
try{
const entity=p?.payload?.payment?.entity||p?.payload?.order?.entity||null,orderId=entity?.order_id||null,paymentId=entity?.id&&String(entity.id).startsWith("pay_")?entity.id:null;
let tx=null;
if(orderId)tx=(await admin.from("payment_transactions").select("*").eq("provider","razorpay").eq("provider_order_id",orderId).maybeSingle()).data;
if(!tx&&paymentId)tx=(await admin.from("payment_transactions").select("*").eq("provider","razorpay").eq("provider_payment_id",paymentId).maybeSingle()).data;
if(tx&&(eventType==="payment.captured"||eventType==="order.paid")){
  if(Number(entity?.amount)!==Math.round(Number(tx.amount)*100))throw new Error("webhook_amount_mismatch");
  await admin.from("payment_transactions").update({status:"captured",provider_payment_id:paymentId||tx.provider_payment_id,provider_reference:paymentId||tx.provider_reference,metadata:{...(tx.metadata||{}),webhook_event:eventType}}).eq("id",tx.id);
  await admin.from("bookings").update({payment_status:"held",updated_at:new Date().toISOString()}).eq("id",tx.booking_id).in("payment_status",["pending"]);
}
if(tx&&eventType==="payment.failed"&&tx.status!=="captured")await admin.from("payment_transactions").update({status:"failed",metadata:{...(tx.metadata||{}),webhook_event:eventType,error:entity?.error_description||null}}).eq("id",tx.id);
await admin.from("payment_webhook_events").update({processed:true,processed_at:new Date().toISOString(),error_message:null}).eq("id",eventRow.id);
return json({ok:true});
}catch(e){
await admin.from("payment_webhook_events").update({processed:false,error_message:String((e as any)?.message||e)}).eq("id",eventRow.id);
return json({error:"webhook_processing_failed"},500);
}
});
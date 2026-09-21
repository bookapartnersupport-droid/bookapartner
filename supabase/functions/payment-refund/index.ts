const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 const ah=req.headers.get("Authorization");if(!ah?.startsWith("Bearer "))return json({error:"unauthorized"},401);
 const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,kid=Deno.env.get("RAZORPAY_KEY_ID"),secret=Deno.env.get("RAZORPAY_KEY_SECRET");if(!kid||!secret)return json({error:"payment_gateway_not_configured"},503);
 const uc=createClient(url,anon,{global:{headers:{Authorization:ah}}}),admin=createClient(url,service);const {data:{user},error:ae}=await uc.auth.getUser();if(ae||!user)return json({error:"unauthorized"},401);
 const {data:profile}=await admin.from("user_profiles").select("role").eq("id",user.id).maybeSingle();if(profile?.role!=="admin")return json({error:"admin_required"},403);
 const b=await req.json().catch(()=>null) as Record<string,any>|null,rid=String(b?.refund_id||"");if(!rid)return json({error:"refund_id_required"},400);
 const {data:r}=await admin.from("refunds").select("*").eq("id",rid).maybeSingle();if(!r)return json({error:"refund_not_found"},404);
 if(r.status==="succeeded")return json({ok:true,already_processed:true,refund:r});
 const claim=await admin.from("refunds").update({status:"processing",failure_reason:null}).eq("id",rid).in("status",["pending","failed"]).select().maybeSingle();
 if(claim.error)return json({error:"refund_claim_failed"},500);if(!claim.data)return json({error:"refund_already_processing"},409);
 const refund=claim.data;
 const {data:tx}=await admin.from("payment_transactions").select("*").eq("booking_id",refund.booking_id).eq("provider","razorpay").in("status",["captured","partially_refunded"]).order("created_at",{ascending:false}).limit(1).maybeSingle();
 if(!tx?.provider_payment_id){await admin.from("refunds").update({status:"failed",failure_reason:"captured_payment_not_found"}).eq("id",rid).eq("status","processing");return json({error:"captured_payment_not_found"},409);}
 const amount=Math.round(Number(refund.amount)*100);if(!Number.isInteger(amount)||amount<100){await admin.from("refunds").update({status:"failed",failure_reason:"invalid_refund_amount"}).eq("id",rid).eq("status","processing");return json({error:"invalid_refund_amount"},400);}
 const rr=await fetch("https://api.razorpay.com/v1/payments/"+encodeURIComponent(tx.provider_payment_id)+"/refund",{method:"POST",headers:{Authorization:"Basic "+btoa(kid+":"+secret),"Content-Type":"application/json"},body:JSON.stringify({amount,receipt:rid,notes:{booking_id:refund.booking_id,refund_id:rid}})});
 const d=await rr.json().catch(()=>({}));
 if(!rr.ok||!d?.id){await admin.from("refunds").update({status:"failed",failure_reason:String(d?.error?.description||"razorpay_refund_failed")}).eq("id",rid).eq("status","processing");return json({error:"razorpay_refund_failed",details:d},502);}
 const full=amount>=Math.round(Number(tx.amount)*100);
 const done=await admin.from("refunds").update({status:"succeeded",processed_at:new Date().toISOString(),provider:"razorpay",provider_reference:d.id,failure_reason:null}).eq("id",rid).eq("status","processing").select("id").maybeSingle();
 if(done.error||!done.data)return json({error:"refund_finalize_failed"},500);
 const newTxStatus=full?"refunded":"partially_refunded";
 const txu=await admin.from("payment_transactions").update({status:newTxStatus,provider_reference:d.id}).eq("id",tx.id).select("id").maybeSingle();
 if(txu.error)return json({error:"payment_transaction_refund_update_failed"},500);
 if(full){const bu=await admin.from("bookings").update({payment_status:"refunded",updated_at:new Date().toISOString()}).eq("id",refund.booking_id);if(bu.error)return json({error:"booking_refund_state_update_failed"},500);}
 return json({ok:true,refund_id:rid,provider_reference:d.id,status:d.status||"processed"});
});
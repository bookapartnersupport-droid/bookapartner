const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...corsHeaders,"Content-Type":"application/json"}});
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 const h=req.headers.get("Authorization");if(!h?.startsWith("Bearer "))return json({error:"unauthorized"},401);
 const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,uc=createClient(url,anon,{global:{headers:{Authorization:h}}}),admin=createClient(url,service);
 const {data:{user},error:ae}=await uc.auth.getUser();if(ae||!user)return json({error:"unauthorized"},401);
 const kid=Deno.env.get("RAZORPAY_KEY_ID"),secret=Deno.env.get("RAZORPAY_KEY_SECRET");if(!kid||!secret)return json({error:"payment_gateway_not_configured"},503);
 const b=await req.json().catch(()=>null) as Record<string,any>|null,id=String(b?.booking_id||"");if(!id)return json({error:"booking_id_required"},400);
 const {data:bk,error:be}=await admin.from("bookings").select("*").eq("id",id).maybeSingle();if(be||!bk)return json({error:"booking_not_found"},404);
 if(bk.customer_id!==user.id)return json({error:"forbidden"},403);if(bk.status!=="requested"||bk.payment_status!=="pending")return json({error:"booking_not_payable"},409);
 const amount=Math.round(Number(bk.total_amount)*100);if(!Number.isInteger(amount)||amount<100)return json({error:"invalid_payment_amount"},400);
 let tx=(await admin.from("payment_transactions").select("*").eq("booking_id",id).eq("status","pending").order("created_at",{ascending:false}).limit(1).maybeSingle()).data;
 if(!tx){const ins=await admin.from("payment_transactions").insert({booking_id:id,customer_id:user.id,amount:Number(bk.total_amount),currency:"INR",status:"pending",provider:"razorpay",metadata:{source:"payment-create-order"}}).select().single();if(ins.error&&ins.error.code==="23505"){const retry=await admin.from("payment_transactions").select("*").eq("booking_id",id).eq("status","pending").order("created_at",{ascending:false}).limit(1).maybeSingle();if(retry.error||!retry.data)return json({error:"payment_transaction_create_conflict"},409);tx=retry.data;}else{if(ins.error)return json({error:"payment_transaction_create_failed"},500);tx=ins.data;}}
 if(tx.provider_order_id)return json({ok:true,key_id:kid,order_id:tx.provider_order_id,amount,currency:"INR",transaction_id:tx.id});
 const rr=await fetch("https://api.razorpay.com/v1/orders",{method:"POST",headers:{Authorization:"Basic "+btoa(kid+":"+secret),"Content-Type":"application/json"},body:JSON.stringify({amount,currency:"INR",receipt:id,notes:{booking_id:id,customer_id:user.id}})});
 const o=await rr.json().catch(()=>({}));if(!rr.ok||!o?.id)return json({error:"razorpay_order_create_failed",details:o},502);
 const upd=await admin.from("payment_transactions").update({provider:"razorpay",provider_order_id:o.id,metadata:{booking_id:id,amount_inr:Number(bk.total_amount),duration_hours:bk.duration_hours}}).eq("id",tx.id).eq("status","pending").select("id").maybeSingle();
 if(upd.error)return json({error:"payment_transaction_order_link_failed"},500);if(!upd.data)return json({error:"payment_transaction_order_link_conflict"},409);
 return json({ok:true,key_id:kid,order_id:o.id,amount,currency:"INR",transaction_id:tx.id});
});
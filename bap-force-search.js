/* Final live partner search override */
(function(){
  window.findPartners = async function(){
    var results=document.getElementById('results');
    if(results) results.innerHTML='<div class="card">Searching live partners…</div>';
    try{
      var svc=document.getElementById('service')?.value||'';
      var age=document.getElementById('age')?.value||'';
      var gender=document.getElementById('customerGenderPreference')?.value||'';
      var minAge=age==='21–25'?21:age==='26–30'?26:age==='31–35'?31:age==='36–45'?36:age==='46+'?46:null;
      var maxAge=age==='21–25'?25:age==='26–30'?30:age==='31–35'?35:age==='36–45'?45:null;
      if(!svc) throw new Error('Please select a service.');
      var c=window.supabase.createClient('https://wmawmdwjjbvlqsugthhe.supabase.co','sb_publishable_mm_Qov_zXz5tUrlifTj_Ww_rD53yRmI',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      var ss=await c.auth.getSession();
      if(!ss.data?.session) throw new Error('Please login first.');
      var r=await c.rpc('bap_search_available_partners',{p_service:svc,p_gender:gender||null,p_min_age:minAge,p_max_age:maxAge});
      if(r.error) throw r.error;
      var rows=r.data||[];
      if(!results)return;
      results.innerHTML=rows.length?rows.map(function(p){return '<div class="card"><h3>'+String(p.full_name||'Partner').replace(/[&<>]/g,'')+' <span class="pill verified">✓ VERIFIED</span></h3><p>'+String(p.services?.join(', ')||svc)+'</p><p>Age: '+(p.age??'—')+' • '+(p.gender||'—')+'</p><p>📍 '+(p.area||p.city||'Gurgaon NCR')+'</p><p><strong>₹'+(p.hourly_rate??'—')+'/hour</strong></p></div>';}).join(''):'<div class="card">No approved partners match these filters right now.</div>';
    }catch(e){console.error('FINAL live partner search failed:',e);if(results)results.innerHTML='<div class="card">Search failed: '+String(e.message||e).replace(/[&<>]/g,'')+'</div>';}
  };
})();

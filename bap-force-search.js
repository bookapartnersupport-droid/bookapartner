/* Book A Partner final live search — loaded last by workflow */
(function(){
  async function runLiveSearch(){
    var results=document.getElementById('results');
    if(results) results.innerHTML='<div class="card"><b>Searching live partners…</b></div>';
    try{
      var service=(document.getElementById('service')||{}).value||'';
      var age=(document.getElementById('age')||{}).value||'';
      var gender=(document.getElementById('customerGenderPreference')||{}).value||'';
      var minAge=null,maxAge=null;
      if(age==='21–25'){minAge=21;maxAge=25;}
      else if(age==='26–30'){minAge=26;maxAge=30;}
      else if(age==='31–35'){minAge=31;maxAge=35;}
      else if(age==='36–45'){minAge=36;maxAge=45;}
      else if(age==='46+'){minAge=46;}
      if(!service) throw new Error('Service is not selected.');
      if(!window.supabase||!window.supabase.createClient) throw new Error('Supabase library is not loaded.');
      var c=window.supabase.createClient('https://wmawmdwjjbvlqsugthhe.supabase.co','sb_publishable_mm_Qov_zXz5tUrlifTj_Ww_rD53yRmI',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      var session=await c.auth.getSession();
      if(!session.data||!session.data.session) throw new Error('Customer session is missing. Please login again.');
      var q=await c.rpc('bap_search_available_partners',{p_service:service,p_gender:gender||null,p_min_age:minAge,p_max_age:maxAge});
      if(q.error) throw new Error((q.error.message||'RPC failed')+' [code '+(q.error.code||'unknown')+']');
      var rows=q.data||[];
      if(!results)return;
      results.innerHTML=rows.length?rows.map(function(p){
        return '<div class="card" style="margin-bottom:14px"><h3>'+String(p.full_name||'Partner').replace(/[&<>]/g,'')+' <span class="pill verified">✓ VERIFIED</span></h3><p>'+String((p.services||[]).join(', '))+'</p><p>Age: '+(p.age??'—')+' • '+String(p.gender||'—')+'</p><p>📍 '+String(p.area||p.city||'Gurgaon NCR')+'</p><p><strong>₹'+String(p.hourly_rate??'—')+'/hour</strong></p><button type="button" class="pink full" style="margin-top:12px" data-bap-partner-id="'+String(p.id)+'" data-bap-partner-rate="'+String(p.hourly_rate??'')+'" data-bap-partner-rating="'+String(p.rating??0)+'" data-bap-partner-reviews="'+String(p.review_count??0)+'">Request Booking</button></div>';
      }).join(''):'<div class="card">Live search completed: no approved partner matched these filters.</div>';
    }catch(e){
      console.error('BAP FINAL SEARCH ERROR',e);
      if(results) results.innerHTML='<div class="card" style="border:2px solid #dc2626"><b>Live search error:</b><br>'+String(e.message||e).replace(/[&<>]/g,'')+'</div>';
    }
  }
  window.bapFinalFind=runLiveSearch;
  window.findPartners=runLiveSearch;
  document.addEventListener('click',function(e){
    var b=e.target.closest && e.target.closest('button');
    if(!b)return;
    var label=(b.textContent||'').trim();
    if(label.indexOf('Find Available Partners')===0){
      e.preventDefault();
      e.stopImmediatePropagation();
      runLiveSearch();
      return;
    }
    var partnerId=b.getAttribute('data-bap-partner-id');
    if(partnerId){
      localStorage.setItem('bap_selected_partner_id',partnerId);
      localStorage.setItem('bap_selected_partner_rate',b.getAttribute('data-bap-partner-rate')||'');
      localStorage.setItem('bap_selected_partner_rating',b.getAttribute('data-bap-partner-rating')||'0');
      localStorage.setItem('bap_selected_partner_reviews',b.getAttribute('data-bap-partner-reviews')||'0');
      e.preventDefault();
      e.stopImmediatePropagation();
      if(typeof window.BAP_liveSelectPartner==='function') window.BAP_liveSelectPartner(partnerId);
      else alert('Live booking module is still loading. Please try again.');
    }
  },true);
})();
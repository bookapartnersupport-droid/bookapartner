/* Book A Partner final live search — loaded last by workflow */
(function(){
  async function runLiveSearch(){
    var results=document.getElementById('results');
    if(results) results.innerHTML='<div class="card"><b>Searching live partners…</b></div>';
    try{
      var service=(document.getElementById('service')||{}).value||'';
      var age=(document.getElementById('age')||{}).value||'';
      var gender=(document.getElementById('customerGenderPreference')||{}).value||'';
      var city=(document.getElementById('area')||{}).value||'Gurgaon NCR';
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
      var q=await c.rpc('bap_search_available_partners',{p_service:service,p_gender:gender||null,p_min_age:minAge,p_max_age:maxAge,p_city:city});
      if(q.error) throw new Error((q.error.message||'RPC failed')+' [code '+(q.error.code||'unknown')+']');
      var rows=q.data||[];
      if(!results)return;
      var safeText=function(value){return String(value??'').replace(/[&<>"]/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch];});};
      var cards=await Promise.all(rows.map(async function(p){
        var imageUrl='';
        if(p.profile_photo_path){
          try{
            var photo=await c.storage.from('partner-photos').createSignedUrl(p.profile_photo_path,3600);
            if(!photo.error&&photo.data&&photo.data.signedUrl) imageUrl=photo.data.signedUrl;
            else console.warn('Partner photo could not be signed:',photo.error&&photo.error.message);
          }catch(photoError){console.warn('Partner photo could not be loaded:',photoError);}
        }
        var name=safeText(p.full_name||'Partner');
        var initial=safeText((p.full_name||'P').trim().charAt(0).toUpperCase()||'P');
        var avatar=imageUrl
          ? '<img src="'+safeText(imageUrl)+'" alt="'+name+' profile photo" loading="lazy" style="width:76px;height:76px;object-fit:cover;border-radius:50%;border:2px solid #e5d7ff" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'"><div aria-label="Partner photo unavailable" style="display:none;width:76px;height:76px;border-radius:50%;background:linear-gradient(135deg,#e8d8ff,#cbdfff);place-items:center;font-size:28px;font-weight:800">'+initial+'</div>'
          : '<div aria-label="Partner photo unavailable" style="display:grid;width:76px;height:76px;border-radius:50%;background:linear-gradient(135deg,#e8d8ff,#cbdfff);place-items:center;font-size:28px;font-weight:800">'+initial+'</div>';
        return '<div class="card" style="margin-bottom:14px"><div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">'+avatar+'<div style="min-width:0"><h3 style="margin:0 0 5px">'+name+' <span class="pill verified">✓ VERIFIED</span></h3><div style="color:#667085;font-size:13px">'+safeText(p.city||'')+'</div></div></div><p>'+safeText((p.services||[]).join(', '))+'</p><p>Age: '+safeText(p.age??'—')+' • '+safeText(p.gender||'—')+'</p><p>📍 '+safeText(p.area||p.city||'Gurgaon NCR')+'</p><p><strong>₹'+safeText(p.hourly_rate??'—')+'/hour</strong></p><button type="button" class="pink full" style="margin-top:12px" data-bap-partner-id="'+safeText(p.id)+'" data-bap-partner-rate="'+safeText(p.hourly_rate??'')+'" data-bap-partner-rating="'+safeText(p.rating??0)+'" data-bap-partner-reviews="'+safeText(p.review_count??0)+'">Request Booking</button></div>';
      }));
      results.innerHTML=cards.length?cards.join(''):'<div class="card">Live search completed: no approved partner matched these filters.</div>';
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
      window.BAP_selectedPartnerId=partnerId;
      e.preventDefault();
      e.stopImmediatePropagation();
      if(typeof window.BAP_liveSelectPartner==='function') window.BAP_liveSelectPartner(partnerId);
      else alert('Live booking module is still loading. Please try again.');
    }
  },true);
})();
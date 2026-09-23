/* Book A Partner — live flow guard */
(function(){
  'use strict';
  var oldGo=null;
  function showLogin(){
    if(typeof window.openLogin==='function') window.openLogin();
    else if(typeof window.handleAccountClick==='function') window.handleAccountClick();
    else alert('Please login first.');
  }
  async function hasSession(){
    try{return !!(window.BAP_live && typeof window.BAP_live.session==='function' && await window.BAP_live.session());}
    catch(e){return false;}
  }
  function livePay(ev){
    if(ev){ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();}
    var fn=window.createBookingLive;
    if(typeof fn!=='function'){alert('Live booking module is still loading. Please wait a moment and try again.');return false;}
    Promise.resolve(fn()).catch(function(e){alert(e&&e.message?e.message:String(e));});
    return false;
  }
  function patch(){
    try{
      /* Disable the legacy capture-phase partner application interceptor. */
      window.__BAP_LIVE_PARTNER_APPLY_GUARD=true;
      var legacyFields=document.getElementById('bapRealPartnerAccountFields');
      if(legacyFields) legacyFields.remove();
      if(!oldGo && typeof window.go==='function') oldGo=window.go;
      if(oldGo && !window.go.__bapAuthGuard){
        var wrappedGo=function(id){
          if(id==='book'){
            hasSession().then(function(ok){if(ok) oldGo('book'); else showLogin();});
            return;
          }
          if(id==='partnerDashboard'){
            document.querySelectorAll('.screen').forEach(function(x){x.classList.remove('active');});
            var dash=document.getElementById('partnerDashboard');
            if(dash)dash.classList.add('active');
            setTimeout(renderOnlyLivePartnerDashboard,0);
            setTimeout(renderOnlyLivePartnerDashboard,250);
            setTimeout(renderOnlyLivePartnerDashboard,1000);
            return;
          }
          if(id==='admin'){
            window.location.href='admin.html';
            return;
          }
          return oldGo.apply(this,arguments);
        };
        wrappedGo.__bapAuthGuard=true;
        window.go=wrappedGo;
      }
      ensurePartnerLaunchFields();

      /* Never expose legacy localStorage/demo partner data in Partner Account.
         The live Supabase dashboard is the only partner-side source of truth. */
      try{localStorage.removeItem('bap_bookings');localStorage.removeItem('bap_partner_profile');localStorage.removeItem('bap_partner_profiles');}catch(e){}
      var legacyProfile=document.getElementById('partnerProfileCard');
      var legacyRequests=document.getElementById('partnerRequests');
      if(legacyProfile && !legacyProfile.dataset.bapLiveDashboardReady){
        legacyProfile.dataset.bapLiveDashboardReady='1';
      }

      window.goToPayment=livePay;
      window.confirmDemoPayment=livePay;
      window.selectPartner=function(name){
        if(!window.BAP_liveSelectPartnerByName){showLogin();return false;}
        window.BAP_liveSelectPartnerByName(name).catch(function(e){alert(e&&e.message?e.message:String(e));});
        return false;
      };

      /* Replace the legacy localStorage partner application with the real
         Supabase onboarding flow. */
      async function liveApi(){
        function ready(){
          return window.BAP_live &&
            typeof window.BAP_live.session==='function' &&
            typeof window.BAP_live.client==='function';
        }
        if(ready())return window.BAP_live;

        /* Self-heal stale Pages/browser caches: if the backend adapter did not
           initialize, load the same-origin script again with a fresh cache key. */
        try{
          var loader=document.querySelector('script[data-bap-live-retry]');
          if(!loader){
            loader=document.createElement('script');
            loader.src='bap-live-backend.js?retry='+Date.now();
            loader.async=false;
            loader.setAttribute('data-bap-live-retry','1');
            await new Promise(function(resolve,reject){
              loader.onload=resolve;
              loader.onerror=function(){reject(new Error('Live backend script could not be loaded. Check your internet connection and try again.'));};
              document.head.appendChild(loader);
            });
          }
        }catch(e){throw e;}

        for(var i=0;i<40;i++){
          if(ready())return window.BAP_live;
          await new Promise(function(resolve){setTimeout(resolve,200);});
        }

        /* Last-resort live adapter for GitHub Pages. If the large backend
           adapter is blocked by a stale browser/CDN cache or a script error,
           partner onboarding must still be able to talk directly to the
           existing Supabase project. This path uses only the publishable key
           and remains protected by Supabase Auth + RLS. */
        if(!window.__BAP_DIRECT_LIVE_LOADING){
          window.__BAP_DIRECT_LIVE_LOADING=true;
          await new Promise(function(resolve,reject){
            if(window.supabase?.createClient){resolve();return;}
            var s=document.createElement('script');
            s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            s.async=true;
            s.onload=resolve;
            s.onerror=function(){reject(new Error('Supabase client could not be loaded. Check the internet connection and reload once.'));};
            document.head.appendChild(s);
          });
        }
        if(window.supabase?.createClient){
          var directClient=window.supabase.createClient(
            'https://wmawmdwjjbvlqsugthhe.supabase.co',
            'sb_publishable_mm_Qov_zXz5tUrlifTj_Ww_rD53yRmI'
          );
          async function directSession(){
            var r=await directClient.auth.getSession();
            if(r.error||!r.data?.session)return null;
            var u=await directClient.auth.getUser(r.data.session.access_token);
            if(u.error||!u.data?.user)return null;
            return r.data.session;
          }
          function directEsc(v){
            return String(v??'').replace(/[&<>"]/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[x];});
          }
          async function directRenderPartner(){
            var profile=document.getElementById('partnerProfileCard');
            var req=document.getElementById('partnerRequests');
            var s=await directSession();
            if(!s){
              if(profile)profile.innerHTML='<b>Partner login required.</b><p>Please sign in with your Partner account.</p>';
              if(req)req.innerHTML='';
              return;
            }
            var p=await directClient.from('partners').select('*').eq('user_id',s.user.id).maybeSingle();
            if(p.error)throw p.error;
            if(!p.data){
              var a=await directClient.from('partner_applications').select('verification_status,full_name,services,hourly_rate,created_at').eq('user_id',s.user.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
              if(a.error)throw a.error;
              if(a.data){
                if(profile)profile.innerHTML='<b>'+directEsc(a.data.full_name)+'</b><p>Application status: <strong>'+directEsc(a.data.verification_status)+'</strong></p><p>₹'+directEsc(a.data.hourly_rate)+'/hour</p>';
              }else if(profile){
                profile.innerHTML='<b>Partner onboarding not submitted.</b><p>Complete the Partner Application to enter live verification.</p>';
              }
              if(req)req.innerHTML='';
              return;
            }
            if(profile)profile.innerHTML='<b>'+directEsc(p.data.full_name)+'</b> <span class="pill verified">✓ '+directEsc(p.data.verification_status)+'</span><p>'+directEsc(p.data.area||p.data.city||'')+' • ₹'+directEsc(p.data.hourly_rate)+'/hour</p>';
            if(req)req.innerHTML='<p class="muted">Live partner dashboard connected. Booking requests will appear here.</p>';
          }
          window.BAP_live={
            client:function(){return Promise.resolve(directClient);},
            session:directSession,
            renderPartnerLive:directRenderPartner
          };
          return window.BAP_live;
        }
        throw new Error('Supabase client could not be initialized.');
      }

      async function renderOnlyLivePartnerDashboard(){
        var api;
        try{
          api=await liveApi();
          if(typeof api.renderPartnerLive==='function'){
            await api.renderPartnerLive();
          }
        }catch(e){
          var profile=document.getElementById('partnerProfileCard');
          var req=document.getElementById('partnerRequests');
          if(profile) profile.innerHTML='<b>Live partner dashboard could not load.</b><p>'+String(e&&e.message||e)+'</p>';
          if(req) req.innerHTML='';
          console.error('BAP live partner dashboard:',e);
        }
      }

      function ensurePartnerLaunchFields(){
        var age=document.getElementById('partnerAge');
        if(!age||document.getElementById('partnerGender'))return;
        var row=age.closest('.row');
        if(!row)return;
        var genderWrap=document.createElement('div');
        genderWrap.innerHTML='<label>Gender</label><select id="partnerGender"><option value="">Select</option><option value="Female">Female</option><option value="Male">Male</option><option value="Other">Other</option></select>';
        row.appendChild(genderWrap);
        var btn=document.querySelector('#join button[onclick="partnerApply()"]');
        if(btn){
          var box=document.createElement('div');
          box.style.marginTop='12px';
          box.innerHTML='<label style="display:flex;gap:8px;align-items:flex-start;font-size:12px"><input id="partnerTerms" type="checkbox" style="width:auto;margin-top:2px"> I accept the Partner Agreement and Terms.</label><label style="display:flex;gap:8px;align-items:flex-start;font-size:12px;margin-top:8px"><input id="partnerSafety" type="checkbox" style="width:auto;margin-top:2px"> I accept the safety and conduct policy.</label>';
          btn.parentNode.insertBefore(box,btn);
        }
      }
      document.querySelectorAll('*').forEach(function(el){
        if(el.children.length===0 && el.textContent){
          var t=el.textContent.trim();
          if(/Prototype mode\\./i.test(t)) el.textContent='🔒 Secure payment. Payment gateway is connected to the live booking backend.';
          if(/^Demo Payment$/i.test(t)) el.textContent='Secure Payment';
          if(/^Test mode only — no real money will be charged\\.$/i.test(t)) el.textContent='Test payment is processed through the secure Razorpay checkout.';
          if(/In this prototype, payment is shown as received and held\\./i.test(t)) el.textContent='Payment is verified and held according to the booking policy.';
          if(/Your booking details have been saved in this browser for testing\\./i.test(t)) el.textContent='Your booking has been created in the live booking system.';
        }
      });
      document.querySelectorAll('button').forEach(function(btn){
        var t=(btn.textContent||'').trim();
        if(t==='Continue to Payment'||t==='Confirm & Pay'||t==='Pay & Confirm Booking'){
          btn.type='button';
          btn.onclick=livePay;
          btn.textContent='Confirm & Pay';
        }
      });
    }catch(e){console.error('BAP live flow guard:',e);}
  }
  document.addEventListener('click',function(e){
    var el=e.target&&e.target.closest?e.target.closest('button'):null;
    if(!el)return;
    var label=(el.textContent||'').trim();
    if(label==='Start Earning' || label.indexOf('🤝 Start Earning')===0){
      e.preventDefault();
      e.stopImmediatePropagation();
      if(typeof window.openLivePartnerAuth==='function') window.openLivePartnerAuth('signup'); else if(typeof window.go==='function') window.go('join');
      return;
    }
    var t=(el.textContent||'').trim();
    if(t==='Confirm & Pay'||t==='Continue to Payment'||t==='Pay & Confirm Booking') livePay(e);
  },true);
  patch();
  document.addEventListener('DOMContentLoaded',patch);
  var n=0,timer=setInterval(function(){patch();if(++n>40)clearInterval(timer);},500);
})();
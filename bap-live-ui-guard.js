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
      if(!oldGo && typeof window.go==='function') oldGo=window.go;
      if(oldGo && !window.go.__bapAuthGuard){
        var wrappedGo=function(id){
          if(id==='book'){
            hasSession().then(function(ok){if(ok) oldGo('book'); else showLogin();});
            return;
          }
          return oldGo.apply(this,arguments);
        };
        wrappedGo.__bapAuthGuard=true;
        window.go=wrappedGo;
      }
      window.goToPayment=livePay;
      window.confirmDemoPayment=livePay;
      window.selectPartner=function(name){
        if(!window.BAP_liveSelectPartnerByName){showLogin();return false;}
        window.BAP_liveSelectPartnerByName(name).catch(function(e){alert(e&&e.message?e.message:String(e));});
        return false;
      };
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
    var t=(el.textContent||'').trim();
    if(t==='Confirm & Pay'||t==='Continue to Payment'||t==='Pay & Confirm Booking') livePay(e);
  },true);
  patch();
  document.addEventListener('DOMContentLoaded',patch);
  var n=0,timer=setInterval(function(){patch();if(++n>40)clearInterval(timer);},500);
})();
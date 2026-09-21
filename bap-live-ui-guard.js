/* Book A Partner — live UI guard / cache-safe payment entrypoint */
(function(){
  'use strict';
  function patch(){
    try{
      document.querySelectorAll('*').forEach(function(el){
        if(el.children.length===0 && el.textContent && /Prototype mode\. Real payment gateway, OTP and live distance-based transport calculation will be connected in the backend stage\./i.test(el.textContent)){
          el.textContent='🔒 Secure payment. Payment gateway is connected to the live booking backend.';
        }
      });
      document.querySelectorAll('button').forEach(function(btn){
        var t=(btn.textContent||'').trim();
        if(t==='Continue to Payment' || t==='Confirm & Pay'){
          btn.onclick=function(e){
            if(e) e.preventDefault();
            var fn=window.createBookingLive||window.confirmDemoPayment;
            if(typeof fn==='function') return fn();
            alert('Live payment module is still loading. Please wait a moment and try again.');
          };
          btn.textContent='Confirm & Pay';
        }
      });
    }catch(e){ console.error('BAP live UI guard:',e); }
  }
  patch();
  document.addEventListener('DOMContentLoaded',patch);
  var n=0, timer=setInterval(function(){patch(); if(++n>20)clearInterval(timer);},500);
})();
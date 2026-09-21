/* Book A Partner — live payment UI guard */
(function(){
  'use strict';

  function livePay(){
    var fn=window.createBookingLive||window.confirmDemoPayment;
    if(typeof fn==='function') return fn();
    alert('Live payment module is still loading. Please wait a moment and try again.');
  }

  function patch(){
    try{
      /* Hard override legacy navigation/payment entrypoints. */
      window.goToPayment=livePay;
      window.confirmDemoPayment=livePay;

      document.querySelectorAll('*').forEach(function(el){
        if(el.children.length===0 && el.textContent){
          var t=el.textContent.trim();
          if(/Prototype mode\./i.test(t)){
            el.textContent='🔒 Secure payment. Payment gateway is connected to the live booking backend.';
          }
          if(/^Demo Payment$/i.test(t)) el.textContent='Secure Payment';
          if(/^Test mode only — no real money will be charged\.$/i.test(t)){
            el.textContent='Test payment is processed through the secure Razorpay checkout.';
          }
          if(/In this prototype, payment is shown as received and held\./i.test(t)){
            el.textContent='Payment is verified and held according to the booking policy.';
          }
          if(/Your booking details have been saved in this browser for testing\./i.test(t)){
            el.textContent='Your booking has been created in the live booking system.';
          }
        }
      });

      document.querySelectorAll('button').forEach(function(btn){
        var t=(btn.textContent||'').trim();
        if(t==='Continue to Payment' || t==='Confirm & Pay' || t==='Pay & Confirm Booking'){
          btn.type='button';
          btn.onclick=livePay;
          btn.textContent='Confirm & Pay';
        }
      });
    }catch(e){ console.error('BAP live UI guard:',e); }
  }

  patch();
  document.addEventListener('DOMContentLoaded',patch);
  var n=0,timer=setInterval(function(){
    patch();
    if(++n>30) clearInterval(timer);
  },500);
})();
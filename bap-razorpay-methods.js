/* Book A Partner — Razorpay checkout method override
   Keeps the existing payment verification flow unchanged and asks Standard
   Checkout to surface UPI alongside the default payment methods. */
(function(){
  'use strict';
  var original=null, wrapped=null;
  function wrap(v){
    if(!v || v.__bapWrapped) return v;
    function BAPRazorpay(options){
      var o=options && typeof options==='object' ? Object.assign({},options) : options;
      if(o && typeof o==='object'){
        var cfg=o.config && typeof o.config==='object' ? Object.assign({},o.config) : {};
        var display=cfg.display && typeof cfg.display==='object' ? Object.assign({},cfg.display) : {};
        var blocks=display.blocks && typeof display.blocks==='object' ? Object.assign({},display.blocks) : {};
        blocks.bap_upi={
          name:'UPI',
          instruments:[{method:'upi'}]
        };
        display.blocks=blocks;
        display.sequence=['block.bap_upi'];
        display.preferences=Object.assign({},display.preferences||{},{show_default_blocks:true});
        cfg.display=display;
        o.config=cfg;
      }
      return new original(o);
    }
    try{Object.setPrototypeOf(BAPRazorpay, v);}catch(e){}
    try{BAPRazorpay.prototype=v.prototype;}catch(e){}
    BAPRazorpay.__bapWrapped=true;
    return BAPRazorpay;
  }
  Object.defineProperty(window,'Razorpay',{
    configurable:true,
    get:function(){ return wrapped; },
    set:function(v){ original=v; wrapped=wrap(v); }
  });
})();

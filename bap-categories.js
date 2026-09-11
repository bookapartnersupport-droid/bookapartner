/* ==========================================================
   BOOK A PARTNER — CENTRAL CATEGORY SYSTEM
   Master configuration for services, rate limits and
   specialized-service requirements.

   This file does NOT replace index.html.
   ========================================================== */

(function () {
  'use strict';

  const CATEGORIES = [
    {
      id: 'movie',
      name: 'Movie Partner',
      type: 'normal',
      experienceRequired: false,
      qualificationRequired: false,
      minRate: 399,
      recommendedRate: 499,
      maxRate: 799
    },

    {
      id: 'shopping',
      name: 'Shopping Partner',
      type: 'normal',
      experienceRequired: false,
      qualificationRequired: false,
      minRate: 399,
      recommendedRate: 499,
      maxRate: 799
    },

    {
      id: 'coffee',
      name: 'Coffee & Conversation',
      type: 'normal',
      experienceRequired: false,
      qualificationRequired: false,
      minRate: 299,
      recommendedRate: 399,
      maxRate: 699
    },

    {
      id: 'travel',
      name: 'Travel Partner',
      type: 'normal',
      experienceRequired: false,
      qualificationRequired: false,
      minRate: 599,
      recommendedRate: 699,
      maxRate: 1199
    },

    {
      id: 'event',
      name: 'Event / Plus-One',
      type: 'normal',
      experienceRequired: false,
      qualificationRequired: false,
      minRate: 499,
      recommendedRate: 599,
      maxRate: 999
    },

    {
      id: 'clubbing',
      name: 'Clubbing / Nightlife',
      type: 'normal',
      experienceRequired: false,
      qualificationRequired: false,
      minRate: 599,
      recommendedRate: 699,
      maxRate: 1199
    },

    {
      id: 'city-tour',
      name: 'City Walk / City Tour',
      type: 'normal',
      experienceRequired: false,
      qualificationRequired: false,
      minRate: 299,
      recommendedRate: 399,
      maxRate: 699
    },

    {
      id: 'dinner',
      name: 'Dinner / Food Partner',
      type: 'normal',
      experienceRequired: false,
      qualificationRequired: false,
      minRate: 399,
      recommendedRate: 499,
      maxRate: 899
    },

    {
      id: 'gaming',
      name: 'Gaming Partner',
      type: 'normal',
      experienceRequired: false,
      qualificationRequired: false,
      minRate: 399,
      recommendedRate: 499,
      maxRate: 799
    },

    {
      id: 'concert',
      name: 'Concert Partner',
      type: 'normal',
      experienceRequired: false,
      qualificationRequired: false,
      minRate: 499,
      recommendedRate: 599,
      maxRate: 999
    },

    {
      id: 'fitness',
      name: 'Fitness / Walking Partner',
      type: 'specialized',
      experienceRequired: true,
      qualificationRequired: false,
      minRate: 499,
      recommendedRate: 599,
      maxRate: 999
    },

    {
      id: 'networking',
      name: 'Professional Networking',
      type: 'specialized',
      experienceRequired: true,
      qualificationRequired: false,
      minRate: 599,
      recommendedRate: 699,
      maxRate: 1499
    },

    {
      id: 'elder-care',
      name: 'Elder Care / Senior Companion',
      type: 'specialized',
      experienceRequired: true,
      qualificationRequired: false,
      minRate: 499,
      recommendedRate: 599,
      maxRate: 999
    },

    {
      id: 'medical',
      name: 'Medical Assistance',
      type: 'specialized',
      experienceRequired: true,
      qualificationRequired: true,
      minRate: 599,
      recommendedRate: 699,
      maxRate: 1199
    },

    {
      id: 'errands',
      name: 'Errands / Daily Assistance',
      type: 'normal',
      experienceRequired: false,
      qualificationRequired: false,
      minRate: 399,
      recommendedRate: 499,
      maxRate: 799
    },

    {
      id: 'technical',
      name: 'Technical Assistance',
      type: 'specialized',
      experienceRequired: true,
      qualificationRequired: false,
      minRate: 599,
      recommendedRate: 699,
      maxRate: 1499
    },

    {
      id: 'special-event',
      name: 'Special Event Support',
      type: 'specialized',
      experienceRequired: true,
      qualificationRequired: false,
      minRate: 499,
      recommendedRate: 599,
      maxRate: 999
    }
  ];


  /* ==========================================================
     GENDER OPTIONS
     ========================================================== */

  const GENDER_OPTIONS = [
    {
      value: 'Male',
      label: '👨 Male Partner'
    },

    {
      value: 'Female',
      label: '👩 Female Partner'
    },

    {
      value: 'Any',
      label: '👥 Any Partner'
    }
  ];


  window.BAP_CATEGORIES =
    CATEGORIES;

  window.BAP_GENDER_OPTIONS =
    GENDER_OPTIONS;


  /* ==========================================================
     CATEGORY HELPERS
     ========================================================== */

  window.BAP_getCategory =
    function(serviceName){

      return (
        CATEGORIES.find(
          c =>
            c.name === serviceName
        ) || null
      );

    };


  window.BAP_isSpecialized =
    function(serviceName){

      const category =
        window.BAP_getCategory(
          serviceName
        );

      return !!(
        category &&
        category.type ===
          'specialized'
      );

    };


  window.BAP_getRateRule =
    function(serviceName){

      const category =
        window.BAP_getCategory(
          serviceName
        );

      if(!category){
        return null;
      }

      return {

        min:
          category.minRate,

        recommended:
          category.recommendedRate,

        max:
          category.maxRate

      };

    };


  /* ==========================================================
     ELEMENT HELPER
     ========================================================== */

  function findElement(id){

    return document.getElementById(
      id
    );

  }


  /* ==========================================================
     FILL SELECT
     ========================================================== */

  function fillSelect(
    select,
    items,
    placeholderText
  ){

    if(!select){
      return;
    }


    const current =
      select.value;


    select.innerHTML =
      '';


    if(placeholderText){

      const placeholder =
        document.createElement(
          'option'
        );

      placeholder.value =
        '';

      placeholder.textContent =
        placeholderText;

      select.appendChild(
        placeholder
      );

    }


    items.forEach(
      item => {

        const option =
          document.createElement(
            'option'
          );

        option.value =
          item.name;

        option.textContent =
          item.name;

        select.appendChild(
          option
        );

      }
    );


    if(
      current &&
      Array.from(
        select.options
      ).some(
        option =>
          option.value ===
          current
      )
    ){

      select.value =
        current;

    }

  }


  /* ==========================================================
     UPDATE CATEGORY SELECTS
     ========================================================== */

  function updateCategorySelects(){

    fillSelect(
      findElement(
        'service'
      ),
      CATEGORIES,
      'Select a service'
    );


    fillSelect(
      findElement(
        'partnerService'
      ),
      CATEGORIES,
      'Select a service'
    );

  }


  /* ==========================================================
     CATEGORY INFO BOX
     ========================================================== */

  function getOrCreateInfoBox(){

    let box =
      findElement(
        'bapCategoryInfo'
      );


    if(box){
      return box;
    }


    const serviceSelect =
      findElement(
        'partnerService'
      );


    if(
      !serviceSelect ||
      !serviceSelect.parentNode
    ){

      return null;

    }


    box =
      document.createElement(
        'div'
      );


    box.id =
      'bapCategoryInfo';


    box.style.cssText =
      [
        'margin-top:12px',
        'padding:12px 14px',
        'border:1px solid #e2e8f0',
        'border-radius:12px',
        'background:#f8fafc',
        'font-size:13px',
        'line-height:1.55'
      ].join(';');


    serviceSelect.parentNode.insertBefore(
      box,
      serviceSelect.nextSibling
    );


    return box;

  }


  /* ==========================================================
     EXPERIENCE BOX
     ========================================================== */

  function getOrCreateExperienceBox(){

    let box =
      findElement(
        'bapPartnerExperienceBox'
      );


    if(box){
      return box;
    }


    const serviceSelect =
      findElement(
        'partnerService'
      );


    if(
      !serviceSelect ||
      !serviceSelect.parentNode
    ){

      return null;

    }


    box =
      document.createElement(
        'div'
      );


    box.id =
      'bapPartnerExperienceBox';


    box.style.cssText =
      [
        'display:none',
        'margin-top:14px',
        'padding:14px',
        'border:1px solid #ddd6fe',
        'border-radius:14px',
        'background:#faf5ff'
      ].join(';');


    box.innerHTML = `

      <div style="
        font-weight:800;
        margin-bottom:10px;
      ">
        Specialized service verification
      </div>

      <label style="
        display:block;
        font-weight:700;
        margin-bottom:5px;
      ">
        Relevant Experience (Years)
      </label>

      <input
        id="partnerExperienceYears"
        type="number"
        min="0"
        step="1"
        placeholder="Example: 3"
        style="
          width:100%;
          box-sizing:border-box;
          height:46px;
          padding:0 12px;
          border:1px solid #cbd5e1;
          border-radius:10px;
          margin-bottom:10px;
        "
      >

      <label style="
        display:block;
        font-weight:700;
        margin-bottom:5px;
      ">
        Experience Details
      </label>

      <textarea
        id="partnerExperienceDetails"
        rows="3"
        placeholder="Briefly describe your relevant experience..."
        style="
          width:100%;
          box-sizing:border-box;
          padding:10px 12px;
          border:1px solid #cbd5e1;
          border-radius:10px;
          resize:vertical;
          margin-bottom:10px;
        "
      ></textarea>

      <label style="
        display:block;
        font-weight:700;
        margin-bottom:5px;
      ">
        Qualification / Certification
      </label>

      <input
        id="partnerQualification"
        type="text"
        placeholder="Enter qualification/certification where applicable"
        style="
          width:100%;
          box-sizing:border-box;
          height:46px;
          padding:0 12px;
          border:1px solid #cbd5e1;
          border-radius:10px;
          margin-bottom:10px;
        "
      >

      <label style="
        display:block;
        font-weight:700;
        margin-bottom:5px;
      ">
        Proof / Certificate
      </label>

      <input
        id="partnerExperienceProof"
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        style="
          width:100%;
          box-sizing:border-box;
        "
      >

    `;


    serviceSelect.parentNode.insertBefore(
      box,
      serviceSelect.nextSibling
    );


    return box;

  }


  /* ==========================================================
     RATE + EXPERIENCE UPDATE
     ========================================================== */

  function updateRateAndExperience(){

    const serviceSelect =
      findElement(
        'partnerService'
      );


    if(!serviceSelect){
      return;
    }


    const category =
      window.BAP_getCategory(
        serviceSelect.value
      );


    const infoBox =
      getOrCreateInfoBox();


    const experienceBox =
      getOrCreateExperienceBox();


    if(!category){

      if(infoBox){

        infoBox.innerHTML =
          '';

        infoBox.style.display =
          'none';

      }


      if(experienceBox){

        experienceBox.style.display =
          'none';

      }

      return;

    }


    const rateInput =
      findElement(
        'partnerRate'
      );


    if(rateInput){

      rateInput.min =
        String(
          category.minRate
        );

      rateInput.max =
        String(
          category.maxRate
        );


      /*
        IMPORTANT:
        Whenever service changes,
        start from the new category's
        recommended rate.
      */

      rateInput.value =
        String(
          category.recommendedRate
        );

    }


    if(infoBox){

      infoBox.style.display =
        'block';


      const specialText =
        category.type ===
        'specialized'

          ? 'Specialized service — relevant experience is required.'

          : 'Normal service — experience proof is not required.';


      const qualificationText =
        category.qualificationRequired

          ? ' Relevant qualification/certification is required.'

          : '';


      infoBox.innerHTML = `

        <b>Rate guide:</b>
        ₹${category.minRate}/hr –
        ₹${category.maxRate}/hr

        <br>

        <b>Recommended:</b>
        ₹${category.recommendedRate}/hr

        <br>

        ${specialText}${qualificationText}

      `;

    }


    if(experienceBox){

      experienceBox.style.display =
        category.type ===
        'specialized'

          ? 'block'

          : 'none';

    }

  }


  /* ==========================================================
     CUSTOMER GENDER PREFERENCE
     ========================================================== */

  function injectCustomerGenderPreference(){

    if(
      findElement(
        'customerGenderPreference'
      )
    ){

      return;

    }


    const serviceSelect =
      findElement(
        'service'
      );


    if(
      !serviceSelect ||
      !serviceSelect.parentNode
    ){

      return;

    }


    const wrapper =
      document.createElement(
        'div'
      );


    wrapper.style.marginTop =
      '12px';


    wrapper.innerHTML = `

      <label
        for="customerGenderPreference"
        style="
          display:block;
          font-weight:700;
          margin-bottom:6px;
        "
      >
        Partner Preference
      </label>

      <select
        id="customerGenderPreference"
        style="
          width:100%;
          box-sizing:border-box;
          min-height:46px;
          padding:0 12px;
          border:1px solid #cbd5e1;
          border-radius:10px;
          background:#fff;
        "
      >

        ${GENDER_OPTIONS.map(
          gender =>
            `<option value="${gender.value}">
              ${gender.label}
            </option>`
        ).join('')}

      </select>

    `;


    serviceSelect.parentNode.insertBefore(
      wrapper,
      serviceSelect.nextSibling
    );

  }


  /* ==========================================================
     PARTNER GENDER
     ========================================================== */

  function injectPartnerGender(){

    if(
      findElement(
        'partnerGender'
      )
    ){

      return;

    }


    const serviceSelect =
      findElement(
        'partnerService'
      );


    if(
      !serviceSelect ||
      !serviceSelect.parentNode
    ){

      return;

    }


    const wrapper =
      document.createElement(
        'div'
      );


    wrapper.style.marginTop =
      '12px';


    wrapper.innerHTML = `

      <label
        for="partnerGender"
        style="
          display:block;
          font-weight:700;
          margin-bottom:6px;
        "
      >
        Partner Gender
      </label>

      <select
        id="partnerGender"
        style="
          width:100%;
          box-sizing:border-box;
          min-height:46px;
          padding:0 12px;
          border:1px solid #cbd5e1;
          border-radius:10px;
          background:#fff;
        "
      >

        <option value="Male">
          👨 Male
        </option>

        <option value="Female">
          👩 Female
        </option>

      </select>

    `;


    serviceSelect.parentNode.insertBefore(
      wrapper,
      serviceSelect
    );

  }


  /* ==========================================================
     RATE VALIDATION + SPECIALIZED PARTNER VALIDATION
     ========================================================== */

  function validatePartnerCategoryData(){

    const serviceSelect =
      findElement(
        'partnerService'
      );


    const rateInput =
      findElement(
        'partnerRate'
      );


    if(!serviceSelect){

      return {
        ok:true,
        category:null
      };

    }


    const category =
      window.BAP_getCategory(
        serviceSelect.value
      );


    if(!category){

      alert(
        'Please select a partner service.'
      );

      return {
        ok:false
      };

    }


    const rate =
      rateInput
        ? Number(
            rateInput.value
          )
        : NaN;


    if(
      !Number.isFinite(rate) ||
      rate <
        category.minRate ||
      rate >
        category.maxRate
    ){

      alert(
        'Please enter a rate between ₹' +
        category.minRate +
        ' and ₹' +
        category.maxRate +
        ' per hour.'
      );


      if(rateInput){
        rateInput.focus();
      }


      return {
        ok:false
      };

    }


    if(
      category.type !==
      'specialized'
    ){

      return {
        ok:true,
        category
      };

    }


    const yearsInput =
      findElement(
        'partnerExperienceYears'
      );


    const detailsInput =
      findElement(
        'partnerExperienceDetails'
      );


    const qualificationInput =
      findElement(
        'partnerQualification'
      );


    const proofInput =
      findElement(
        'partnerExperienceProof'
      );


    const years =
      yearsInput
        ? Number(
            yearsInput.value
          )
        : NaN;


    const details =
      detailsInput
        ? detailsInput.value.trim()
        : '';


    const qualification =
      qualificationInput
        ? qualificationInput.value.trim()
        : '';


    const proof =
      proofInput &&
      proofInput.files &&
      proofInput.files[0]
        ? proofInput.files[0]
        : null;


    if(
      !Number.isFinite(years) ||
      years < 0
    ){

      alert(
        'Please enter relevant experience in years.'
      );


      if(yearsInput){
        yearsInput.focus();
      }


      return {
        ok:false
      };

    }


    if(!details){

      alert(
        'Please describe your relevant experience.'
      );


      if(detailsInput){
        detailsInput.focus();
      }


      return {
        ok:false
      };

    }


    if(
      category.qualificationRequired &&
      !qualification
    ){

      alert(
        'Please enter your qualification/certification for this service.'
      );


      if(qualificationInput){
        qualificationInput.focus();
      }


      return {
        ok:false
      };

    }


    if(
      category.qualificationRequired &&
      !proof
    ){

      alert(
        'Please upload the required qualification/certificate proof.'
      );


      if(proofInput){
        proofInput.focus();
      }


      return {
        ok:false
      };

    }


    return {

      ok:true,

      category,

      experienceYears:
        years,

      experienceDetails:
        details,

      qualification,

      proofFile:
        proof

    };

  }


  /* ==========================================================
     SMALL FILE READER
     ========================================================== */

  async function readBapFile(
    file
  ){

    if(!file){
      return '';
    }


    return new Promise(
      (resolve,reject) => {

        const reader =
          new FileReader();


        reader.onload =
          () =>
            resolve(
              reader.result
            );


        reader.onerror =
          () =>
            reject(
              reader.error
            );


        reader.readAsDataURL(
          file
        );

      }
    );

  }


  /* ==========================================================
     PARTNER APPLY GUARD
     ========================================================== */

  function installPartnerApplyGuard(){

    if(
      typeof window.partnerApply !==
      'function'
    ){

      return;

    }


    if(
      window.partnerApply
        .__bapGuardInstalled
    ){

      return;

    }


    const original =
      window.partnerApply;


    async function guardedPartnerApply(){

      const result =
        validatePartnerCategoryData();


      if(
        !result ||
        result.ok !== true
      ){

        return;

      }


      await original();


      const saved =
        JSON.parse(
          localStorage.getItem(
            'bap_partner_profile'
          ) ||
          'null'
        );


      if(!saved){
        return;
      }


      const category =
        window.BAP_getCategory(
          saved.service
        );


      if(!category){
        return;
      }


      const genderSelect =
        findElement(
          'partnerGender'
        );


      if(genderSelect){

        saved.gender =
          genderSelect.value;

      }


      saved.rate =
        Number(
          saved.rate
        );


      if(
        result.category.type ===
        'specialized'
      ){

        saved.experienceRequired =
          true;


        saved.experienceYears =
          result.experienceYears;


        saved.experienceDetails =
          result.experienceDetails;


        saved.qualification =
          result.qualification ||
          '';


        if(
          result.proofFile
        ){

          try{

            saved.experienceProofName =
              result.proofFile.name;


            saved.experienceProofData =
              await readBapFile(
                result.proofFile
              );

          }catch(error){

            console.error(
              'Experience proof save error:',
              error
            );

          }

        }

      }


      localStorage.setItem(
        'bap_partner_profile',
        JSON.stringify(
          saved
        )
      );

    }


    guardedPartnerApply
      .__bapGuardInstalled =
      true;


    window.partnerApply =
      guardedPartnerApply;

  }


  /* ==========================================================
     RATE INPUT VALIDATION
     ========================================================== */

  function attachRateValidation(){

    const rateInput =
      findElement(
        'partnerRate'
      );


    if(
      !rateInput ||
      rateInput.__bapRateValidation
    ){

      return;

    }


    rateInput.__bapRateValidation =
      true;


    rateInput.addEventListener(
      'change',
      function(){

        enforceCurrentRate();

      }
    );


    rateInput.addEventListener(
      'blur',
      function(){

        enforceCurrentRate();

      }
    );

  }


  function enforceCurrentRate(){

    const serviceSelect =
      findElement(
        'partnerService'
      );


    const rateInput =
      findElement(
        'partnerRate'
      );


    if(
      !serviceSelect ||
      !rateInput
    ){

      return;

    }


    const category =
      window.BAP_getCategory(
        serviceSelect.value
      );


    if(!category){
      return;
    }


    const value =
      Number(
        rateInput.value
      );


    if(
      !Number.isFinite(value) ||
      value <
        category.minRate
    ){

      rateInput.value =
        String(
          category.minRate
        );

      return;

    }


    if(
      value >
        category.maxRate
    ){

      rateInput.value =
        String(
          category.maxRate
        );

    }

  }


  /* ==========================================================
     STYLES
     ========================================================== */

  function addInputStyles(){

    if(
      findElement(
        'bapCategoryStyles'
      )
    ){

      return;

    }


    const style =
      document.createElement(
        'style'
      );


    style.id =
      'bapCategoryStyles';


    style.textContent = `

      #bapPartnerExperienceBox input,
      #bapPartnerExperienceBox textarea,
      #bapPartnerExperienceBox select,
      #customerGenderPreference,
      #partnerGender {

        font-size:14px;

      }


      #bapPartnerExperienceBox input:focus,
      #bapPartnerExperienceBox textarea:focus,
      #customerGenderPreference:focus,
      #partnerGender:focus {

        outline:none;

        border-color:#7c3aed;

        box-shadow:
          0 0 0 3px
          rgba(124,58,237,.12);

      }

    `;


    document.head.appendChild(
      style
    );

  }


  /* ==========================================================
     MAIN REFRESH
     ========================================================== */

  function syncCategoryUI(){

    updateCategorySelects();

    injectCustomerGenderPreference();

    injectPartnerGender();

    updateRateAndExperience();

    attachRateValidation();

    enforceCurrentRate();

    installPartnerApplyGuard();

  }


  /* ==========================================================
     CHANGE EVENTS
     ========================================================== */

  document.addEventListener(
    'change',
    function(event){

      if(
        event.target &&
        event.target.id ===
        'partnerService'
      ){

        updateRateAndExperience();

        attachRateValidation();

        /*
          Re-check after selecting a new
          partner service.
        */
        enforceCurrentRate();

        installPartnerApplyGuard();

      }


      if(
        event.target &&
        event.target.id ===
        'service'
      ){

        injectCustomerGenderPreference();

      }

    }
  );


  /* ==========================================================
     PAGE LOAD
     ========================================================== */

  document.addEventListener(
    'DOMContentLoaded',
    function(){

      addInputStyles();

      syncCategoryUI();


      setTimeout(
        syncCategoryUI,
        300
      );


      setTimeout(
        syncCategoryUI,
        1000
      );


      setTimeout(
        installPartnerApplyGuard,
        1500
      );


      setTimeout(
        installPartnerApplyGuard,
        2500
      );

    }
  );


  /* ==========================================================
     PUBLIC REFRESH FUNCTION
     ========================================================== */

  window.BAP_refreshCategorySystem =
    syncCategoryUI;


})();
/* ==========================================================
   BOOK A PARTNER — STORAGE QUOTA FIX
   Compresses partner images before localStorage save
   and avoids storing large proof files in localStorage.
   ========================================================== */

(function(){

  'use strict';


  function bapCompressImage(file){

    return new Promise(
      function(resolve,reject){

        if(
          !file ||
          !file.type ||
          !file.type.startsWith('image/')
        ){

          resolve(null);

          return;

        }


        const reader =
          new FileReader();


        reader.onload =
          function(){

            const img =
              new Image();


            img.onload =
              function(){

                const maxWidth =
                  1000;

                const maxHeight =
                  1000;


                let width =
                  img.width;

                let height =
                  img.height;


                const scale =
                  Math.min(
                    1,
                    maxWidth / width,
                    maxHeight / height
                  );


                width =
                  Math.round(
                    width * scale
                  );


                height =
                  Math.round(
                    height * scale
                  );


                const canvas =
                  document.createElement(
                    'canvas'
                  );


                canvas.width =
                  width;

                canvas.height =
                  height;


                const ctx =
                  canvas.getContext(
                    '2d'
                  );


                if(!ctx){

                  resolve(
                    reader.result
                  );

                  return;

                }


                ctx.drawImage(
                  img,
                  0,
                  0,
                  width,
                  height
                );


                const compressed =
                  canvas.toDataURL(
                    'image/jpeg',
                    0.70
                  );


                resolve(
                  compressed
                );

              };


            img.onerror =
              function(){

                resolve(
                  reader.result
                );

              };


            img.src =
              reader.result;

          };


        reader.onerror =
          function(){

            reject(
              reader.error
            );

          };


        reader.readAsDataURL(
          file
        );

      }
    );

  }


  function installBapStorageFix(){

    if(
      window.__BAP_STORAGE_FIX_INSTALLED
    ){

      return;

    }


    if(
      typeof window.readFileAsDataURL !==
      'function'
    ){

      setTimeout(
        installBapStorageFix,
        700
      );

      return;

    }


    window.__BAP_STORAGE_FIX_INSTALLED =
      true;


    const originalReadFileAsDataURL =
      window.readFileAsDataURL;


    window.readFileAsDataURL =
      async function(file){

        if(!file){

          return '';

        }


        /*
          Compress profile/selfie images.
        */

        if(
          file.type &&
          file.type.startsWith(
            'image/'
          )
        ){

          try{

            const compressed =
              await bapCompressImage(
                file
              );


            if(compressed){

              return compressed;

            }

          }catch(error){

            console.warn(
              'Image compression failed:',
              error
            );

          }

        }


        /*
          Do not store large PDF/document
          binaries inside localStorage.
        */

        if(
          file.type ===
          'application/pdf'
        ){

          return '';

        }


        if(
          file.size &&
          file.size >
          1200000
        ){

          return '';

        }


        return originalReadFileAsDataURL(
          file
        );

      };


    /*
      Wrap partnerApply one more time so the
      old large profile is removed before the
      new profile is saved.
    */

    if(
      typeof window.partnerApply ===
      'function' &&
      !window.partnerApply
        .__BAP_STORAGE_WRAPPED
    ){

      const originalPartnerApply =
        window.partnerApply;


      async function storageSafePartnerApply(){

        const previousProfile =
          localStorage.getItem(
            'bap_partner_profile'
          );


        /*
          The new partner application replaces
          the current prototype profile, so remove
          the old large profile before saving.
        */

        localStorage.removeItem(
          'bap_partner_profile'
        );


        try{

          await originalPartnerApply();


          /*
            Restore the previous profile only if
            no new profile was created.
          */

          const newProfile =
            localStorage.getItem(
              'bap_partner_profile'
            );


          if(
            !newProfile &&
            previousProfile !== null
          ){

            try{

              localStorage.setItem(
                'bap_partner_profile',
                previousProfile
              );

            }catch(error){

              console.warn(
                'Previous profile could not be restored.',
                error
              );

            }

          }

        }catch(error){

          /*
            Restore previous profile when the
            new save fails.
          */

          if(
            !localStorage.getItem(
              'bap_partner_profile'
            ) &&
            previousProfile !== null
          ){

            try{

              localStorage.setItem(
                'bap_partner_profile',
                previousProfile
              );

            }catch(restoreError){

              console.warn(
                'Profile restore failed:',
                restoreError
              );

            }

          }


          if(
            error &&
            (
              error.name ===
              'QuotaExceededError' ||
              String(
                error.message || ''
              ).includes(
                'quota'
              )
            )
          ){

            alert(
              'Profile images are too large for this browser demo. They will be stored securely in the live backend.'
            );


            return;

          }


          throw error;

        }

      }


      storageSafePartnerApply
        .__BAP_STORAGE_WRAPPED =
        true;


      storageSafePartnerApply
        .__BAP_STORAGE_ORIGINAL =
        originalPartnerApply;


      window.partnerApply =
        storageSafePartnerApply;

    }

  }


  setTimeout(
    installBapStorageFix,
    1800
  );


  setTimeout(
    installBapStorageFix,
    3500
  );


})();
/* ==========================================================
   BOOK A PARTNER — FINAL IMAGE / STORAGE SAFETY PATCH
   Compresses partner images before partnerApply runs and
   prevents large proof files from filling localStorage.
   ========================================================== */

(function(){

  'use strict';


  async function bapCompressPartnerImage(file){

    if(
      !file ||
      !file.type ||
      !file.type.startsWith('image/')
    ){

      return file;

    }


    return new Promise(
      function(resolve){

        const reader =
          new FileReader();


        reader.onload =
          function(){

            const img =
              new Image();


            img.onload =
              function(){

                const maxSize =
                  900;


                let width =
                  img.width;

                let height =
                  img.height;


                const scale =
                  Math.min(
                    1,
                    maxSize / width,
                    maxSize / height
                  );


                width =
                  Math.max(
                    1,
                    Math.round(
                      width * scale
                    )
                  );


                height =
                  Math.max(
                    1,
                    Math.round(
                      height * scale
                    )
                  );


                const canvas =
                  document.createElement(
                    'canvas'
                  );


                canvas.width =
                  width;

                canvas.height =
                  height;


                const ctx =
                  canvas.getContext(
                    '2d'
                  );


                if(!ctx){

                  resolve(file);

                  return;

                }


                ctx.drawImage(
                  img,
                  0,
                  0,
                  width,
                  height
                );


                canvas.toBlob(
                  function(blob){

                    if(!blob){

                      resolve(file);

                      return;

                    }


                    const compressedFile =
                      new File(
                        [
                          blob
                        ],
                        'compressed_' +
                        file.name
                          .replace(
                            /\.[^/.]+$/,
                            ''
                          ) +
                        '.jpg',
                        {
                          type:
                            'image/jpeg',
                          lastModified:
                            Date.now()
                        }
                      );


                    resolve(
                      compressedFile
                    );

                  },
                  'image/jpeg',
                  0.68
                );

              };


            img.onerror =
              function(){

                resolve(file);

              };


            img.src =
              reader.result;

          };


        reader.onerror =
          function(){

            resolve(file);

          };


        reader.readAsDataURL(
          file
        );

      }
    );

  }


  async function bapReplaceFileInputFile(
    inputId
  ){

    const input =
      document.getElementById(
        inputId
      );


    if(
      !input ||
      !input.files ||
      !input.files[0]
    ){

      return;

    }


    const originalFile =
      input.files[0];


    const compressedFile =
      await bapCompressPartnerImage(
        originalFile
      );


    if(!compressedFile){

      return;

    }


    try{

      const dataTransfer =
        new DataTransfer();


      dataTransfer.items.add(
        compressedFile
      );


      input.files =
        dataTransfer.files;

    }catch(error){

      console.warn(
        'Could not replace compressed image:',
        error
      );

    }

  }


  function bapInstallFinalApplyPatch(){

    if(
      typeof window.partnerApply !==
      'function'
    ){

      setTimeout(
        bapInstallFinalApplyPatch,
        700
      );

      return;

    }


    if(
      window.partnerApply
        .__BAP_FINAL_STORAGE_PATCH
    ){

      return;

    }


    const previousApply =
      window.partnerApply;


    async function finalSafePartnerApply(){

      /*
        Remove the previous prototype profile
        before creating a new one. This prevents
        old large photo/selfie data from consuming
        the available browser storage.
      */

      try{

        localStorage.removeItem(
          'bap_partner_profile'
        );

      }catch(error){

        console.warn(
          'Could not clear previous partner profile:',
          error
        );

      }


      /*
        Compress profile photo and selfie
        before the existing partnerApply()
        reads them.
      */

      await bapReplaceFileInputFile(
        'partnerPhoto'
      );


      await bapReplaceFileInputFile(
        'partnerSelfie'
      );


      try{

        await previousApply();

      }catch(error){

        if(
          error &&
          (
            error.name ===
            'QuotaExceededError' ||
            String(
              error.message || ''
            ).toLowerCase()
              .includes(
                'quota'
              )
          )
        ){

          alert(
            'Browser storage is full. The profile could not be saved in this prototype. The live backend will store partner documents securely.'
          );

          return;

        }


        throw error;

      }

    }


    finalSafePartnerApply
      .__BAP_FINAL_STORAGE_PATCH =
      true;


    window.partnerApply =
      finalSafePartnerApply;

  }


  /*
    Prevent large certificate PDF data from
    being stored inside localStorage.
  */

  function bapInstallStorageGuard(){

    if(
      window.__BAP_LS_GUARD_INSTALLED
    ){

      return;

    }


    const originalSetItem =
      localStorage.setItem.bind(
        localStorage
      );


    function safeSetItem(
      key,
      value
    ){

      if(
        key ===
        'bap_partner_profile'
      ){

        try{

          const profile =
            JSON.parse(
              value
            );


          /*
            Keep the certificate filename,
            but do not store a huge PDF binary
            inside localStorage.
          */

          if(
            profile &&
            profile.experienceProofData &&
            String(
              profile.experienceProofData
            ).length >
            400000
          ){

            delete profile.experienceProofData;

          }


          value =
            JSON.stringify(
              profile
            );

        }catch(error){

          console.warn(
            'Partner profile cleanup failed:',
            error
          );

        }

      }


      try{

        originalSetItem(
          key,
          value
        );

      }catch(error){

        if(
          key ===
          'bap_partner_profile' &&
          error &&
          error.name ===
          'QuotaExceededError'
        ){

          try{

            const profile =
              JSON.parse(
                value
              );


            if(profile){

              delete profile.photoData;

              delete profile.selfieData;

              delete profile.experienceProofData;


              originalSetItem(
                key,
                JSON.stringify(
                  profile
                )
              );

              return;

            }

          }catch(fallbackError){

            console.error(
              'Storage fallback failed:',
              fallbackError
            );

          }

        }


        throw error;

      }

    }


    localStorage.setItem =
      safeSetItem;


    window.__BAP_LS_GUARD_INSTALLED =
      true;

  }


  setTimeout(
    bapInstallStorageGuard,
    500
  );


  setTimeout(
    bapInstallFinalApplyPatch,
    1200
  );


  setTimeout(
    bapInstallFinalApplyPatch,
    2500
  );


})();
/* ==========================================================
   BOOK A PARTNER — ADMIN SPECIALIZED DETAILS DISPLAY
   Shows experience, qualification, proof and gender in
   the Admin Partner Applications card.
   ========================================================== */

(function(){

  'use strict';


  function getSavedPartner(){

    try{

      return JSON.parse(
        localStorage.getItem(
          'bap_partner_profile'
        ) || 'null'
      );

    }catch(error){

      console.warn(
        'Could not read partner profile:',
        error
      );

      return null;

    }

  }


  function findPartnerCard(partner){

    if(!partner){
      return null;
    }


    const cards =
      document.querySelectorAll(
        '.card'
      );


    for(
      const card of cards
    ){

      const text =
        String(
          card.textContent || ''
        );


      if(
        text.includes(
          String(
            partner.name || ''
          )
        ) &&
        text.includes(
          'Service: ' +
          String(
            partner.service || ''
          )
        )
      ){

        return card;

      }

    }


    return null;

  }


  function addSpecializedDetails(){

    const partner =
      getSavedPartner();


    if(!partner){
      return;
    }


    if(
      partner.verification !==
      'Pending Review'
    ){

      return;

    }


    const category =
      window.BAP_getCategory
        ? window.BAP_getCategory(
            partner.service
          )
        : null;


    if(
      !category ||
      category.type !==
      'specialized'
    ){

      return;

    }


    const card =
      findPartnerCard(
        partner
      );


    if(!card){
      return;
    }


    if(
      card.querySelector(
        '#bapAdminSpecializedDetails'
      )
    ){

      return;

    }


    const box =
      document.createElement(
        'div'
      );


    box.id =
      'bapAdminSpecializedDetails';


    box.style.cssText = [

      'margin-top:16px',
      'padding:14px',
      'border:1px solid #ddd6fe',
      'border-radius:14px',
      'background:#faf5ff',
      'line-height:1.6'

    ].join(';');


    const experienceYears =
      partner.experienceYears ??
      'Not provided';


    const experienceDetails =
      partner.experienceDetails ||
      'Not provided';


    const qualification =
      partner.qualification ||
      'Not provided';


    const proofName =
      partner.experienceProofName ||
      'Not uploaded';


    const gender =
      partner.gender ||
      'Not provided';


    box.innerHTML = `

      <div style="
        font-size:16px;
        font-weight:800;
        margin-bottom:10px;
      ">
        🛡 Specialized Verification Details
      </div>

      <div>
        <b>Partner Gender:</b>
        ${gender}
      </div>

      <div>
        <b>Relevant Experience:</b>
        ${experienceYears} years
      </div>

      <div>
        <b>Experience Details:</b>
        ${experienceDetails}
      </div>

      <div>
        <b>Qualification / Certification:</b>
        ${qualification}
      </div>

      <div>
        <b>Proof / Certificate:</b>
        ${proofName}
      </div>

      <div style="
        margin-top:10px;
        padding:9px 10px;
        border-radius:10px;
        background:#fff;
        border:1px solid #e2e8f0;
        font-size:12px;
      ">
        ⚠ Specialized service — verify experience,
        qualification and proof before approval.
      </div>

    `;


    const buttons =
      card.querySelector(
        'button'
      );


    if(buttons){

      buttons.parentNode.insertBefore(
        box,
        buttons.parentNode
          .firstChild
      );

    }else{

      card.appendChild(
        box
      );

    }

  }


  function installAdminRenderHook(){

    if(
      typeof window.renderAdmin !==
      'function'
    ){

      return false;

    }


    if(
      window.renderAdmin
        .__BAP_ADMIN_DETAILS_HOOK
    ){

      return true;

    }


    const originalRenderAdmin =
      window.renderAdmin;


    function wrappedRenderAdmin(){

      const result =
        originalRenderAdmin.apply(
          this,
          arguments
        );


      setTimeout(
        addSpecializedDetails,
        50
      );


      setTimeout(
        addSpecializedDetails,
        300
      );


      setTimeout(
        addSpecializedDetails,
        1000
      );


      return result;

    }


    wrappedRenderAdmin
      .__BAP_ADMIN_DETAILS_HOOK =
      true;


    window.renderAdmin =
      wrappedRenderAdmin;


    return true;

  }


  function startAdminDetailsSystem(){

    addSpecializedDetails();

    installAdminRenderHook();


    setTimeout(
      addSpecializedDetails,
      500
    );


    setTimeout(
      installAdminRenderHook,
      1000
    );


    setTimeout(
      addSpecializedDetails,
      1500
    );


    setTimeout(
      installAdminRenderHook,
      2000
    );


    setTimeout(
      addSpecializedDetails,
      3000
    );

  }


  document.addEventListener(
    'DOMContentLoaded',
    startAdminDetailsSystem
  );


})();
/* ==========================================================
   BOOK A PARTNER — PROOF DOCUMENT STORAGE
   Stores partner verification PDF/images in IndexedDB and
   provides an Admin "Open Proof" button.
   ========================================================== */

(function(){

  'use strict';

  const DB_NAME =
    'bap_partner_documents';

  const DB_VERSION =
    1;

  const STORE_NAME =
    'documents';


  function openBapDocumentDB(){

    return new Promise(
      function(resolve,reject){

        const request =
          indexedDB.open(
            DB_NAME,
            DB_VERSION
          );


        request.onupgradeneeded =
          function(event){

            const db =
              event.target.result;


            if(
              !db.objectStoreNames.contains(
                STORE_NAME
              )
            ){

              db.createObjectStore(
                STORE_NAME,
                {
                  keyPath:'id'
                }
              );

            }

          };


        request.onsuccess =
          function(){

            resolve(
              request.result
            );

          };


        request.onerror =
          function(){

            reject(
              request.error
            );

          };

      }
    );

  }


  async function saveBapDocument(
    id,
    file
  ){

    if(!file){
      return null;
    }


    const db =
      await openBapDocumentDB();


    return new Promise(
      function(resolve,reject){

        const transaction =
          db.transaction(
            STORE_NAME,
            'readwrite'
          );


        const store =
          transaction.objectStore(
            STORE_NAME
          );


        const request =
          store.put({
            id:id,
            name:file.name,
            type:file.type ||
              'application/octet-stream',
            blob:file
          });


        request.onsuccess =
          function(){

            resolve(id);

          };


        request.onerror =
          function(){

            reject(
              request.error
            );

          };

      }
    );

  }


  async function getBapDocument(
    id
  ){

    if(!id){
      return null;
    }


    const db =
      await openBapDocumentDB();


    return new Promise(
      function(resolve,reject){

        const transaction =
          db.transaction(
            STORE_NAME,
            'readonly'
          );


        const store =
          transaction.objectStore(
            STORE_NAME
          );


        const request =
          store.get(id);


        request.onsuccess =
          function(){

            resolve(
              request.result ||
              null
            );

          };


        request.onerror =
          function(){

            reject(
              request.error
            );

          };

      }
    );

  }


  function findElement(id){

    return document.getElementById(
      id
    );

  }


  /* ==========================================================
     SAVE PROOF BEFORE PARTNER APPLICATION
     ========================================================== */

  function installProofSaveHook(){

    if(
      typeof window.partnerApply !==
      'function'
    ){

      setTimeout(
        installProofSaveHook,
        700
      );

      return;

    }


    if(
      window.partnerApply
        .__BAP_PROOF_DB_HOOK
    ){

      return;

    }


    const previousApply =
      window.partnerApply;


    async function proofSafePartnerApply(){

      const proofInput =
        findElement(
          'partnerExperienceProof'
        );


      const proofFile =
        proofInput &&
        proofInput.files &&
        proofInput.files[0]
          ? proofInput.files[0]
          : null;


      let proofId =
        null;


      if(proofFile){

        proofId =
          'proof_' +
          Date.now() +
          '_' +
          Math.random()
            .toString(36)
            .slice(2);


        try{

          await saveBapDocument(
            proofId,
            proofFile
          );

        }catch(error){

          console.error(
            'Proof document save failed:',
            error
          );


          alert(
            'Verification proof could not be saved. Please try again.'
          );


          return;

        }

      }


      await previousApply();


      if(!proofId){
        return;
      }


      const saved =
        JSON.parse(
          localStorage.getItem(
            'bap_partner_profile'
          ) ||
          'null'
        );


      if(!saved){
        return;
      }


      saved.experienceProofId =
        proofId;


      saved.experienceProofName =
        proofFile.name;


      /*
        Keep filename only in localStorage.
        Actual PDF remains in IndexedDB.
      */

      delete saved.experienceProofData;


      try{

        localStorage.setItem(
          'bap_partner_profile',
          JSON.stringify(
            saved
          )
        );

      }catch(error){

        console.warn(
          'Profile metadata save warning:',
          error
        );

      }

    }


    proofSafePartnerApply
      .__BAP_PROOF_DB_HOOK =
      true;


    window.partnerApply =
      proofSafePartnerApply;

  }


  /* ==========================================================
     ADMIN OPEN PROOF
     ========================================================== */

  async function bapOpenVerificationProof(
    proofId
  ){

    if(!proofId){

      alert(
        'Verification proof is not available for this profile.'
      );

      return;

    }


    try{

      const documentRecord =
        await getBapDocument(
          proofId
        );


      if(
        !documentRecord ||
        !documentRecord.blob
      ){

        alert(
          'Proof document is not available in this browser demo. Please ask the partner to upload the proof again.'
        );

        return;

      }


      const url =
        URL.createObjectURL(
          documentRecord.blob
        );


      window.open(
        url,
        '_blank',
        'noopener,noreferrer'
      );


      setTimeout(
        function(){

          URL.revokeObjectURL(
            url
          );

        },
        60000
      );

    }catch(error){

      console.error(
        'Proof open error:',
        error
      );


      alert(
        'Could not open the verification proof.'
      );

    }

  }


  window.BAP_openVerificationProof =
    bapOpenVerificationProof;


  /* ==========================================================
     ADD OPEN PROOF BUTTON TO ADMIN
     ========================================================== */

  function addAdminProofButton(){

    const partner =
      JSON.parse(
        localStorage.getItem(
          'bap_partner_profile'
        ) ||
        'null'
      );


    if(!partner){
      return;
    }


    if(
      partner.verification !==
      'Pending Review'
    ){

      return;

    }


    if(
      !partner.experienceProofId
    ){

      return;

    }


    const cards =
      document.querySelectorAll(
        '.card'
      );


    let targetCard =
      null;


    for(
      const card of cards
    ){

      const text =
        String(
          card.textContent ||
          ''
        );


      if(
        text.includes(
          String(
            partner.name ||
            ''
          )
        ) &&
        text.includes(
          String(
            partner.service ||
            ''
          )
        )
      ){

        targetCard =
          card;

        break;

      }

    }


    if(!targetCard){
      return;
    }


    if(
      targetCard.querySelector(
        '#bapOpenProofButton'
      )
    ){

      return;

    }


    const detailsBox =
      targetCard.querySelector(
        '#bapAdminSpecializedDetails'
      );


    if(!detailsBox){
      return;
    }


    const button =
      document.createElement(
        'button'
      );


    button.id =
      'bapOpenProofButton';


    button.type =
      'button';


    button.className =
      'light';


    button.style.cssText =
      [
        'margin-top:10px',
        'font-weight:700'
      ].join(';');


    button.textContent =
      '📄 Open Proof / Certificate';


    button.onclick =
      function(){

        bapOpenVerificationProof(
          partner.experienceProofId
        );

      };


    detailsBox.appendChild(
      button
    );

  }


  function startProofSystem(){

    installProofSaveHook();

    addAdminProofButton();


    setTimeout(
      installProofSaveHook,
      1000
    );


    setTimeout(
      installProofSaveHook,
      2500
    );


    setTimeout(
      addAdminProofButton,
      500
    );


    setTimeout(
      addAdminProofButton,
      1500
    );


    setTimeout(
      addAdminProofButton,
      3000
    );

  }


  document.addEventListener(
    'DOMContentLoaded',
    startProofSystem
  );

})();
/* ==========================================================
   BOOK A PARTNER — FINAL PROOF STORAGE + OPEN PROOF PATCH
   Stores JPEG/PNG/PDF proof files in IndexedDB and adds
   an Admin button to open the saved proof document.
   ========================================================== */

(function(){

  'use strict';


  const BAP_PROOF_DB_NAME =
    'bap_partner_documents';

  const BAP_PROOF_DB_VERSION =
    1;

  const BAP_PROOF_STORE =
    'documents';


  /* ==========================================================
     OPEN DATABASE
     ========================================================== */

  function bapOpenProofDB(){

    return new Promise(
      function(resolve,reject){

        const request =
          indexedDB.open(
            BAP_PROOF_DB_NAME,
            BAP_PROOF_DB_VERSION
          );


        request.onupgradeneeded =
          function(event){

            const db =
              event.target.result;


            if(
              !db.objectStoreNames.contains(
                BAP_PROOF_STORE
              )
            ){

              db.createObjectStore(
                BAP_PROOF_STORE,
                {
                  keyPath:'id'
                }
              );

            }

          };


        request.onsuccess =
          function(){

            resolve(
              request.result
            );

          };


        request.onerror =
          function(){

            reject(
              request.error
            );

          };

      }
    );

  }


  /* ==========================================================
     SAVE PROOF FILE
     ========================================================== */

  async function bapSaveProofFile(
    id,
    file
  ){

    if(
      !id ||
      !file
    ){

      return null;

    }


    const db =
      await bapOpenProofDB();


    return new Promise(
      function(resolve,reject){

        const transaction =
          db.transaction(
            BAP_PROOF_STORE,
            'readwrite'
          );


        const store =
          transaction.objectStore(
            BAP_PROOF_STORE
          );


        const request =
          store.put({

            id:id,

            name:
              file.name,

            type:
              file.type ||
              'application/octet-stream',

            blob:
              file

          });


        request.onsuccess =
          function(){

            resolve(
              id
            );

          };


        request.onerror =
          function(){

            reject(
              request.error
            );

          };

      }
    );

  }


  /* ==========================================================
     GET PROOF FILE
     ========================================================== */

  async function bapGetProofFile(
    id
  ){

    if(!id){

      return null;

    }


    const db =
      await bapOpenProofDB();


    return new Promise(
      function(resolve,reject){

        const transaction =
          db.transaction(
            BAP_PROOF_STORE,
            'readonly'
          );


        const store =
          transaction.objectStore(
            BAP_PROOF_STORE
          );


        const request =
          store.get(id);


        request.onsuccess =
          function(){

            resolve(
              request.result ||
              null
            );

          };


        request.onerror =
          function(){

            reject(
              request.error
            );

          };

      }
    );

  }


  /* ==========================================================
     OPEN PROOF
     ========================================================== */

  window.BAP_openProof =
    async function(proofId){

      if(!proofId){

        alert(
          'Proof document is not available. Please ask the partner to upload it again.'
        );

        return;

      }


      try{

        const record =
          await bapGetProofFile(
            proofId
          );


        if(
          !record ||
          !record.blob
        ){

          alert(
            'Proof document is not available in this browser demo. Please ask the partner to upload it again.'
          );

          return;

        }


        const blob =
          record.blob instanceof Blob
            ? record.blob
            : new Blob(
                [record.blob],
                {
                  type:
                    record.type ||
                    'application/octet-stream'
                }
              );


        const url =
          URL.createObjectURL(
            blob
          );


        window.open(
          url,
          '_blank',
          'noopener,noreferrer'
        );


        setTimeout(
          function(){

            URL.revokeObjectURL(
              url
            );

          },
          60000
        );


      }catch(error){

        console.error(
          'BAP proof open error:',
          error
        );


        alert(
          'Could not open the verification proof.'
        );

      }

    };


  /* ==========================================================
     SAVE CURRENT FORM PROOF
     ========================================================== */

  async function bapCaptureCurrentProof(){

    const input =
      document.getElementById(
        'partnerExperienceProof'
      );


    if(
      !input ||
      !input.files ||
      !input.files[0]
    ){

      return null;

    }


    const file =
      input.files[0];


    const proofId =
      'proof_' +
      Date.now() +
      '_' +
      Math.random()
        .toString(36)
        .slice(2);


    await bapSaveProofFile(
      proofId,
      file
    );


    return {

      id:
        proofId,

      name:
        file.name

    };

  }


  /* ==========================================================
     WRAP PARTNER APPLY
     ========================================================== */

  function installProofPartnerApply(){

    if(
      typeof window.partnerApply !==
      'function'
    ){

      setTimeout(
        installProofPartnerApply,
        1000
      );

      return;

    }


    if(
      window.partnerApply
        .__BAP_FINAL_PROOF_PATCH
    ){

      return;

    }


    const previousPartnerApply =
      window.partnerApply;


    async function proofPartnerApply(){

      let proofInfo =
        null;


      /*
        Save the actual proof file BEFORE
        the original partnerApply runs.
      */

      try{

        proofInfo =
          await bapCaptureCurrentProof();

      }catch(error){

        console.error(
          'Could not save proof:',
          error
        );


        alert(
          'The proof document could not be saved. Please try again.'
        );


        return;

      }


      /*
        Run the existing partner application.
      */

      await previousPartnerApply();


      /*
        Add the IndexedDB proof reference
        to the saved partner profile.
      */

      if(
        proofInfo
      ){

        try{

          const savedProfile =
            JSON.parse(
              localStorage.getItem(
                'bap_partner_profile'
              ) ||
              'null'
            );


          if(savedProfile){

            savedProfile.experienceProofId =
              proofInfo.id;


            savedProfile.experienceProofName =
              proofInfo.name;


            /*
              Never store the large binary
              proof file in localStorage.
            */

            delete savedProfile.experienceProofData;


            localStorage.setItem(
              'bap_partner_profile',
              JSON.stringify(
                savedProfile
              )
            );

          }

        }catch(error){

          console.error(
            'Proof metadata save error:',
            error
          );

        }

      }

    }


    proofPartnerApply
      .__BAP_FINAL_PROOF_PATCH =
      true;


    window.partnerApply =
      proofPartnerApply;

  }


  /* ==========================================================
     ADMIN PROOF BUTTON
     ========================================================== */

  function addAdminOpenProofButton(){

    let partner =
      null;


    try{

      partner =
        JSON.parse(
          localStorage.getItem(
            'bap_partner_profile'
          ) ||
          'null'
        );

    }catch(error){

      return;

    }


    if(!partner){

      return;

    }


    if(
      !partner.experienceProofId
    ){

      return;

    }


    const cards =
      document.querySelectorAll(
        '.card'
      );


    let targetCard =
      null;


    for(
      const card of cards
    ){

      const text =
        String(
          card.textContent ||
          ''
        );


      if(
        text.includes(
          String(
            partner.name ||
            ''
          )
        ) &&
        text.includes(
          String(
            partner.service ||
            ''
          )
        )
      ){

        targetCard =
          card;

        break;

      }

    }


    if(!targetCard){

      return;

    }


    if(
      targetCard.querySelector(
        '#bapFinalOpenProofButton'
      )
    ){

      return;

    }


    const detailsBox =
      targetCard.querySelector(
        '#bapAdminSpecializedDetails'
      );


    if(!detailsBox){

      return;

    }


    const button =
      document.createElement(
        'button'
      );


    button.id =
      'bapFinalOpenProofButton';


    button.type =
      'button';


    button.className =
      'light';


    button.style.cssText =
      [
        'margin-top:10px',
        'font-weight:700',
        'display:block'
      ].join(';');


    button.textContent =
      '📄 Open Proof / Certificate';


    button.onclick =
      function(){

        window.BAP_openProof(
          partner.experienceProofId
        );

      };


    detailsBox.appendChild(
      button
    );

  }


  /* ==========================================================
     START
     ========================================================== */

  function startFinalProofPatch(){

    installProofPartnerApply();

    addAdminOpenProofButton();


    setTimeout(
      installProofPartnerApply,
      1000
    );


    setTimeout(
      installProofPartnerApply,
      2500
    );


    setTimeout(
      installProofPartnerApply,
      4000
    );


    setTimeout(
      addAdminOpenProofButton,
      500
    );


    setTimeout(
      addAdminOpenProofButton,
      1500
    );


    setTimeout(
      addAdminOpenProofButton,
      3000
    );


  }


  document.addEventListener(
    'DOMContentLoaded',
    startFinalProofPatch
  );


})();
/* ==========================================================
   BOOK A PARTNER — ROBUST PROOF LINK PATCH
   Saves selected verification proof immediately and
   attaches its ID to the partner profile after submit.
   ========================================================== */

(function(){

  'use strict';


  const DB_NAME =
    'bap_partner_documents';

  const DB_VERSION =
    1;

  const STORE_NAME =
    'documents';


  function openDB(){

    return new Promise(
      function(resolve,reject){

        const request =
          indexedDB.open(
            DB_NAME,
            DB_VERSION
          );


        request.onupgradeneeded =
          function(event){

            const db =
              event.target.result;


            if(
              !db.objectStoreNames.contains(
                STORE_NAME
              )
            ){

              db.createObjectStore(
                STORE_NAME,
                {
                  keyPath:'id'
                }
              );

            }

          };


        request.onsuccess =
          function(){

            resolve(
              request.result
            );

          };


        request.onerror =
          function(){

            reject(
              request.error
            );

          };

      }
    );

  }


  async function saveFile(
    id,
    file
  ){

    const db =
      await openDB();


    return new Promise(
      function(resolve,reject){

        const tx =
          db.transaction(
            STORE_NAME,
            'readwrite'
          );


        const store =
          tx.objectStore(
            STORE_NAME
          );


        const request =
          store.put({

            id:id,

            name:
              file.name,

            type:
              file.type ||
              'application/octet-stream',

            blob:
              file

          });


        request.onsuccess =
          function(){

            resolve(id);

          };


        request.onerror =
          function(){

            reject(
              request.error
            );

          };

      }
    );

  }


  async function getFile(
    id
  ){

    const db =
      await openDB();


    return new Promise(
      function(resolve,reject){

        const tx =
          db.transaction(
            STORE_NAME,
            'readonly'
          );


        const store =
          tx.objectStore(
            STORE_NAME
          );


        const request =
          store.get(id);


        request.onsuccess =
          function(){

            resolve(
              request.result ||
              null
            );

          };


        request.onerror =
          function(){

            reject(
              request.error
            );

          };

      }
    );

  }


  window.BAP_openProof =
    async function(id){

      if(!id){

        alert(
          'Proof document is not available.'
        );

        return;

      }


      try{

        const record =
          await getFile(id);


        if(
          !record ||
          !record.blob
        ){

          alert(
            'Proof document is not available. Please ask the partner to upload it again.'
          );

          return;

        }


        const blob =
          record.blob instanceof Blob
            ? record.blob
            : new Blob(
                [
                  record.blob
                ],
                {
                  type:
                    record.type ||
                    'application/octet-stream'
                }
              );


        const url =
          URL.createObjectURL(
            blob
          );


        window.open(
          url,
          '_blank',
          'noopener,noreferrer'
        );


        setTimeout(
          function(){

            URL.revokeObjectURL(
              url
            );

          },
          60000
        );


      }catch(error){

        console.error(
          'Proof open error:',
          error
        );


        alert(
          'Could not open the verification proof.'
        );

      }

    };


  let currentProofId =
    null;


  /* ==========================================================
     WATCH PROOF FILE INPUT
     ========================================================== */

  function watchProofInput(){

    const input =
      document.getElementById(
        'partnerExperienceProof'
      );


    if(
      !input ||
      input.__BAP_ROBUST_PROOF_WATCH
    ){

      return;

    }


    input.__BAP_ROBUST_PROOF_WATCH =
      true;


    input.addEventListener(
      'change',
      async function(){

        const file =
          input.files &&
          input.files[0]
            ? input.files[0]
            : null;


        if(!file){

          currentProofId =
            null;

          return;

        }


        const id =
          'proof_' +
          Date.now() +
          '_' +
          Math.random()
            .toString(36)
            .slice(2);


        try{

          await saveFile(
            id,
            file
          );


          currentProofId =
            id;


          window.BAP_currentProofId =
            id;


          window.BAP_currentProofName =
            file.name;


        }catch(error){

          console.error(
            'Proof save failed:',
            error
          );


          currentProofId =
            null;


          alert(
            'Proof could not be stored. Please choose the file again.'
          );

        }

      }
    );

  }


  /* ==========================================================
     ATTACH PROOF ID AFTER PARTNER PROFILE SAVE
     ========================================================== */

  async function attachProofToPartnerProfile(){

    if(!currentProofId){

      return;

    }


    try{

      const profile =
        JSON.parse(
          localStorage.getItem(
            'bap_partner_profile'
          ) ||
          'null'
        );


      if(!profile){

        return;

      }


      profile.experienceProofId =
        currentProofId;


      profile.experienceProofName =
        window.BAP_currentProofName ||
        profile.experienceProofName ||
        '';


      delete profile.experienceProofData;


      localStorage.setItem(
        'bap_partner_profile',
        JSON.stringify(
          profile
        )
      );


      window.BAP_currentProofId =
        currentProofId;


    }catch(error){

      console.error(
        'Proof profile link error:',
        error
      );

    }

  }


  /* ==========================================================
     WATCH CREATE PARTNER PROFILE BUTTON
     ========================================================== */

  function watchCreateButton(){

    const buttons =
      document.querySelectorAll(
        'button'
      );


    buttons.forEach(
      function(button){

        const text =
          String(
            button.textContent ||
            ''
          ).trim();


        if(
          text !==
          'Create Partner Profile'
        ){

          return;

        }


        if(
          button.__BAP_ROBUST_PROOF_BUTTON
        ){

          return;

        }


        button.__BAP_ROBUST_PROOF_BUTTON =
          true;


        button.addEventListener(
          'click',
          function(){

            setTimeout(
              attachProofToPartnerProfile,
              1500
            );


            setTimeout(
              attachProofToPartnerProfile,
              3000
            );


            setTimeout(
              attachProofToPartnerProfile,
              5000
            );

          },
          true
        );

      }
    );

  }


  /* ==========================================================
     ADMIN OPEN PROOF BUTTON
     ========================================================== */

  function addAdminProofButton(){

    let partner =
      null;


    try{

      partner =
        JSON.parse(
          localStorage.getItem(
            'bap_partner_profile'
          ) ||
          'null'
        );

    }catch(error){

      return;

    }


    if(
      !partner ||
      !partner.experienceProofId
    ){

      return;

    }


    const cards =
      document.querySelectorAll(
        '.card'
      );


    let target =
      null;


    for(
      const card of cards
    ){

      const text =
        String(
          card.textContent ||
          ''
        );


      if(
        text.includes(
          String(
            partner.name ||
            ''
          )
        ) &&
        text.includes(
          String(
            partner.service ||
            ''
          )
        )
      ){

        target =
          card;

        break;

      }

    }


    if(!target){

      return;

    }


    if(
      target.querySelector(
        '#bapRobustOpenProof'
      )
    ){

      return;

    }


    const button =
      document.createElement(
        'button'
      );


    button.id =
      'bapRobustOpenProof';


    button.type =
      'button';


    button.className =
      'light';


    button.style.cssText =
      'margin-top:10px;font-weight:700;display:block;';


    button.textContent =
      '📄 Open Proof / Certificate';


    button.onclick =
      function(){

        window.BAP_openProof(
          partner.experienceProofId
        );

      };


    const details =
      target.querySelector(
        '#bapAdminSpecializedDetails'
      );


    if(details){

      details.appendChild(
        button
      );

    }else{

      target.appendChild(
        button
      );

    }

  }


  function startRobustProofPatch(){

    watchProofInput();

    watchCreateButton();

    attachProofToPartnerProfile();

    addAdminProofButton();


    setTimeout(
      watchProofInput,
      500
    );


    setTimeout(
      watchCreateButton,
      500
    );


    setTimeout(
      watchCreateButton,
      1500
    );


    setTimeout(
      watchCreateButton,
      3000
    );


    setTimeout(
      addAdminProofButton,
      1000
    );


    setTimeout(
      addAdminProofButton,
      2500
    );


    setTimeout(
      addAdminProofButton,
      5000
    );

  }


  document.addEventListener(
    'DOMContentLoaded',
    startRobustProofPatch
  );


})();

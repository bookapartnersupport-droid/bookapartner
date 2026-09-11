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

/* ==========================================================
   BOOK A PARTNER — MULTI PARTNER SYSTEM v3
   ========================================================== */

(function(){
  'use strict';

  const PARTNER_LIST_KEY = 'bap_partner_profiles';
  const LEGACY_KEY = 'bap_partner_profile';
  const CURRENT_KEY = 'bap_current_partner_id';

  const DB_NAME = 'bap_partner_documents';
  const DB_VERSION = 1;
  const DOC_STORE = 'documents';

  let installed = false;

  function byId(id){
    return document.getElementById(id);
  }

  function safeJsonParse(value, fallback){
    try{
      return JSON.parse(value);
    }catch(e){
      return fallback;
    }
  }

  function uid(prefix){
    return prefix + '_' +
      Date.now().toString(36) + '_' +
      Math.random().toString(36).slice(2,10);
  }

  function getPartners(){
    let list = safeJsonParse(
      localStorage.getItem(PARTNER_LIST_KEY) || '[]',
      []
    );

    if(!Array.isArray(list)){
      list = [];
    }

    let changed = false;

    list = list.map(function(p){
      if(!p.id){
        p.id = uid('partner');
        changed = true;
      }

      if(!p.verification){
        p.verification = 'Pending Review';
        changed = true;
      }

      return p;
    });

    if(changed){
      localStorage.setItem(
        PARTNER_LIST_KEY,
        JSON.stringify(list)
      );
    }

    return list;
  }

  function savePartners(list){
    localStorage.setItem(
      PARTNER_LIST_KEY,
      JSON.stringify(list)
    );
    return list;
  }

  function findPartner(id){
    if(!id){
      return null;
    }

    return getPartners().find(function(p){
      return String(p.id) === String(id);
    }) || null;
  }

  function getCurrentPartnerId(){
    return localStorage.getItem(CURRENT_KEY) || '';
  }

  function setCurrentPartner(id){
    if(id){
      localStorage.setItem(
        CURRENT_KEY,
        String(id)
      );
    }else{
      localStorage.removeItem(CURRENT_KEY);
    }
  }

  function getCurrentPartner(){
    const id = getCurrentPartnerId();

    if(id){
      const partner = findPartner(id);

      if(partner){
        return partner;
      }
    }

    const list = getPartners();

    if(list.length){
      return list[list.length - 1];
    }

    return null;
  }

  /* ==========================================================
     MIGRATION FROM OLD SINGLE PARTNER SYSTEM
     ========================================================== */

  function migratePartners(){

    let list = safeJsonParse(
      localStorage.getItem(PARTNER_LIST_KEY) || '[]',
      []
    );

    if(!Array.isArray(list)){
      list = [];
    }

    const legacy = safeJsonParse(
      localStorage.getItem(LEGACY_KEY) || 'null',
      null
    );

    if(legacy && typeof legacy === 'object'){

      const exists = list.some(function(p){

        if(
          legacy.id &&
          p.id &&
          String(legacy.id) === String(p.id)
        ){
          return true;
        }

        return (
          String(p.mobile || '') ===
          String(legacy.mobile || '') &&
          String(p.name || '').trim().toLowerCase() ===
          String(legacy.name || '').trim().toLowerCase()
        );
      });

      if(!exists){

        if(!legacy.id){
          legacy.id = uid('partner');
        }

        list.push(legacy);
      }
    }

    list = list.map(function(p){

      if(!p.id){
        p.id = uid('partner');
      }

      if(!p.verification){
        p.verification = 'Pending Review';
      }

      return p;
    });

    savePartners(list);

    if(
      !getCurrentPartnerId() &&
      list.length
    ){
      setCurrentPartner(
        list[list.length - 1].id
      );
    }

    return list;
  }

  /* ==========================================================
     INDEXED DB — PROOF DOCUMENTS
     ========================================================== */

  function openProofDB(){

    return new Promise(function(resolve,reject){

      if(!window.indexedDB){
        reject(
          new Error('IndexedDB not supported')
        );
        return;
      }

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
              DOC_STORE
            )
          ){

            db.createObjectStore(
              DOC_STORE,
              {
                keyPath:'id'
              }
            );
          }
        };

      request.onsuccess =
        function(event){
          resolve(
            event.target.result
          );
        };

      request.onerror =
        function(){
          reject(
            request.error ||
            new Error('IndexedDB error')
          );
        };
    });
  }

  function saveProofDocument(file){

    return new Promise(function(resolve,reject){

      if(!file){
        resolve(null);
        return;
      }

      openProofDB()
        .then(function(db){

          const id =
            uid('proof');

          const tx =
            db.transaction(
              DOC_STORE,
              'readwrite'
            );

          const store =
            tx.objectStore(
              DOC_STORE
            );

          store.put({
            id:id,
            name:file.name || 'proof',
            type:file.type ||
              'application/octet-stream',
            blob:file
          });

          tx.oncomplete =
            function(){

              resolve({
                id:id,
                name:file.name || 'proof'
              });
            };

          tx.onerror =
            function(){
              reject(
                tx.error ||
                new Error(
                  'Unable to save proof'
                )
              );
            };

        })
        .catch(reject);
    });
  }

  function readProofDocument(id){

    return new Promise(function(resolve,reject){

      if(!id){
        reject(
          new Error('Proof id missing')
        );
        return;
      }

      openProofDB()
        .then(function(db){

          const tx =
            db.transaction(
              DOC_STORE,
              'readonly'
            );

          const request =
            tx.objectStore(
              DOC_STORE
            ).get(id);

          request.onsuccess =
            function(){
              resolve(
                request.result || null
              );
            };

          request.onerror =
            function(){
              reject(
                request.error ||
                new Error(
                  'Unable to read proof'
                )
              );
            };

        })
        .catch(reject);
    });
  }

  window.BAP_openPartnerProof =
    function(partnerId){

      const partner =
        findPartner(partnerId);

      if(!partner){
        alert(
          'Partner record not found.'
        );
        return;
      }

      const proofId =
        partner.proofId ||
        partner.qualificationProofId ||
        partner.documentId;

      if(!proofId){
        alert(
          'No proof document available.'
        );
        return;
      }

      readProofDocument(proofId)
        .then(function(doc){

          if(
            !doc ||
            !doc.blob
          ){
            alert(
              'Proof document not found.'
            );
            return;
          }

          const url =
            URL.createObjectURL(
              doc.blob
            );

          const win =
            window.open(
              url,
              '_blank'
            );

          if(!win){

            const a =
              document.createElement(
                'a'
              );

            a.href = url;
            a.target = '_blank';
            a.rel = 'noopener';

            a.click();
          }

          setTimeout(
            function(){
              URL.revokeObjectURL(
                url
              );
            },
            60000
          );

        })
        .catch(function(err){

          console.error(err);

          alert(
            'Unable to open proof document.'
          );
        });
    };

  /* ==========================================================
     FILE / IMAGE HELPERS
     ========================================================== */

  function compressImage(
    file,
    maxSize,
    quality
  ){

    return new Promise(function(resolve,reject){

      if(!file){
        resolve('');
        return;
      }

      if(
        !file.type ||
        file.type.indexOf('image/') !== 0
      ){

        const reader =
          new FileReader();

        reader.onload =
          function(){
            resolve(
              reader.result || ''
            );
          };

        reader.onerror =
          function(){
            reject(reader.error);
          };

        reader.readAsDataURL(file);

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

              let width =
                img.width;

              let height =
                img.height;

              if(
                width > height &&
                width > maxSize
              ){

                height =
                  Math.round(
                    height *
                    maxSize /
                    width
                  );

                width =
                  maxSize;

              }else if(
                height > maxSize
              ){

                width =
                  Math.round(
                    width *
                    maxSize /
                    height
                  );

                height =
                  maxSize;
              }

              const canvas =
                document.createElement(
                  'canvas'
                );

              canvas.width = width;
              canvas.height = height;

              const ctx =
                canvas.getContext(
                  '2d'
                );

              if(!ctx){

                resolve(
                  reader.result || ''
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

              try{

                resolve(
                  canvas.toDataURL(
                    'image/jpeg',
                    quality
                  )
                );

              }catch(e){

                resolve(
                  reader.result || ''
                );
              }
            };

          img.onerror =
            function(){
              resolve(
                reader.result || ''
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

      reader.readAsDataURL(file);
    });
  }

  function firstValue(ids){

    for(
      let i=0;
      i<ids.length;
      i++
    ){

      const el =
        byId(ids[i]);

      if(el){

        const value =
          String(
            el.value ||
            el.textContent ||
            ''
          ).trim();

        if(value){
          return value;
        }
      }
    }

    return '';
  }

  function getService(){

    let value =
      firstValue([
        'partnerService',
        'pService',
        'servicePartner',
        'partnerCategory',
        'partner_service',
        'service'
      ]);

    if(value){
      return value;
    }

    const select =
      document.querySelector(
        'select[id*="service" i]'
      );

    return select ?
      String(
        select.value || ''
      ).trim() :
      '';
  }

  function getGender(){

    let value =
      firstValue([
        'partnerGender',
        'pGender',
        'genderPartner',
        'partner_gender'
      ]);

    if(value){
      return value;
    }

    const radio =
      document.querySelector(
        'input[name="partnerGender"]:checked'
      ) ||
      document.querySelector(
        'input[name="gender"]:checked'
      );

    return radio ?
      String(
        radio.value || ''
      ).trim() :
      '';
  }

  /* ==========================================================
     SPECIALIZED SERVICE VALIDATION
     ========================================================== */

  function specializedServices(){

    return [
      'Elder Care / Senior Companion',
      'Medical Assistance',
      'Fitness / Walking Partner',
      'Professional Networking',
      'Technical Assistance',
      'Special Event Support'
    ];
  }

  function isSpecialized(service){

    const wanted =
      String(
        service || ''
      ).trim().toLowerCase();

    return specializedServices()
      .some(function(item){

        return String(item)
          .trim()
          .toLowerCase() === wanted;
      });
  }

  /* ==========================================================
     MULTI PARTNER APPLY
     ========================================================== */

  async function multiPartnerApply(){

    try{

      const name =
        firstValue([
          'partnerName',
          'pName',
          'partner_name',
          'namePartner'
        ]);

      const age =
        firstValue([
          'partnerAge',
          'pAge',
          'partner_age',
          'agePartner'
        ]);

      const mobile =
        firstValue([
          'partnerMobile',
          'pMobile',
          'partner_mobile',
          'mobilePartner'
        ]);

      const area =
        firstValue([
          'partnerArea',
          'pArea',
          'partnerLocation',
          'partner_location',
          'areaPartner'
        ]);

      const service =
        getService();

      const rate =
        firstValue([
          'partnerRate',
          'pRate',
          'hourlyRate',
          'partner_rate',
          'ratePartner'
        ]);

      const availability =
        firstValue([
          'partnerAvailability',
          'pAvailability',
          'availabilityPartner',
          'partner_availability'
        ]);

      const gender =
        getGender();

      const experience =
        firstValue([
          'partnerExperience',
          'pExperience',
          'experience',
          'partner_experience'
        ]);

      const qualification =
        firstValue([
          'partnerQualification',
          'pQualification',
          'qualification',
          'partner_qualification'
        ]);

      const photoInput =
        byId('partnerPhoto') ||
        byId('pPhoto') ||
        byId('profilePhoto');

      const selfieInput =
        byId('partnerSelfie') ||
        byId('pSelfie') ||
        byId('selfiePhoto');

      const proofInput =
        byId('partnerProof') ||
        byId('pProof') ||
        byId('qualificationProof') ||
        byId('proofDocument');

      if(!name){
        alert(
          'Please enter partner name.'
        );
        return;
      }

      if(!age){
        alert(
          'Please enter partner age.'
        );
        return;
      }

      if(!mobile){
        alert(
          'Please enter mobile number.'
        );
        return;
      }

      if(!service){
        alert(
          'Please select a service.'
        );
        return;
      }

      const ageNum =
        Number(age);

      if(
        !Number.isFinite(ageNum) ||
        ageNum < 18 ||
        ageNum > 80
      ){

        alert(
          'Partner age must be between 18 and 80.'
        );

        return;
      }

      const proofFile =
        proofInput &&
        proofInput.files &&
        proofInput.files[0] ?
        proofInput.files[0] :
        null;

      if(
        isSpecialized(service) &&
        !experience &&
        !qualification
      ){

        alert(
          'Please enter relevant experience or qualification.'
        );

        return;
      }

      if(
        isSpecialized(service) &&
        !proofFile
      ){

        alert(
          'Please upload the required proof document.'
        );

        return;
      }

      let photo = '';
      let selfie = '';

      if(
        photoInput &&
        photoInput.files &&
        photoInput.files[0]
      ){

        photo =
          await compressImage(
            photoInput.files[0],
            900,
            0.78
          );
      }

      if(
        selfieInput &&
        selfieInput.files &&
        selfieInput.files[0]
      ){

        selfie =
          await compressImage(
            selfieInput.files[0],
            900,
            0.78
          );
      }

      let proofMeta = null;

      if(proofFile){

        try{

          proofMeta =
            await saveProofDocument(
              proofFile
            );

        }catch(error){

          console.error(error);

          alert(
            'Proof document could not be saved.'
          );

          return;
        }
      }

      const partner = {

        id:uid('partner'),

        name:name,

        age:ageNum,

        gender:gender,

        mobile:mobile,

        area:area,

        service:service,

        services:[service],

        rate:rate,

        availability:availability,

        experience:experience,

        qualification:qualification,

        proofRequired:
          isSpecialized(service),

        proofId:
          proofMeta ?
          proofMeta.id :
          '',

        proofName:
          proofMeta ?
          proofMeta.name :
          '',

        verification:
          'Pending Review',

        photo:photo,

        selfie:selfie,

        rating:'New',

        reviews:0,

        createdAt:
          new Date().toISOString(),

        approvedAt:'',

        rejectedAt:'',

        active:true
      };

      const list =
        getPartners();

      list.push(partner);

      savePartners(list);

      setCurrentPartner(
        partner.id
      );

      try{

        localStorage.setItem(
          LEGACY_KEY,
          JSON.stringify(partner)
        );

      }catch(e){}

      alert(
        'Partner application submitted successfully.'
      );

      if(
        typeof window.go ===
        'function'
      ){

        window.go(
          'partnerDashboard'
        );

      }else{

        const dashboard =
          byId(
            'partnerDashboard'
          );

        if(dashboard){

          dashboard.scrollIntoView({
            behavior:'smooth'
          });
        }
      }

      setTimeout(
        renderAllPartnerApplications,
        300
      );

    }catch(error){

      console.error(
        'multiPartnerApply error',
        error
      );

      alert(
        'Something went wrong while submitting the partner application.'
      );
    }
  }

  /* ==========================================================
     CUSTOMER SEARCH
     ========================================================== */

  function approvedPartners(){

    return getPartners()
      .filter(function(p){

        return String(
          p.verification || ''
        ).toLowerCase() ===
        'approved';

      })
      .map(function(p){

        const services =
          Array.isArray(p.services) &&
          p.services.length ?
          p.services :
          [p.service];

        return {

          id:p.id,

          partnerId:p.id,

          name:p.name,

          age:Number(p.age) || 0,

          gender:p.gender || '',

          city:
            p.city ||
            p.area ||
            'Gurgaon',

          area:
            p.area ||
            p.city ||
            'Gurgaon',

          service:
            p.service ||
            services[0] ||
            '',

          services:services,

          rate:p.rate || '',

          availability:
            p.availability || '',

          rating:
            p.rating || 'New',

          reviews:
            Number(p.reviews) || 0,

          photo:
            p.photo || '',

          verification:
            p.verification,

          experience:
            p.experience || '',

          qualification:
            p.qualification || '',

          dynamicPartner:true
        };
      });
  }

  function serviceMatch(
    partner,
    desired
  ){

    if(!desired){
      return true;
    }

    const wanted =
      String(desired)
        .trim()
        .toLowerCase();

    const services =
      Array.isArray(
        partner.services
      ) ?
      partner.services :
      [partner.service];

    return services.some(
      function(service){

        const current =
          String(
            service || ''
          )
          .trim()
          .toLowerCase();

        return (
          current.indexOf(wanted) !== -1 ||
          wanted.indexOf(current) !== -1
        );
      }
    );
  }

  function genderMatch(
    partner,
    desired
  ){

    if(!desired){
      return true;
    }

    const wanted =
      String(desired)
        .trim()
        .toLowerCase();

    if(
      wanted === 'any' ||
      wanted === 'any partner' ||
      wanted === 'all'
    ){
      return true;
    }

    const gender =
      String(
        partner.gender || ''
      )
      .trim()
      .toLowerCase();

    if(!gender){
      return false;
    }

    return (
      gender === wanted ||
      gender.indexOf(wanted) !== -1 ||
      wanted.indexOf(gender) !== -1
    );
  }

  function ageMatch(
    partner,
    minAge,
    maxAge
  ){

    const age =
      Number(
        partner.age
      ) || 0;

    if(!age){
      return false;
    }

    if(
      minAge !== '' &&
      minAge !== null &&
      minAge !== undefined &&
      age < Number(minAge)
    ){
      return false;
    }

    if(
      maxAge !== '' &&
      maxAge !== null &&
      maxAge !== undefined &&
      age > Number(maxAge)
    ){
      return false;
    }

    return true;
  }

  function locationMatch(
    partner,
    location
  ){

    if(!location){
      return true;
    }

    const wanted =
      String(location)
        .trim()
        .toLowerCase();

    if(!wanted){
      return true;
    }

    const actual =
      (
        String(
          partner.area || ''
        ) +
        ' ' +
        String(
          partner.city || ''
        )
      ).toLowerCase();

    return (
      actual.indexOf(wanted) !== -1 ||
      wanted.indexOf(actual) !== -1
    );
  }

  function installFindPartners(){

    if(
      typeof window.findPartners !==
      'function'
    ){
      return false;
    }

    if(
      window.findPartners.__BAP_MULTI_WRAPPED
    ){
      return true;
    }

    const original =
      window.findPartners;

    function wrappedFindPartners(){

      let result = [];

      try{

        result =
          original.apply(
            this,
            arguments
          );

        if(
          !Array.isArray(result)
        ){
          result = [];
        }

      }catch(error){

        console.error(error);
        result = [];
      }

      const args =
        Array.prototype.slice.call(
          arguments
        );

      let service =
        args[0] || '';

      let gender =
        args[1] || '';

      let minAge =
        args[2] || '';

      let maxAge =
        args[3] || '';

      let location =
        args[4] || '';

      if(!service){

        service =
          firstValue([
            'customerService',
            'searchService',
            'serviceSelect'
          ]);
      }

      if(!gender){

        gender =
          firstValue([
            'customerGenderPreference',
            'genderPreference',
            'searchGender'
          ]);
      }

      const dynamic =
        approvedPartners()
          .filter(function(p){

            return (
              serviceMatch(
                p,
                service
              ) &&
              genderMatch(
                p,
                gender
              ) &&
              ageMatch(
                p,
                minAge,
                maxAge
              ) &&
              locationMatch(
                p,
                location
              )
            );
          });

      const existingIds =
        new Set(
          result.map(function(p){

            return String(
              p.id ||
              p.partnerId ||
              ''
            );
          })
        );

      dynamic.forEach(
        function(partner){

          const id =
            String(
              partner.id
            );

          if(
            !existingIds.has(id)
          ){

            result.push(
              partner
            );

            existingIds.add(id);
          }
        }
      );

      return result;
    }

    wrappedFindPartners.__BAP_MULTI_WRAPPED = true;
    wrappedFindPartners.__BAP_ORIGINAL = original;

    window.findPartners =
      wrappedFindPartners;

    return true;
  }

  /* ==========================================================
     SELECT PARTNER
     ========================================================== */

  function installSelectPartner(){

    if(
      typeof window.selectPartner !==
      'function'
    ){
      return false;
    }

    if(
      window.selectPartner.__BAP_MULTI_WRAPPED
    ){
      return true;
    }

    const original =
      window.selectPartner;

    function wrappedSelectPartner(
      partner
    ){

      try{

        if(partner){

          const id =
            partner.id ||
            partner.partnerId ||
            partner._id;

          if(id){

            const found =
              findPartner(id);

            if(found){

              setCurrentPartner(
                found.id
              );

              try{

                localStorage.setItem(
                  LEGACY_KEY,
                  JSON.stringify(found)
                );

              }catch(e){}
            }
          }
        }

      }catch(error){

        console.error(error);
      }

      return original.apply(
        this,
        arguments
      );
    }

    wrappedSelectPartner.__BAP_MULTI_WRAPPED = true;
    wrappedSelectPartner.__BAP_ORIGINAL = original;

    window.selectPartner =
      wrappedSelectPartner;

    return true;
  }

  /* ==========================================================
     PARTNER DASHBOARD
     ========================================================== */

  function installPartnerDashboard(){

    if(
      typeof window.renderPartnerDashboard !==
      'function'
    ){
      return false;
    }

    if(
      window.renderPartnerDashboard.__BAP_MULTI_WRAPPED
    ){
      return true;
    }

    const original =
      window.renderPartnerDashboard;

    function wrappedDashboard(){

      const current =
        getCurrentPartner();

      if(current){

        try{

          localStorage.setItem(
            LEGACY_KEY,
            JSON.stringify(current)
          );

        }catch(e){}
      }

      return original.apply(
        this,
        arguments
      );
    }

    wrappedDashboard.__BAP_MULTI_WRAPPED = true;
    wrappedDashboard.__BAP_ORIGINAL = original;

    window.renderPartnerDashboard =
      wrappedDashboard;

    return true;
  }

  /* ==========================================================
     ADMIN ACTIONS
     ========================================================== */

  window.BAP_adminApprovePartner =
    function(partnerId){

      const list =
        getPartners();

      const index =
        list.findIndex(
          function(p){

            return String(p.id) ===
              String(partnerId);

          }
        );

      if(index === -1){

        alert(
          'Partner not found.'
        );

        return;
      }

      list[index].verification =
        'Approved';

      list[index].approvedAt =
        new Date().toISOString();

      list[index].rejectedAt = '';

      savePartners(list);

      renderAllPartnerApplications();

      alert(
        'Partner approved successfully.'
      );
    };

  window.BAP_adminRejectPartner =
    function(partnerId){

      const list =
        getPartners();

      const index =
        list.findIndex(
          function(p){

            return String(p.id) ===
              String(partnerId);

          }
        );

      if(index === -1){

        alert(
          'Partner not found.'
        );

        return;
      }

      list[index].verification =
        'Rejected';

      list[index].rejectedAt =
        new Date().toISOString();

      savePartners(list);

      renderAllPartnerApplications();

      alert(
        'Partner rejected.'
      );
    };

  /* ==========================================================
     ADMIN HTML
     ========================================================== */

  function escapeHtml(value){

    return String(
      value === undefined ||
      value === null ?
      '' :
      value
    )
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
  }

  function partnerCard(partner){

    const id =
      escapeHtml(
        partner.id
      );

    const photo =
      partner.photo ?
      '<img src="' +
      partner.photo +
      '" style="width:95px;height:95px;' +
      'object-fit:cover;border-radius:12px;">' :
      '<div style="width:95px;height:95px;' +
      'background:#eee;border-radius:12px;' +
      'display:flex;align-items:center;' +
      'justify-content:center;">No Photo</div>';

    const selfie =
      partner.selfie ?
      '<img src="' +
      partner.selfie +
      '" style="width:95px;height:95px;' +
      'object-fit:cover;border-radius:12px;">' :
      '<div style="width:95px;height:95px;' +
      'background:#eee;border-radius:12px;' +
      'display:flex;align-items:center;' +
      'justify-content:center;">No Selfie</div>';

    const proof =
      partner.proofId ?

      '<button type="button" ' +
      'onclick="BAP_openPartnerProof(\'' +
      id +
      '\')">' +
      'Open Proof' +
      '</button>' +

      (
        partner.proofName ?
        '<div style="font-size:12px;margin-top:4px;">' +
        escapeHtml(
          partner.proofName
        ) +
        '</div>' :
        ''
      ) :

      '<span style="color:#777;">No proof</span>';

    return (

      '<div style="' +
      'border:1px solid #ddd;' +
      'border-radius:16px;' +
      'padding:16px;' +
      'margin-bottom:16px;' +
      'background:#fff;' +
      'box-shadow:0 4px 16px rgba(0,0,0,.06);' +
      '">' +

      '<div style="' +
      'display:flex;gap:16px;' +
      'flex-wrap:wrap;">' +

      '<div>' +
      photo +
      '<div style="margin-top:6px;">Profile Photo</div>' +
      '</div>' +

      '<div>' +
      selfie +
      '<div style="margin-top:6px;">Selfie</div>' +
      '</div>' +

      '<div style="flex:1;min-width:260px;">' +

      '<h3 style="margin:0 0 8px 0;">' +
      escapeHtml(
        partner.name || '-'
      ) +
      '</h3>' +

      '<div style="line-height:1.7;">' +

      '<div><b>Status:</b> ' +
      escapeHtml(
        partner.verification ||
        'Pending Review'
      ) +
      '</div>' +

      '<div><b>Age:</b> ' +
      escapeHtml(
        partner.age || '-'
      ) +
      '</div>' +

      '<div><b>Gender:</b> ' +
      escapeHtml(
        partner.gender || '-'
      ) +
      '</div>' +

      '<div><b>Mobile:</b> ' +
      escapeHtml(
        partner.mobile || '-'
      ) +
      '</div>' +

      '<div><b>Area:</b> ' +
      escapeHtml(
        partner.area || '-'
      ) +
      '</div>' +

      '<div><b>Service:</b> ' +
      escapeHtml(
        partner.service || '-'
      ) +
      '</div>' +

      '<div><b>Rate:</b> ₹' +
      escapeHtml(
        partner.rate || '-'
      ) +
      '</div>' +

      '<div><b>Availability:</b> ' +
      escapeHtml(
        partner.availability || '-'
      ) +
      '</div>' +

      '<div><b>Experience:</b> ' +
      escapeHtml(
        partner.experience || '-'
      ) +
      '</div>' +

      '<div><b>Qualification:</b> ' +
      escapeHtml(
        partner.qualification || '-'
      ) +
      '</div>' +

      '</div>' +

      '<div style="margin-top:10px;">' +
      '<b>Proof:</b> ' +
      proof +
      '</div>' +

      '<div style="' +
      'display:flex;gap:8px;' +
      'flex-wrap:wrap;' +
      'margin-top:14px;">' +

      '<button type="button" ' +
      'onclick="BAP_adminApprovePartner(\'' +
      id +
      '\')">' +
      'Approve' +
      '</button>' +

      '<button type="button" ' +
      'onclick="BAP_adminRejectPartner(\'' +
      id +
      '\')">' +
      'Reject' +
      '</button>' +

      '</div>' +

      '</div>' +

      '</div>' +

      '</div>'
    );
  }

  function renderAllPartnerApplications(){

    const box =
      byId(
        'partnerApplications'
      );

    if(!box){
      return false;
    }

    const list =
      getPartners();

    if(!list.length){

      box.innerHTML =
        '<div style="padding:20px;color:#777;">' +
        'No partner applications found.' +
        '</div>';

      return true;
    }

    box.innerHTML =
      '<div style="font-weight:700;' +
      'margin-bottom:14px;">' +
      'Total Partners: ' +
      list.length +
      '</div>' +

      list.map(
        function(partner){
          return partnerCard(
            partner
          );
        }
      ).join('');

    return true;
  }

  window.renderAllPartnerApplications =
    renderAllPartnerApplications;

  /* ==========================================================
     ADMIN RENDER HOOK
     ========================================================== */

  function installAdmin(){

    if(
      typeof window.renderAdmin !==
      'function'
    ){
      return false;
    }

    if(
      window.renderAdmin.__BAP_MULTI_ADMIN_WRAPPER
    ){
      return true;
    }

    const original =
      window.renderAdmin;

    function wrappedRenderAdmin(){

      let result;

      try{

        result =
          original.apply(
            this,
            arguments
          );

      }catch(error){

        console.error(
          'Legacy renderAdmin error',
          error
        );
      }

      setTimeout(
        renderAllPartnerApplications,
        0
      );

      setTimeout(
        renderAllPartnerApplications,
        200
      );

      setTimeout(
        renderAllPartnerApplications,
        500
      );

      return result;
    }

    wrappedRenderAdmin.__BAP_MULTI_ADMIN_WRAPPER = true;
    wrappedRenderAdmin.__BAP_ORIGINAL = original;

    window.renderAdmin =
      wrappedRenderAdmin;

    return true;
  }

  /* ==========================================================
     DEBUG HELPERS
     ========================================================== */

  window.BAP_getPartners =
    function(){
      return getPartners();
    };

  window.BAP_getCurrentPartner =
    function(){
      return getCurrentPartner();
    };

  window.BAP_setCurrentPartner =
    function(id){

      setCurrentPartner(id);

      return getCurrentPartner();
    };

  window.BAP_renderPartners =
    function(){

      return renderAllPartnerApplications();
    };

  /* ==========================================================
     INSTALL
     ========================================================== */

  function install(){

    if(installed){
      return;
    }

    installed = true;

    migratePartners();

    /*
      DOMContentLoaded fires after the complete HTML has been
      parsed, so the legacy functions from index.html already
      exist here. We hook them only once.
    */

    installFindPartners();
    installSelectPartner();
    installPartnerDashboard();
    installAdmin();

    window.partnerApply =
      multiPartnerApply;

    /*
      One small delayed refresh only.
      IMPORTANT: No MutationObserver here.
    */

    setTimeout(
      function(){

        installFindPartners();
        installSelectPartner();
        installPartnerDashboard();
        installAdmin();

        window.partnerApply =
          multiPartnerApply;

        renderAllPartnerApplications();

      },
      400
    );
  }

  if(
    document.readyState ===
    'loading'
  ){

    document.addEventListener(
      'DOMContentLoaded',
      install
    );

  }else{

    install();
  }

})();
/* ==========================================================
   BOOK A PARTNER — v4 IMAGE COMPATIBILITY FIX
   Supports old image fields:
   photoData / profilePhoto / profilePhotoData / imageData
   selfieData / selfiePhoto / selfiePhotoData
   ========================================================== */

(function(){

  'use strict';

  const PARTNER_LIST_KEY = 'bap_partner_profiles';

  function getRawPartners(){

    try{

      const data =
        JSON.parse(
          localStorage.getItem(
            PARTNER_LIST_KEY
          ) || '[]'
        );

      return Array.isArray(data)
        ? data
        : [];

    }catch(e){

      console.error(
        'v4 partner data error',
        e
      );

      return [];
    }
  }

  function firstImage(){

    for(
      let i = 0;
      i < arguments.length;
      i++
    ){

      const value =
        arguments[i];

      if(
        typeof value === 'string' &&
        value.trim()
      ){

        return value;
      }
    }

    return '';
  }

  function renderWithOldImages(){

    const box =
      document.getElementById(
        'partnerApplications'
      );

    if(!box){
      return false;
    }

    const partners =
      getRawPartners();

    if(!partners.length){
      return false;
    }

    /*
      Temporarily create the new photo/selfie fields
      from the old saved fields.

      We restore the original data immediately after
      rendering so localStorage size does not increase.
    */

    const originalJSON =
      JSON.stringify(partners);

    const tempPartners =
      partners.map(function(p){

        const copy =
          Object.assign({}, p);

        copy.photo =
          firstImage(
            p.photo,
            p.photoData,
            p.profilePhoto,
            p.profilePhotoData,
            p.profile_photo,
            p.image,
            p.imageData
          );

        copy.selfie =
          firstImage(
            p.selfie,
            p.selfieData,
            p.selfiePhoto,
            p.selfiePhotoData,
            p.selfie_photo,
            p.selfieImage,
            p.selfieImageData
          );

        return copy;
      });

    try{

      localStorage.setItem(
        PARTNER_LIST_KEY,
        JSON.stringify(
          tempPartners
        )
      );

      /*
        Call the v3 renderer already installed
        on the page.
      */

      if(
        typeof window.renderAllPartnerApplications ===
        'function'
      ){

        window.renderAllPartnerApplications();
      }

      /*
        Restore original storage so we don't duplicate
        large base64 images.
      */

      localStorage.setItem(
        PARTNER_LIST_KEY,
        originalJSON
      );

      return true;

    }catch(error){

      console.error(
        'v4 image render error',
        error
      );

      try{

        localStorage.setItem(
          PARTNER_LIST_KEY,
          originalJSON
        );

      }catch(e){}

      return false;
    }
  }

  /*
    Replace the global renderer with the v4 renderer.
  */

  const oldRenderer =
    window.renderAllPartnerApplications;

  window.renderAllPartnerApplications =
    function(){

      const box =
        document.getElementById(
          'partnerApplications'
        );

      if(!box){
        return false;
      }

      const partners =
        getRawPartners();

      if(!partners.length){

        box.innerHTML =
          '<div style="padding:20px;color:#777;">' +
          'No partner applications found.' +
          '</div>';

        return true;
      }

      const tempPartners =
        partners.map(function(p){

          const copy =
            Object.assign({}, p);

          copy.photo =
            firstImage(
              p.photo,
              p.photoData,
              p.profilePhoto,
              p.profilePhotoData,
              p.profile_photo,
              p.image,
              p.imageData
            );

          copy.selfie =
            firstImage(
              p.selfie,
              p.selfieData,
              p.selfiePhoto,
              p.selfiePhotoData,
              p.selfie_photo,
              p.selfieImage,
              p.selfieImageData
            );

          return copy;
        });

      /*
        Render temporarily through the existing v3 card
        renderer by temporarily updating storage.
      */

      const originalJSON =
        JSON.stringify(partners);

      try{

        localStorage.setItem(
          PARTNER_LIST_KEY,
          JSON.stringify(
            tempPartners
          )
        );

        if(
          typeof oldRenderer ===
          'function'
        ){

          oldRenderer();

        }else{

          /*
            Fallback renderer if the old renderer
            isn't available.
          */

          box.innerHTML =
            '<div style="font-weight:700;margin-bottom:14px;">' +
            'Total Partners: ' +
            tempPartners.length +
            '</div>' +

            tempPartners.map(
              function(p){

                const photo =
                  p.photo ?
                  '<img src="' +
                  p.photo +
                  '" style="width:95px;height:95px;object-fit:cover;border-radius:12px;">' :
                  '<div style="width:95px;height:95px;background:#eee;border-radius:12px;display:flex;align-items:center;justify-content:center;">No Photo</div>';

                const selfie =
                  p.selfie ?
                  '<img src="' +
                  p.selfie +
                  '" style="width:95px;height:95px;object-fit:cover;border-radius:12px;">' :
                  '<div style="width:95px;height:95px;background:#eee;border-radius:12px;display:flex;align-items:center;justify-content:center;">No Selfie</div>';

                return (
                  '<div style="border:1px solid #ddd;border-radius:16px;padding:16px;margin-bottom:16px;">' +

                  '<div style="display:flex;gap:16px;flex-wrap:wrap;">' +

                  '<div>' +
                  photo +
                  '<div>Profile Photo</div>' +
                  '</div>' +

                  '<div>' +
                  selfie +
                  '<div>Selfie</div>' +
                  '</div>' +

                  '<div>' +

                  '<h3>' +
                  String(p.name || '-') +
                  '</h3>' +

                  '<div><b>Status:</b> ' +
                  String(
                    p.verification ||
                    'Pending Review'
                  ) +
                  '</div>' +

                  '<div><b>Age:</b> ' +
                  String(p.age || '-') +
                  '</div>' +

                  '<div><b>Gender:</b> ' +
                  String(p.gender || '-') +
                  '</div>' +

                  '<div><b>Mobile:</b> ' +
                  String(p.mobile || '-') +
                  '</div>' +

                  '<div><b>Area:</b> ' +
                  String(p.area || '-') +
                  '</div>' +

                  '<div><b>Service:</b> ' +
                  String(p.service || '-') +
                  '</div>' +

                  '<div><b>Rate:</b> ₹' +
                  String(p.rate || '-') +
                  '</div>' +

                  '<div style="margin-top:12px;">' +

                  '<button type="button" onclick="BAP_adminApprovePartner(\'' +
                  String(p.id) +
                  '\')">' +
                  'Approve' +
                  '</button> ' +

                  '<button type="button" onclick="BAP_adminRejectPartner(\'' +
                  String(p.id) +
                  '\')">' +
                  'Reject' +
                  '</button>' +

                  '</div>' +

                  '</div>' +

                  '</div>' +

                  '</div>'
                );
              }
            ).join('');
        }

      }catch(error){

        console.error(
          'v4 renderer error',
          error
        );

      }finally{

        try{

          localStorage.setItem(
            PARTNER_LIST_KEY,
            originalJSON
          );

        }catch(e){}
      }

      return true;
    };

  /*
    Re-hook Admin so after the old admin renderer runs,
    the v4 image-compatible renderer runs once.
  */

  if(
    typeof window.renderAdmin ===
    'function' &&
    !window.renderAdmin.__BAP_V4_IMAGE_HOOK
  ){

    const previousAdmin =
      window.renderAdmin;

    function v4RenderAdmin(){

      let result;

      try{

        result =
          previousAdmin.apply(
            this,
            arguments
          );

      }catch(error){

        console.error(
          'v4 admin wrapper error',
          error
        );
      }

      setTimeout(
        function(){

          window.renderAllPartnerApplications();

        },
        100
      );

      return result;
    }

    v4RenderAdmin.__BAP_V4_IMAGE_HOOK =
      true;

    v4RenderAdmin.__BAP_V4_ORIGINAL =
      previousAdmin;

    window.renderAdmin =
      v4RenderAdmin;
  }

  /*
    Give the page a small final refresh after loading.
  */

  setTimeout(
    function(){

      if(
        document.getElementById(
          'partnerApplications'
        )
      ){

        window.renderAllPartnerApplications();
      }

    },
    800
  );

})();
/* ==========================================================
   BAP v5 — DIRECT IMAGE RENDER FIX
   Reads photoData / selfieData directly
   ========================================================== */

(function(){

  'use strict';

  function esc(v){

    return String(
      v == null ? '' : v
    )
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
  }

  function renderAdminPartnersV5(){

    const box =
      document.getElementById(
        'partnerApplications'
      );

    if(!box){
      return false;
    }

    let partners = [];

    try{

      partners =
        JSON.parse(
          localStorage.getItem(
            'bap_partner_profiles'
          ) || '[]'
        );

    }catch(e){

      partners = [];
    }

    if(!Array.isArray(partners)){
      partners = [];
    }

    box.innerHTML =
      '<div style="font-weight:700;margin-bottom:14px;">' +
      'Total Partners: ' +
      partners.length +
      '</div>';

    partners.forEach(function(p){

      const photo =
        p.photoData ||
        p.photo ||
        '';

      const selfie =
        p.selfieData ||
        p.selfie ||
        '';

      const photoHTML =
        photo ?

        '<img src="' +
        photo +
        '" style="' +
        'width:95px;' +
        'height:95px;' +
        'object-fit:cover;' +
        'border-radius:12px;' +
        'display:block;' +
        '">' :

        '<div style="' +
        'width:95px;' +
        'height:95px;' +
        'background:#eee;' +
        'border-radius:12px;' +
        'display:flex;' +
        'align-items:center;' +
        'justify-content:center;' +
        '">No Photo</div>';

      const selfieHTML =
        selfie ?

        '<img src="' +
        selfie +
        '" style="' +
        'width:95px;' +
        'height:95px;' +
        'object-fit:cover;' +
        'border-radius:12px;' +
        'display:block;' +
        '">' :

        '<div style="' +
        'width:95px;' +
        'height:95px;' +
        'background:#eee;' +
        'border-radius:12px;' +
        'display:flex;' +
        'align-items:center;' +
        'justify-content:center;' +
        '">No Selfie</div>';

      const card =
        document.createElement('div');

      card.style.cssText =
        'border:1px solid #ddd;' +
        'border-radius:16px;' +
        'padding:16px;' +
        'margin-bottom:16px;' +
        'background:#fff;' +
        'box-shadow:0 4px 16px rgba(0,0,0,.06);';

      card.innerHTML =

        '<div style="' +
        'display:flex;' +
        'gap:16px;' +
        'flex-wrap:wrap;' +
        'align-items:flex-start;' +
        '">' +

        '<div>' +
        photoHTML +
        '<div style="margin-top:6px;">' +
        'Profile Photo' +
        '</div>' +
        '</div>' +

        '<div>' +
        selfieHTML +
        '<div style="margin-top:6px;">' +
        'Selfie' +
        '</div>' +
        '</div>' +

        '<div style="' +
        'flex:1;' +
        'min-width:260px;' +
        '">' +

        '<h3 style="margin:0 0 8px 0;">' +
        esc(p.name || '-') +
        '</h3>' +

        '<div style="line-height:1.7;">' +

        '<div><b>Status:</b> ' +
        esc(
          p.verification ||
          'Pending Review'
        ) +
        '</div>' +

        '<div><b>Age:</b> ' +
        esc(p.age || '-') +
        '</div>' +

        '<div><b>Gender:</b> ' +
        esc(p.gender || '-') +
        '</div>' +

        '<div><b>Mobile:</b> ' +
        esc(p.mobile || '-') +
        '</div>' +

        '<div><b>Area:</b> ' +
        esc(p.area || '-') +
        '</div>' +

        '<div><b>Service:</b> ' +
        esc(p.service || '-') +
        '</div>' +

        '<div><b>Rate:</b> ₹' +
        esc(p.rate || '-') +
        '</div>' +

        '<div><b>Availability:</b> ' +
        esc(p.availability || '-') +
        '</div>' +

        '<div><b>Experience:</b> ' +
        esc(p.experience || '-') +
        '</div>' +

        '<div><b>Qualification:</b> ' +
        esc(p.qualification || '-') +
        '</div>' +

        '</div>' +

        '<div style="margin-top:10px;">' +

        '<b>Proof:</b> ' +

        (
          p.proofId ?

          '<button type="button" ' +
          'onclick="BAP_openPartnerProof(\'' +
          esc(p.id) +
          '\')" ' +
          'style="margin-left:6px;">' +
          'Open Proof' +
          '</button>' :

          '<span style="color:#777;">No proof</span>'
        ) +

        '</div>' +

        '<div style="margin-top:14px;">' +

        '<button type="button" ' +
        'onclick="BAP_adminApprovePartner(\'' +
        esc(p.id) +
        '\')">' +
        'Approve' +
        '</button>' +

        '<button type="button" ' +
        'onclick="BAP_adminRejectPartner(\'' +
        esc(p.id) +
        '\')" ' +
        'style="margin-left:8px;">' +
        'Reject' +
        '</button>' +

        '</div>' +

        '</div>' +

        '</div>';

      box.appendChild(card);

    });

    return true;
  }

  window.renderAllPartnerApplications =
    renderAdminPartnersV5;

  setTimeout(
    function(){
      renderAdminPartnersV5();
    },
    500
  );

})();
/* ==========================================================
   BAP v6 — FINAL ADMIN LOAD/TIMING FIX
   Re-hooks renderAdmin after main index.html loads
   ========================================================== */

(function(){

  'use strict';

  let hooked = false;
  let attempts = 0;

  function tryHookAdmin(){

    if(hooked){
      return;
    }

    if(
      typeof window.renderAdmin !==
      'function'
    ){
      return;
    }

    const original =
      window.renderAdmin;

    if(
      original.__BAP_V6_ADMIN_HOOK
    ){
      hooked = true;
      return;
    }

    function wrappedAdmin(){

      let result;

      try{

        result =
          original.apply(
            this,
            arguments
          );

      }catch(error){

        console.error(
          'BAP v6 admin error:',
          error
        );
      }

      /*
        Let the original admin UI finish rendering,
        then apply the direct photoData/selfieData renderer.
      */

      setTimeout(
        function(){

          if(
            typeof window.renderAllPartnerApplications ===
            'function'
          ){

            window.renderAllPartnerApplications();
          }

        },
        100
      );

      return result;
    }

    wrappedAdmin.__BAP_V6_ADMIN_HOOK = true;
    wrappedAdmin.__BAP_V6_ORIGINAL = original;

    window.renderAdmin =
      wrappedAdmin;

    hooked = true;

    /*
      Also render once if Admin section is already visible.
    */

    setTimeout(
      function(){

        if(
          document.getElementById(
            'partnerApplications'
          ) &&
          typeof window.renderAllPartnerApplications ===
          'function'
        ){

          window.renderAllPartnerApplications();
        }

      },
      150
    );
  }

  /*
    Main page script may define renderAdmin after this file.
    Check periodically for a short time.
    No MutationObserver, so no memory loop.
  */

  const timer =
    setInterval(
      function(){

        attempts++;

        tryHookAdmin();

        if(
          hooked ||
          attempts >= 50
        ){

          clearInterval(timer);
        }

      },
      200
    );

  /*
    Extra safe checks after page parsing/loading.
  */

  document.addEventListener(
    'DOMContentLoaded',
    function(){

      setTimeout(
        tryHookAdmin,
        100
      );

    }
  );

  window.addEventListener(
    'load',
    function(){

      setTimeout(
        tryHookAdmin,
        100
      );

    }
  );

})();
/* BAP v7 — CUSTOMER MULTI-PARTNER SEARCH FIX */
(function(){

  function getApprovedPartners(){

    try{

      const list =
        JSON.parse(
          localStorage.getItem(
            'bap_partner_profiles'
          ) || '[]'
        );

      return Array.isArray(list)
        ? list.filter(
            p =>
              String(p.verification || '')
                .toLowerCase() === 'approved'
          )
        : [];

    }catch(e){

      return [];
    }
  }

  function ageMatch(age, p){

    const a = Number(p.age || 0);

    if(age === 'Any age'){
      return true;
    }

    if(age === '21–25'){
      return a >= 21 && a <= 25;
    }

    if(age === '26–30'){
      return a >= 26 && a <= 30;
    }

    if(age === '31–35'){
      return a >= 31 && a <= 35;
    }

    if(age === '36–45'){
      return a >= 36 && a <= 45;
    }

    if(age === '46+'){
      return a >= 46;
    }

    return true;
  }

  function renderCustomerPartners(){

    const service =
      document.getElementById('svc')?.value || '';

    const age =
      document.getElementById('age')?.value || '';

    const location =
      document.getElementById('loc')?.value ||
      'Gurgaon NCR';

    const results =
      document.getElementById('results');

    if(!results){
      return;
    }

    const approved =
      getApprovedPartners();

    const list =
      approved.filter(function(p){

        const services =
          Array.isArray(p.services) &&
          p.services.length
            ? p.services
            : [p.service];

        return (
          services.includes(service) &&
          ageMatch(age,p)
        );

      });

    let html =
      '<h2>Available Partners</h2>' +
      '<p class="muted">' +
      service +
      ' • ' +
      location +
      ' • Preferred age: ' +
      age +
      '</p>' +
      '<div class="partners">';

    list.forEach(function(p){

      html +=
        '<div class="card">' +

        '<div class="partner">' +

        '<div class="avatar">' +
        String(p.name || 'P').charAt(0) +
        '</div>' +

        '<div>' +

        '<b>' +
        String(p.name || 'Partner') +
        '</b> ' +

        '<span class="verified">' +
        '✓ VERIFIED' +
        '</span>' +

        '<div class="muted">' +
        'Age ' +
        String(p.age || '-') +
        ' • ' +
        String(p.area || '-') +
        '</div>' +

        '<div class="rating">' +
        '★★★★★ ' +
        String(p.rating || 'New') +
        ' (' +
        String(p.reviews || 0) +
        ')' +
        '</div>' +

        '<span class="available">' +
        '● AVAILABLE' +
        '</span>' +

        '</div>' +

        '</div>' +

        '<div class="price">' +
        '₹' +
        String(p.rate || '-') +
        ' <small>/ hour</small>' +
        '</div>' +

        '<div>';

      const services =
        Array.isArray(p.services) &&
        p.services.length
          ? p.services
          : [p.service];

      services.forEach(function(s){

        html +=
          '<span class="pill">' +
          String(s) +
          '</span>';

      });

      html +=
        '</div>' +

        '<div class="transportBox">' +
        '🚗 <b>Transport:</b> Free up to 10 km. ' +
        'Beyond 10 km, maximum ₹150.' +
        '</div>' +

        '<button class="pink full" ' +
        'onclick="BAP_multiSelectPartner(\'' +
        String(p.name).replace(/'/g,"\\'") +
        '\')">' +
        'Request Booking' +
        '</button>' +

        '</div>';

    });

    if(!list.length){

      html +=
        '<div class="card">' +
        'No matching verified/available partners found.' +
        '</div>';
    }

    html += '</div>';

    results.innerHTML = html;
  }

  window.BAP_multiSelectPartner =
    function(name){

      const partner =
        getApprovedPartners().find(
          p =>
            String(p.name) ===
            String(name)
        );

      if(!partner){
        alert('Partner not found.');
        return;
      }

      /*
        Keep old booking flow compatible by temporarily
        placing the selected approved partner in the
        legacy key.
      */

      try{

        localStorage.setItem(
          'bap_partner_profile',
          JSON.stringify(partner)
        );

      }catch(e){}

      if(
        typeof window.selectPartner ===
        'function'
      ){

        window.selectPartner(name);
      }
    };

  window.findPartners =
    function(){

      renderCustomerPartners();

      return true;
    };

  setTimeout(
    function(){

      window.findPartners =
        window.findPartners;

    },
    300
  );

})();
/* BAP v8 — FIX ACTUAL CUSTOMER MATCH() */
(function(){

  window.match = function(){

    const service =
      document.getElementById('svc')?.value || '';

    const age =
      document.getElementById('age')?.value || '';

    const location =
      document.getElementById('loc')?.value ||
      'Gurgaon NCR';

    const results =
      document.getElementById('results');

    if(!results){
      return;
    }

    let partners = [];

    try{

      partners =
        JSON.parse(
          localStorage.getItem(
            'bap_partner_profiles'
          ) || '[]'
        );

    }catch(e){

      partners = [];
    }

    if(!Array.isArray(partners)){
      partners = [];
    }

    const approved =
      partners.filter(function(p){

        if(
          String(p.verification || '')
            .toLowerCase() !== 'approved'
        ){
          return false;
        }

        const services =
          Array.isArray(p.services) &&
          p.services.length
            ? p.services
            : [p.service];

        const serviceOK =
          services.includes(service);

        const a =
          Number(p.age || 0);

        let ageOK = true;

        if(age === '21–25'){
          ageOK = a >= 21 && a <= 25;
        }else if(age === '26–30'){
          ageOK = a >= 26 && a <= 30;
        }else if(age === '31–35'){
          ageOK = a >= 31 && a <= 35;
        }else if(age === '36–45'){
          ageOK = a >= 36 && a <= 45;
        }else if(age === '46+'){
          ageOK = a >= 46;
        }

        return serviceOK && ageOK;
      });

    let html =
      '<h2>Available Partners</h2>' +
      '<p class="muted">' +
      service +
      ' • ' +
      location +
      ' • Preferred age: ' +
      age +
      '</p>' +
      '<div class="partners">';

    approved.forEach(function(p){

      html +=
        '<div class="card">' +

        '<div class="partner">' +

        '<div class="avatar">' +
        String(p.name || 'P').charAt(0) +
        '</div>' +

        '<div>' +

        '<b>' +
        String(p.name || 'Partner') +
        '</b> ' +

        '<span class="verified">' +
        '✓ VERIFIED' +
        '</span>' +

        '<div class="muted">' +
        'Age ' +
        String(p.age || '-') +
        ' • ' +
        String(p.area || '-') +
        '</div>' +

        '<div class="rating">' +
        '★★★★★ ' +
        String(p.rating || 'New') +
        ' (' +
        String(p.reviews || 0) +
        ')' +
        '</div>' +

        '<span class="available">' +
        '● AVAILABLE' +
        '</span>' +

        '</div>' +

        '</div>' +

        '<div class="price">' +
        '₹' +
        String(p.rate || '-') +
        ' <small>/ hour</small>' +
        '</div>' +

        '<div>' +

        (
          Array.isArray(p.services)
            ? p.services
            : [p.service]
        ).map(function(s){

          return (
            '<span class="pill">' +
            String(s) +
            '</span>'
          );

        }).join('') +

        '</div>' +

        '<div class="transportBox">' +
        '🚗 <b>Transport:</b> Free up to 10 km. ' +
        'Beyond 10 km, maximum ₹150.' +
        '</div>' +

        '<button class="pink full" ' +
        'onclick="BAP_multiSelectPartner(\'' +
        String(p.name).replace(/'/g,"\\'") +
        '\')">' +
        'Request Booking' +
        '</button>' +

        '</div>';
    });

    if(!approved.length){

      html +=
        '<div class="card">' +
        'No matching verified/available partners found.' +
        '</div>';
    }

    html += '</div>';

    results.innerHTML = html;
  };

})();
/* BAP FINAL — FORCE CUSTOMER SEARCH BUTTON */

(function(){

  function runMultiPartnerSearch(){

    const service =
      document.getElementById('svc')?.value || '';

    const age =
      document.getElementById('age')?.value || '';

    const location =
      document.getElementById('loc')?.value ||
      'Gurgaon NCR';

    const results =
      document.getElementById('results');

    if(!results){
      return;
    }

    let partners = [];

    try{

      partners =
        JSON.parse(
          localStorage.getItem(
            'bap_partner_profiles'
          ) || '[]'
        );

    }catch(e){

      partners = [];
    }

    const list =
      (Array.isArray(partners) ? partners : [])
      .filter(function(p){

        if(
          String(p.verification || '')
            .toLowerCase() !== 'approved'
        ){
          return false;
        }

        const services =
          Array.isArray(p.services)
            ? p.services
            : [p.service];

        if(
          !services.includes(service)
        ){
          return false;
        }

        const a =
          Number(p.age || 0);

        if(age === '21–25'){
          return a >= 21 && a <= 25;
        }

        if(age === '26–30'){
          return a >= 26 && a <= 30;
        }

        if(age === '31–35'){
          return a >= 31 && a <= 35;
        }

        if(age === '36–45'){
          return a >= 36 && a <= 45;
        }

        if(age === '46+'){
          return a >= 46;
        }

        return true;
      });

    let html =
      '<h2>Available Partners</h2>' +
      '<p class="muted">' +
      service +
      ' • ' +
      location +
      ' • Preferred age: ' +
      age +
      '</p>' +
      '<div class="partners">';

    list.forEach(function(p){

      html +=
        '<div class="card">' +

        '<div class="partner">' +

        '<div class="avatar">' +
        String(p.name || 'P').charAt(0) +
        '</div>' +

        '<div>' +

        '<b>' +
        String(p.name || 'Partner') +
        '</b> ' +

        '<span class="verified">' +
        '✓ VERIFIED' +
        '</span>' +

        '<div class="muted">' +
        'Age ' +
        String(p.age || '-') +
        ' • ' +
        String(p.area || '-') +
        '</div>' +

        '<div class="rating">' +
        '★★★★★ ' +
        String(p.rating || 'New') +
        ' (' +
        String(p.reviews || 0) +
        ')' +
        '</div>' +

        '<span class="available">' +
        '● AVAILABLE' +
        '</span>' +

        '</div>' +

        '</div>' +

        '<div class="price">' +
        '₹' +
        String(p.rate || '-') +
        ' <small>/ hour</small>' +
        '</div>' +

        '<div>' +

        (
          Array.isArray(p.services)
            ? p.services
            : [p.service]
        ).map(function(s){

          return (
            '<span class="pill">' +
            String(s) +
            '</span>'
          );

        }).join('') +

        '</div>' +

        '<div class="transportBox">' +
        '🚗 <b>Transport:</b> Free up to 10 km. ' +
        'Beyond 10 km, maximum ₹150.' +
        '</div>' +

        '<button class="pink full" ' +
        'data-bap-partner="' +
        String(p.id || '') +
        '">' +
        'Request Booking' +
        '</button>' +

        '</div>';
    });

    if(!list.length){

      html +=
        '<div class="card">' +
        'No matching verified/available partners found.' +
        '</div>';
    }

    html += '</div>';

    results.innerHTML = html;
  }

  function installFinalSearch(){

    const buttons =
      Array.from(
        document.querySelectorAll('button')
      ).filter(function(button){

        return String(
          button.textContent || ''
        ).trim()
        .toLowerCase()
        .includes(
          'find available partners'
        );
      });

    buttons.forEach(function(button){

      button.onclick =
        function(event){

          if(event){
            event.preventDefault();
            event.stopPropagation();
          }

          runMultiPartnerSearch();
          return false;
        };
    });
  }

  if(
    document.readyState === 'loading'
  ){

    document.addEventListener(
      'DOMContentLoaded',
      function(){

        setTimeout(
          installFinalSearch,
          500
        );

      }
    );

  }else{

    setTimeout(
      installFinalSearch,
      500
    );
  }

})();
/* ==========================================================
   BAP FINAL CUSTOMER SEARCH
   One-time clean fix for multi-partner customer matching
   ========================================================== */

(function(){

  'use strict';

  const LIST_KEY = 'bap_partner_profiles';
  const CURRENT_KEY = 'bap_current_partner_id';
  const LEGACY_KEY = 'bap_partner_profile';

  function getPartners(){

    try{

      const list =
        JSON.parse(
          localStorage.getItem(LIST_KEY) || '[]'
        );

      return Array.isArray(list) ? list : [];

    }catch(e){

      return [];
    }
  }

  function normalize(value){

    return String(value || '')
      .trim()
      .toLowerCase();
  }

  function getService(){

    const el =
      document.getElementById('service') ||
      document.getElementById('svc');

    return el ? el.value : '';
  }

  function getGender(){

    const el =
      document.getElementById(
        'customerGenderPreference'
      );

    return el ? el.value : '';
  }

  function getAge(){

    const el =
      document.getElementById('age');

    return el ? el.value : '';
  }

  function ageMatches(age, partnerAge){

    const a =
      Number(partnerAge || 0);

    if(age === 'Any age' || !age){
      return true;
    }

    if(age === '21–25'){
      return a >= 21 && a <= 25;
    }

    if(age === '26–30'){
      return a >= 26 && a <= 30;
    }

    if(age === '31–35'){
      return a >= 31 && a <= 35;
    }

    if(age === '36–45'){
      return a >= 36 && a <= 45;
    }

    if(age === '46+'){
      return a >= 46;
    }

    return true;
  }

  function genderMatches(gender, partnerGender){

    const wanted =
      normalize(gender)
        .replace(' partner','');

    if(
      !wanted ||
      wanted === 'any' ||
      wanted === 'all'
    ){
      return true;
    }

    const actual =
      normalize(partnerGender);

    return actual.includes(wanted);
  }

  function serviceMatches(service, partner){

    const services =
      Array.isArray(partner.services) &&
      partner.services.length
        ? partner.services
        : [partner.service];

    const wanted =
      normalize(service);

    return services.some(function(s){

      return normalize(s) === wanted;

    });
  }

  function getApprovedMatches(){

    const service =
      getService();

    const gender =
      getGender();

    const age =
      getAge();

    return getPartners()
      .filter(function(partner){

        if(
          normalize(
            partner.verification
          ) !== 'approved'
        ){
          return false;
        }

        if(
          partner.active === false
        ){
          return false;
        }

        if(
          !serviceMatches(
            service,
            partner
          )
        ){
          return false;
        }

        if(
          !genderMatches(
            gender,
            partner.gender
          )
        ){
          return false;
        }

        if(
          !ageMatches(
            age,
            partner.age
          )
        ){
          return false;
        }

        return true;
      });
  }

  function escapeHtml(value){

    return String(
      value == null ? '' : value
    )
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');

  }

  function renderResults(){

    const results =
      document.getElementById(
        'results'
      );

    if(!results){
      return;
    }

    const service =
      getService();

    const gender =
      getGender();

    const age =
      getAge();

    const matches =
      getApprovedMatches();

    let html =

      '<h2>Available Partners</h2>' +

      '<p class="muted">' +
      escapeHtml(service) +
      ' • ' +
      escapeHtml(gender) +
      ' • Preferred age: ' +
      escapeHtml(age) +
      '</p>';

    if(!matches.length){

      html +=
        '<div class="card">' +
        'No matching verified/available partners found.' +
        '</div>';

      results.innerHTML =
        html;

      return;
    }

    html +=
      '<div class="partners">';

    matches.forEach(function(p){

      const photo =
        p.photo ||
        p.photoData ||
        '';

      const imageHTML =
        photo ?

        '<img src="' +
        photo +
        '" alt="' +
        escapeHtml(p.name) +
        '" style="' +
        'width:82px;' +
        'height:82px;' +
        'object-fit:cover;' +
        'border-radius:12px;' +
        'display:block;' +
        '">' :

        '<div class="avatar">' +
        escapeHtml(
          String(
            p.name || 'P'
          ).charAt(0)
        ) +
        '</div>';

      const services =
        Array.isArray(p.services) &&
        p.services.length
          ? p.services
          : [p.service];

      html +=

        '<div class="card">' +

        '<div style="' +
        'display:flex;' +
        'gap:14px;' +
        'align-items:center;' +
        'margin-bottom:12px;' +
        '">' +

        imageHTML +

        '<div>' +

        '<div style="font-size:18px;font-weight:800;">' +
        escapeHtml(
          p.name || 'Partner'
        ) +
        ' ' +

        '<span class="verified">' +
        '✓ VERIFIED' +
        '</span>' +

        '</div>' +

        '<div class="muted">' +
        'Age ' +
        escapeHtml(p.age) +
        ' • ' +
        escapeHtml(p.area || p.city || '-') +
        '</div>' +

        '<div class="rating">' +
        '★★★★★ ' +
        escapeHtml(p.rating || 'New') +
        ' (' +
        escapeHtml(p.reviews || 0) +
        ')' +
        '</div>' +

        '</div>' +

        '</div>' +

        '<div class="price">' +
        '₹' +
        escapeHtml(p.rate || '-') +
        ' <small>/ hour</small>' +
        '</div>' +

        '<div>';

      services.forEach(function(s){

        html +=
          '<span class="pill">' +
          escapeHtml(s) +
          '</span>';

      });

      html +=

        '</div>' +

        '<div class="transportBox">' +
        '🚗 <b>Transport:</b> Free up to 10 km. ' +
        'Beyond 10 km, maximum ₹150.' +
        '</div>' +

        '<button ' +
        'class="pink full" ' +
        'data-bap-partner-id="' +
        escapeHtml(p.id) +
        '">' +
        'Request Booking' +
        '</button>' +

        '</div>';

    });

    html +=
      '</div>';

    results.innerHTML =
      html;
  }

  function selectPartner(partnerId){

    const partner =
      getPartners().find(function(p){

        return String(p.id) ===
          String(partnerId);

      });

    if(!partner){
      alert('Partner not found.');
      return;
    }

    try{

      localStorage.setItem(
        CURRENT_KEY,
        String(partner.id)
      );

      localStorage.setItem(
        LEGACY_KEY,
        JSON.stringify(partner)
      );

    }catch(e){}

    if(
      typeof window.selectPartner ===
      'function'
    ){

      try{

        window.selectPartner(
          partner.name
        );

        return;

      }catch(e){

        console.error(e);
      }
    }

    if(
      typeof window.go ===
      'function'
    ){

      window.go('bookings');

    }

  }

  function install(){

    if(
      document.body.dataset
        .bapFinalSearchInstalled === '1'
    ){
      return;
    }

    document.body.dataset
      .bapFinalSearchInstalled = '1';

    /*
      Capture phase is intentional.
      It stops the old inline onclick="match()"
      before the old function can overwrite results.
    */

    document.addEventListener(
      'click',
      function(event){

        const button =
          event.target.closest(
            'button'
          );

        if(!button){
          return;
        }

        const text =
          String(
            button.textContent || ''
          ).trim();

        if(
          text ===
          'Find Available Partners'
        ){

          event.preventDefault();
          event.stopImmediatePropagation();

          renderResults();

          return false;
        }

        const partnerId =
          button.getAttribute(
            'data-bap-partner-id'
          );

        if(partnerId){

          event.preventDefault();
          event.stopImmediatePropagation();

          selectPartner(
            partnerId
          );

          return false;
        }

      },
      true
    );

  }

  if(
    document.readyState ===
    'loading'
  ){

    document.addEventListener(
      'DOMContentLoaded',
      install,
      {once:true}
    );

  }else{

    install();
  }

})();
/* =========================================================
   BAP REAL PARTNER BACKEND
   Supabase Auth + Partner Application + Storage
   ========================================================= */

(function(){

  'use strict';

  const SUPABASE_URL =
    'https://wmawmdwjibvlqsugthhe.supabase.co';

  const SUPABASE_KEY =
    'sb_publishable_mm_Qov_zXz5tUrlifTj_Ww_rD53yRmI';

  let sbClient = null;
  let sbLoader = null;
  let fieldTimer = null;

  function loadSupabase(){

    if(window.supabase &&
       typeof window.supabase.createClient === 'function'){

      if(!sbClient){
        sbClient =
          window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
          );
      }

      return Promise.resolve(sbClient);
    }

    if(sbLoader){
      return sbLoader;
    }

    sbLoader = new Promise(function(resolve,reject){

      const existing =
        document.querySelector(
          'script[data-bap-supabase="1"]'
        );

      if(existing){
        existing.addEventListener(
          'load',
          function(){

            sbClient =
              window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_KEY
              );

            resolve(sbClient);
          }
        );

        existing.addEventListener(
          'error',
          reject
        );

        return;
      }

      const script =
        document.createElement('script');

      script.src =
        'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

      script.async = true;

      script.dataset.bapSupabase = '1';

      script.onload = function(){

        try{

          sbClient =
            window.supabase.createClient(
              SUPABASE_URL,
              SUPABASE_KEY
            );

          resolve(sbClient);

        }catch(error){

          reject(error);
        }
      };

      script.onerror = reject;

      document.head.appendChild(script);

    });

    return sbLoader;
  }

  function el(id){
    return document.getElementById(id);
  }

  function val(id){
    return String(
      el(id)?.value || ''
    ).trim();
  }

  function makeId(prefix){
    if(
      window.crypto &&
      typeof window.crypto.randomUUID === 'function'
    ){
      return prefix + '-' +
        window.crypto.randomUUID();
    }

    return prefix + '-' +
      Date.now() + '-' +
      Math.random()
        .toString(36)
        .slice(2);
  }

  function escapeHTML(value){

    return String(
      value == null ? '' : value
    )
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
  }

  function fileToDataURL(file){

    return new Promise(function(resolve,reject){

      const reader =
        new FileReader();

      reader.onload =
        function(){
          resolve(
            String(reader.result || '')
          );
        };

      reader.onerror =
        reject;

      reader.readAsDataURL(file);

    });
  }

  function compressForCache(file){

    return new Promise(function(resolve){

      if(!file ||
         !file.type.startsWith('image/')){

        resolve(file);
        return;
      }

      const reader =
        new FileReader();

      reader.onload = function(){

        const img =
          new Image();

        img.onload = function(){

          const max =
            900;

          let width =
            img.width;

          let height =
            img.height;

          if(width > max){

            height =
              Math.round(
                height * max / width
              );

            width = max;
          }

          const canvas =
            document.createElement(
              'canvas'
            );

          canvas.width = width;
          canvas.height = height;

          const ctx =
            canvas.getContext('2d');

          ctx.drawImage(
            img,
            0,
            0,
            width,
            height
          );

          canvas.toBlob(
            function(blob){

              resolve(
                blob || file
              );
            },
            'image/jpeg',
            0.75
          );

        };

        img.onerror =
          function(){
            resolve(file);
          };

        img.src =
          String(reader.result || '');
      };

      reader.onerror =
        function(){
          resolve(file);
        };

      reader.readAsDataURL(file);

    });
  }

  async function uploadFile(
    client,
    bucket,
    file,
    userId
  ){

    if(!file){
      return '';
    }

    const ext =
      (
        file.name.split('.').pop() ||
        'bin'
      )
      .toLowerCase();

    const path =
      userId +
      '/' +
      makeId('file') +
      '.' +
      ext;

    const result =
      await client.storage
        .from(bucket)
        .upload(
          path,
          file,
          {
            cacheControl:'3600',
            upsert:false,
            contentType:file.type
          }
        );

    if(result.error){
      throw result.error;
    }

    return path;
  }

  function installPartnerFields(){

    const join =
      document.getElementById('join');

    if(!join){
      return false;
    }

    if(
      document.getElementById(
        'bapPartnerEmail'
      )
    ){
      return true;
    }

    const button =
      Array.from(
        join.querySelectorAll(
          'button'
        )
      ).find(function(btn){

        return (
          String(
            btn.getAttribute(
              'onclick'
            ) || ''
          ).includes(
            'partnerApply'
          )
        );
      });

    if(!button){
      return false;
    }

    const box =
      document.createElement('div');

    box.id =
      'bapRealPartnerAccountFields';

    box.style.marginTop =
      '14px';

    box.innerHTML =

      '<div class="notice">' +
      '<b>Partner Account</b><br>' +
      'Create your secure login account. ' +
      'Your profile will remain pending until manual verification call approval.' +
      '</div>' +

      '<label style="display:block;margin-top:10px;">' +
      'Email Address' +
      '</label>' +

      '<input ' +
      'id="bapPartnerEmail" ' +
      'type="email" ' +
      'placeholder="your@email.com" ' +
      'autocomplete="email" ' +
      'style="width:100%;padding:11px;margin-top:5px;"' +
      '>' +

      '<label style="display:block;margin-top:10px;">' +
      'Password' +
      '</label>' +

      '<input ' +
      'id="bapPartnerPassword" ' +
      'type="password" ' +
      'placeholder="Minimum 8 characters" ' +
      'autocomplete="new-password" ' +
      'style="width:100%;padding:11px;margin-top:5px;"' +
      '>' +

      '<label style="display:block;margin-top:10px;">' +
      '<input id="bapPartnerTerms" type="checkbox">' +
      ' I accept Book A Partner terms and verification process.' +
      '</label>' +

      '<label style="display:block;margin-top:8px;">' +
      '<input id="bapPartnerSafety" type="checkbox">' +
      ' I agree to follow the platform safety policy.' +
      '</label>';

    button.parentNode.insertBefore(
      box,
      button
    );

    return true;
  }

  async function realPartnerApply(){

    const name =
      val('partnerName');

    const age =
      Number(
        el('partnerAge')?.value || 0
      );

    const mobile =
      val('partnerMobile');

    const area =
      val('partnerArea');

    const service =
      val('partnerService');

    const rate =
      Number(
        el('partnerRate')?.value || 0
      );

    const availability =
      val('partnerAvailability');

    const gender =
      val('partnerGender') ||
      'Any';

    const photo =
      el('partnerPhoto')
        ?.files?.[0] || null;

    const selfie =
      el('partnerSelfie')
        ?.files?.[0] || null;

    const email =
      val('bapPartnerEmail');

    const password =
      String(
        el('bapPartnerPassword')
          ?.value || ''
      );

    const terms =
      !!el('bapPartnerTerms')
        ?.checked;

    const safety =
      !!el('bapPartnerSafety')
        ?.checked;

    if(!name){
      alert('Please enter your full name.');
      return;
    }

    if(!age || age < 18){
      alert('Partner must be 18+.');
      return;
    }

    if(mobile.length !== 10){
      alert('Please enter a valid 10 digit mobile number.');
      return;
    }

    if(!area){
      alert('Please enter your city / area.');
      return;
    }

    if(!service){
      alert('Please select a service.');
      return;
    }

    if(!rate || rate <= 0){
      alert('Please enter your hourly rate.');
      return;
    }

    if(!availability){
      alert('Please select availability.');
      return;
    }

    if(!photo){
      alert('Please upload your profile photo.');
      return;
    }

    if(!selfie){
      alert('Please upload your verification selfie.');
      return;
    }

    if(!email ||
       !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){

      alert('Please enter a valid email address.');
      return;
    }

    if(password.length < 8){

      alert(
        'Password must be at least 8 characters.'
      );

      return;
    }

    if(!terms){

      alert(
        'Please accept the platform terms.'
      );

      return;
    }

    if(!safety){

      alert(
        'Please accept the safety policy.'
      );

      return;
    }

    const category =
      window.BAP_getCategory
        ? window.BAP_getCategory(
            service
          )
        : null;

    let experienceYears = null;
    let experienceDetails = '';
    let qualification = '';
    let proof = null;

    if(
      category &&
      category.type === 'specialized'
    ){

      experienceYears =
        Number(
          el(
            'partnerExperienceYears'
          )?.value || 0
        );

      experienceDetails =
        val(
          'partnerExperienceDetails'
        );

      qualification =
        val(
          'partnerQualification'
        );

      proof =
        el(
          'partnerExperienceProof'
        )?.files?.[0] || null;

      if(
        !Number.isFinite(
          experienceYears
        ) ||
        experienceYears < 0
      ){

        alert(
          'Please enter your relevant experience.'
        );

        return;
      }

      if(!experienceDetails){

        alert(
          'Please describe your relevant experience.'
        );

        return;
      }

      if(
        category.qualificationRequired &&
        !qualification
      ){

        alert(
          'Please enter your qualification/certification.'
        );

        return;
      }

      if(
        category.qualificationRequired &&
        !proof
      ){

        alert(
          'Please upload your qualification/certificate proof.'
        );

        return;
      }

    }

    if(
      category &&
      (
        rate < Number(category.minRate) ||
        rate > Number(category.maxRate)
      )
    ){

      alert(
        'Rate should be between ₹' +
        category.minRate +
        ' and ₹' +
        category.maxRate +
        ' per hour.'
      );

      return;
    }

    const submitButton =
      Array.from(
        document.querySelectorAll(
          '#join button'
        )
      ).find(function(btn){

        return String(
          btn.getAttribute(
            'onclick'
          ) || ''
        ).includes(
          'partnerApply'
        );

      });

    if(submitButton){

      submitButton.disabled =
        true;

      submitButton.textContent =
        'Creating Partner Account...';
    }

    try{

      const client =
        await loadSupabase();

      let sessionResult =
        await client.auth.getSession();

      let session =
        sessionResult
          ?.data
          ?.session || null;

      let user =
        session
          ?.user || null;

      if(!user){

        const signup =
          await client.auth.signUp({
            email:email,
            password:password,
            options:{
              data:{
                role:'partner',
                full_name:name,
                mobile:mobile
              }
            }
          });

        if(signup.error){
          throw signup.error;
        }

        user =
          signup.data?.user || null;

        session =
          signup.data?.session || null;

        if(!user){

          throw new Error(
            'Account could not be created.'
          );
        }

        if(!session){

          throw new Error(
            'Email confirmation is still enabled. Please turn Confirm email OFF in Supabase Auth settings for this MVP.'
          );
        }
      }

      const profileResult =
        await client
          .from('user_profiles')
          .upsert(
            {
              id:user.id,
              full_name:name,
              phone:mobile,
              city:area,
              role:'partner'
            },
            {
              onConflict:'id'
            }
          );

      if(profileResult.error){
        throw profileResult.error;
      }

      const photoPath =
        await uploadFile(
          client,
          'partner-photos',
          photo,
          user.id
        );

      const selfiePath =
        await uploadFile(
          client,
          'partner-selfies',
          selfie,
          user.id
        );

      let proofPath = '';

      if(proof){

        proofPath =
          await uploadFile(
            client,
            'partner-proofs',
            proof,
            user.id
          );
      }

      const application =
        await client
          .from('partner_applications')
          .insert(
            {
              user_id:user.id,
              full_name:name,
              age:age,
              gender:gender,
              mobile:mobile,
              city:area,
              area:area,
              services:[service],
              hourly_rate:rate,
              availability:availability,
              experience:
                experienceDetails ||
                (
                  experienceYears != null
                    ? experienceYears + ' years'
                    : ''
                ),
              qualification:qualification,

              profile_photo_path:
                photoPath,

              selfie_path:
                selfiePath,

              proof_path:
                proofPath,

              verification_status:
                'call_pending',

              verification_call_completed:
                false,

              terms_accepted:
                true,

              safety_accepted:
                true
            }
          )
          .select()
          .single();

      if(application.error){
        throw application.error;
      }

      /*
        Temporary UI cache only.
        Supabase remains the real backend record.
      */

      let photoCache = '';
      let selfieCache = '';

      try{

        const compressedPhoto =
          await compressForCache(
            photo
          );

        const compressedSelfie =
          await compressForCache(
            selfie
          );

        photoCache =
          await fileToDataURL(
            compressedPhoto
          );

        selfieCache =
          await fileToDataURL(
            compressedSelfie
          );

      }catch(cacheError){

        console.warn(
          'Image cache warning:',
          cacheError
        );
      }

      let localList = [];

      try{

        localList =
          JSON.parse(
            localStorage.getItem(
              'bap_partner_profiles'
            ) || '[]'
          );

        if(
          !Array.isArray(localList)
        ){
          localList = [];
        }

      }catch(e){

        localList = [];
      }

      const localPartner = {

        id:
          'sb-' +
          application.data.id,

        supabaseApplicationId:
          application.data.id,

        supabaseUserId:
          user.id,

        name:name,

        age:age,

        mobile:mobile,

        area:area,

        service:service,

        services:[service],

        rate:rate,

        availability:availability,

        gender:gender,

        verification:
          'Pending Review',

        backendVerificationStatus:
          'call_pending',

        verificationNote:
          'Supabase application received. Verification call pending.',

        photoName:
          photo.name,

        photoData:
          photoCache,

        selfieName:
          selfie.name,

        selfieData:
          selfieCache,

        experienceRequired:
          category?.type === 'specialized',

        experienceYears:
          experienceYears,

        experienceDetails:
          experienceDetails,

        qualification:
          qualification,

        experienceProofName:
          proof?.name || '',

        backendProfilePhotoPath:
          photoPath,

        backendSelfiePath:
          selfiePath,

        backendProofPath:
          proofPath

      };

      localList =
        localList.filter(function(p){

          return String(
            p.supabaseApplicationId || ''
          ) !==
          String(
            application.data.id
          );

        });

      localList.push(
        localPartner
      );

      localStorage.setItem(
        'bap_partner_profiles',
        JSON.stringify(localList)
      );

      localStorage.setItem(
        'bap_current_partner_id',
        localPartner.id
      );

      alert(
        'Application submitted successfully. Your account and application are saved securely. Verification call is pending.'
      );

      if(
        typeof window.go ===
        'function'
      ){

        window.go(
          'partnerDashboard'
        );

      }

      if(
        typeof window.renderAllPartnerApplications ===
        'function'
      ){

        setTimeout(
          window.renderAllPartnerApplications,
          300
        );

      }

    }catch(error){

      console.error(
        'BAP Supabase partner signup error:',
        error
      );

      alert(
        'Could not submit application: ' +
        String(
          error.message ||
          error
        )
      );

    }finally{

      if(submitButton){

        submitButton.disabled =
          false;

        submitButton.textContent =
          'Create Partner Profile';

      }

    }
  }

  function interceptPartnerButton(){

    document.addEventListener(
      'click',
      function(event){

        const button =
          event.target.closest(
            'button'
          );

        if(!button){
          return;
        }

        const join =
          document.getElementById(
            'join'
          );

        if(
          !join ||
          !join.contains(button)
        ){
          return;
        }

        const onclick =
          String(
            button.getAttribute(
              'onclick'
            ) || ''
          );

        if(
          onclick.includes(
            'partnerApply'
          )
        ){
          /*
            The live Supabase adapter owns partnerApply in production.
            Do not let this legacy capture-phase interceptor swallow the
            click before the live handler can run.
          */
          if(window.__BAP_LIVE_PARTNER_APPLY_GUARD){
            return;
          }

          event.preventDefault();
          event.stopImmediatePropagation();
          realPartnerApply();
          return false;
        }

      },
      true
    );
  }

  function start(){

    installPartnerFields();

    interceptPartnerButton();

    fieldTimer =
      setInterval(
        function(){

          installPartnerFields();

        },
        1000
      );

    setTimeout(
      function(){

        clearInterval(
          fieldTimer
        );

      },
      15000
    );
  }

  if(
    document.readyState ===
    'loading'
  ){

    document.addEventListener(
      'DOMContentLoaded',
      start,
      {once:true}
    );

  }else{

    start();

  }

})();

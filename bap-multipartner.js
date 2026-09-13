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

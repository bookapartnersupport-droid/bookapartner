/* ==========================================================
   BOOK A PARTNER — MULTI PARTNER SYSTEM v2
   ----------------------------------------------------------
   Converts the prototype from one partner record to an array
   of partner profiles while keeping old localStorage keys
   working for compatibility.

   v2 fixes:
   - Multi-partner storage
   - Admin renders ALL partners
   - Admin hook reinforced after main page script loads
   - Customer partner search uses all approved partners
   - Selected/current partner support
   - Partner dashboard filtering
   - Proof document support
   - Repeated hook reinforcement
   - MutationObserver for Admin re-render
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
  let currentAdminPartnerId = null;

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

    list = list.map(function(p){
      if(!p.id){
        p.id = uid('partner');
      }
      return p;
    });

    localStorage.setItem(PARTNER_LIST_KEY, JSON.stringify(list));

    return list;
  }

  function savePartners(list){
    localStorage.setItem(PARTNER_LIST_KEY, JSON.stringify(list));
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
      localStorage.setItem(CURRENT_KEY, String(id));
    }else{
      localStorage.removeItem(CURRENT_KEY);
    }
  }

  function getCurrentPartner(){
    const id = getCurrentPartnerId();

    if(id){
      const p = findPartner(id);
      if(p){
        return p;
      }
    }

    const list = getPartners();

    if(list.length){
      return list[list.length - 1];
    }

    return null;
  }

  /* ----------------------------------------------------------
     MIGRATION
     ---------------------------------------------------------- */

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
      const alreadyExists = list.some(function(p){
        if(legacy.id && p.id){
          return String(p.id) === String(legacy.id);
        }

        return (
          String(p.mobile || '') === String(legacy.mobile || '') &&
          String(p.name || '').trim().toLowerCase() ===
          String(legacy.name || '').trim().toLowerCase()
        );
      });

      if(!alreadyExists){
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

    if(!getCurrentPartnerId() && list.length){
      setCurrentPartner(list[list.length - 1].id);
    }

    return list;
  }

  /* ----------------------------------------------------------
     INDEXED DB FOR PROOF DOCUMENTS
     ---------------------------------------------------------- */

  function openProofDB(){
    return new Promise(function(resolve, reject){

      if(!window.indexedDB){
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function(event){
        const db = event.target.result;

        if(!db.objectStoreNames.contains(DOC_STORE)){
          db.createObjectStore(DOC_STORE, {
            keyPath: 'id'
          });
        }
      };

      request.onsuccess = function(event){
        resolve(event.target.result);
      };

      request.onerror = function(){
        reject(request.error || new Error('IndexedDB error'));
      };
    });
  }

  function saveProofDocument(file){
    return new Promise(function(resolve, reject){

      if(!file){
        resolve(null);
        return;
      }

      openProofDB().then(function(db){

        const id = uid('proof');

        const tx = db.transaction(
          DOC_STORE,
          'readwrite'
        );

        const store = tx.objectStore(DOC_STORE);

        store.put({
          id: id,
          name: file.name || 'proof',
          type: file.type || 'application/octet-stream',
          blob: file
        });

        tx.oncomplete = function(){
          resolve({
            id: id,
            name: file.name || 'proof'
          });
        };

        tx.onerror = function(){
          reject(
            tx.error ||
            new Error('Unable to save proof document')
          );
        };

      }).catch(reject);
    });
  }

  function readProofDocument(id){
    return new Promise(function(resolve, reject){

      if(!id){
        reject(new Error('Proof id missing'));
        return;
      }

      openProofDB().then(function(db){

        const tx = db.transaction(
          DOC_STORE,
          'readonly'
        );

        const store = tx.objectStore(DOC_STORE);
        const request = store.get(id);

        request.onsuccess = function(){
          resolve(request.result || null);
        };

        request.onerror = function(){
          reject(
            request.error ||
            new Error('Unable to read proof')
          );
        };

      }).catch(reject);
    });
  }

  function deleteProofDocument(id){
    if(!id){
      return Promise.resolve();
    }

    return openProofDB().then(function(db){

      return new Promise(function(resolve, reject){

        const tx = db.transaction(
          DOC_STORE,
          'readwrite'
        );

        tx.objectStore(DOC_STORE).delete(id);

        tx.oncomplete = function(){
          resolve();
        };

        tx.onerror = function(){
          reject(tx.error);
        };
      });

    });
  }

  window.BAP_openPartnerProof = function(partnerId){
    const partner = findPartner(partnerId);

    if(!partner){
      alert('Partner record not found.');
      return;
    }

    const proofId =
      partner.proofId ||
      partner.qualificationProofId ||
      partner.documentId;

    if(!proofId){
      alert('No proof document available for this partner.');
      return;
    }

    readProofDocument(proofId)
      .then(function(doc){

        if(!doc || !doc.blob){
          alert('Proof document not found.');
          return;
        }

        const url = URL.createObjectURL(doc.blob);

        const win = window.open(
          url,
          '_blank'
        );

        if(!win){
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener';
          a.click();
        }

        setTimeout(function(){
          URL.revokeObjectURL(url);
        }, 60000);

      })
      .catch(function(err){
        console.error(err);
        alert('Unable to open proof document.');
      });
  };

  /* ----------------------------------------------------------
     FILE HELPERS
     ---------------------------------------------------------- */

  function fileToDataURL(file){
    return new Promise(function(resolve, reject){

      if(!file){
        resolve('');
        return;
      }

      const reader = new FileReader();

      reader.onload = function(){
        resolve(reader.result || '');
      };

      reader.onerror = function(){
        reject(
          reader.error ||
          new Error('Unable to read file')
        );
      };

      reader.readAsDataURL(file);
    });
  }

  function compressImage(file, maxSize, quality){
    return new Promise(function(resolve, reject){

      if(!file){
        resolve('');
        return;
      }

      if(!file.type || file.type.indexOf('image/') !== 0){
        fileToDataURL(file)
          .then(resolve)
          .catch(reject);
        return;
      }

      const reader = new FileReader();

      reader.onload = function(){
        const img = new Image();

        img.onload = function(){

          let width = img.width || maxSize;
          let height = img.height || maxSize;

          if(width > height && width > maxSize){
            height = Math.round(
              height * maxSize / width
            );
            width = maxSize;
          }else if(height > maxSize){
            width = Math.round(
              width * maxSize / height
            );
            height = maxSize;
          }

          const canvas = document.createElement('canvas');

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');

          if(!ctx){
            resolve(reader.result || '');
            return;
          }

          ctx.drawImage(
            img,
            0,
            0,
            width,
            height
          );

          let data = '';

          try{
            data = canvas.toDataURL(
              'image/jpeg',
              quality
            );
          }catch(e){
            data = reader.result || '';
          }

          resolve(data);
        };

        img.onerror = function(){
          resolve(reader.result || '');
        };

        img.src = reader.result;
      };

      reader.onerror = function(){
        reject(
          reader.error ||
          new Error('Unable to compress image')
        );
      };

      reader.readAsDataURL(file);
    });
  }

  /* ----------------------------------------------------------
     SPECIALIZED SERVICES
     ---------------------------------------------------------- */

  function getSpecializedServices(){
    return [
      'Elder Care / Senior Companion',
      'Medical Assistance',
      'Fitness / Walking Partner',
      'Professional Networking',
      'Technical Assistance',
      'Special Event Support'
    ];
  }

  function isSpecializedService(service){
    return getSpecializedServices().some(function(s){
      return String(s).trim().toLowerCase() ===
             String(service || '').trim().toLowerCase();
    });
  }

  function validateSpecializedPartnerData(data){
    if(!isSpecializedService(data.service)){
      return true;
    }

    const exp =
      String(data.experience || '').trim();

    const qual =
      String(data.qualification || '').trim();

    if(!exp && !qual){
      alert(
        'This service requires relevant experience or qualification details.'
      );
      return false;
    }

    if(
      data.proofRequired &&
      !data.proofFile &&
      !data.proofId
    ){
      alert(
        'Please upload the required experience/qualification proof.'
      );
      return false;
    }

    return true;
  }

  /* ----------------------------------------------------------
     GET FORM VALUE HELPERS
     ---------------------------------------------------------- */

  function val(id){
    const el = byId(id);
    return el ? String(el.value || '').trim() : '';
  }

  function checked(id){
    const el = byId(id);
    return !!(el && el.checked);
  }

  function firstExisting(ids){
    for(let i=0;i<ids.length;i++){
      const el = byId(ids[i]);

      if(el){
        return String(
          el.value ||
          el.textContent ||
          ''
        ).trim();
      }
    }

    return '';
  }

  function getPartnerService(){
    const ids = [
      'partnerService',
      'pService',
      'servicePartner',
      'partnerCategory',
      'partner_service',
      'service'
    ];

    const value = firstExisting(ids);

    if(value){
      return value;
    }

    const select = document.querySelector(
      'select[id*="service" i]'
    );

    if(select){
      return String(
        select.value || ''
      ).trim();
    }

    return '';
  }

  function getPartnerGender(){
    const ids = [
      'partnerGender',
      'pGender',
      'genderPartner',
      'partner_gender'
    ];

    const value = firstExisting(ids);

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
      String(radio.value || '').trim() :
      '';
  }

  /* ----------------------------------------------------------
     MULTI PARTNER APPLY
     ---------------------------------------------------------- */

  async function multiPartnerApply(){

    try{

      const name =
        firstExisting([
          'partnerName',
          'pName',
          'partner_name',
          'namePartner'
        ]);

      const age =
        firstExisting([
          'partnerAge',
          'pAge',
          'partner_age',
          'agePartner'
        ]);

      const mobile =
        firstExisting([
          'partnerMobile',
          'pMobile',
          'partner_mobile',
          'mobilePartner'
        ]);

      const area =
        firstExisting([
          'partnerArea',
          'pArea',
          'partnerLocation',
          'partner_location',
          'areaPartner'
        ]);

      const service =
        getPartnerService();

      const rate =
        firstExisting([
          'partnerRate',
          'pRate',
          'hourlyRate',
          'partner_rate',
          'ratePartner'
        ]);

      const availability =
        firstExisting([
          'partnerAvailability',
          'pAvailability',
          'availabilityPartner',
          'partner_availability'
        ]);

      const gender =
        getPartnerGender();

      const experience =
        firstExisting([
          'partnerExperience',
          'pExperience',
          'experience',
          'partner_experience'
        ]);

      const qualification =
        firstExisting([
          'partnerQualification',
          'pQualification',
          'qualification',
          'partner_qualification'
        ]);

      const proofRequired =
        isSpecializedService(service);

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
        alert('Please enter partner name.');
        return;
      }

      if(!age){
        alert('Please enter partner age.');
        return;
      }

      if(!mobile){
        alert('Please enter mobile number.');
        return;
      }

      if(!service){
        alert('Please select a service.');
        return;
      }

      const ageNum = Number(age);

      if(
        !Number.isFinite(ageNum) ||
        ageNum < 18 ||
        ageNum > 80
      ){
        alert('Partner age must be between 18 and 80.');
        return;
      }

      const proofFile =
        proofInput &&
        proofInput.files &&
        proofInput.files[0] ?
        proofInput.files[0] :
        null;

      const specializedOk =
        validateSpecializedPartnerData({
          service: service,
          experience: experience,
          qualification: qualification,
          proofRequired: proofRequired,
          proofFile: proofFile
        });

      if(!specializedOk){
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
        }catch(err){
          console.error(
            'Proof save failed',
            err
          );

          alert(
            'Proof document could not be saved. Please try again.'
          );

          return;
        }
      }

      const partner = {
        id: uid('partner'),

        name: name,
        age: ageNum,
        gender: gender,

        mobile: mobile,
        area: area,

        service: service,
        services: [service],

        rate: rate,
        availability: availability,

        experience: experience,
        qualification: qualification,

        proofRequired: proofRequired,

        proofId:
          proofMeta ?
          proofMeta.id :
          '',

        proofName:
          proofMeta ?
          proofMeta.name :
          '',

        verification: 'Pending Review',

        photo: photo || '',
        selfie: selfie || '',

        rating: 'New',
        reviews: 0,

        createdAt:
          new Date().toISOString(),

        approvedAt: '',
        rejectedAt: '',

        active: true
      };

      const list = getPartners();

      list.push(partner);

      savePartners(list);

      setCurrentPartner(partner.id);

      /* Compatibility: latest partner remains available
         to older single-partner portions of the page. */
      try{
        localStorage.setItem(
          LEGACY_KEY,
          JSON.stringify(partner)
        );
      }catch(e){}

      alert(
        'Partner application submitted successfully.'
      );

      if(typeof window.go === 'function'){
        window.go('partnerDashboard');
      }else{
        const dashboard =
          byId('partnerDashboard');

        if(dashboard){
          dashboard.scrollIntoView({
            behavior: 'smooth'
          });
        }
      }

      setTimeout(function(){
        try{
          installPartnerDashboard();
          renderAllPartnerApplications();
        }catch(e){
          console.error(e);
        }
      }, 300);

    }catch(err){

      console.error(
        'multiPartnerApply error',
        err
      );

      alert(
        'Something went wrong while submitting the partner application.'
      );
    }
  }

  /* ----------------------------------------------------------
     CUSTOMER SEARCH
     ---------------------------------------------------------- */

  function approvedDynamicPartners(){
    return getPartners()
      .filter(function(p){
        return String(
          p.verification || ''
        ).toLowerCase() === 'approved';
      })
      .map(function(p){

        const services =
          Array.isArray(p.services) &&
          p.services.length ?
          p.services :
          [p.service];

        return {
          id: p.id,

          name: p.name,

          age: Number(p.age) || 0,

          gender: p.gender || '',

          city:
            p.area ||
            p.city ||
            'Gurgaon',

          area:
            p.area ||
            p.city ||
            'Gurgaon',

          services: services,

          service:
            p.service ||
            services[0] ||
            '',

          rate:
            p.rate ||
            '',

          availability:
            p.availability ||
            '',

          rating:
            p.rating ||
            'New',

          reviews:
            Number(p.reviews) || 0,

          photo:
            p.photo ||
            '',

          verification:
            p.verification,

          experience:
            p.experience ||
            '',

          qualification:
            p.qualification ||
            '',

          dynamicPartner: true
        };
      });
  }

  function matchesGender(
    partner,
    desired
  ){
    if(!desired){
      return true;
    }

    const d =
      String(desired)
      .trim()
      .toLowerCase();

    if(
      d === 'any' ||
      d === 'any partner' ||
      d === 'all'
    ){
      return true;
    }

    const g =
      String(partner.gender || '')
      .trim()
      .toLowerCase();

    if(!g){
      return false;
    }

    return (
      g === d ||
      g.indexOf(d) !== -1 ||
      d.indexOf(g) !== -1
    );
  }

  function matchesService(
    partner,
    desired
  ){
    if(!desired){
      return true;
    }

    const d =
      String(desired)
      .trim()
      .toLowerCase();

    const services =
      Array.isArray(partner.services) ?
      partner.services :
      [partner.service];

    return services.some(function(s){
      return String(s || '')
        .trim()
        .toLowerCase()
        .indexOf(d) !== -1 ||
        d.indexOf(
          String(s || '')
            .trim()
            .toLowerCase()
        ) !== -1;
    });
  }

  function matchesAge(
    partner,
    minAge,
    maxAge
  ){
    const age =
      Number(partner.age) || 0;

    if(!age){
      return false;
    }

    if(
      minAge !== null &&
      minAge !== undefined &&
      minAge !== '' &&
      age < Number(minAge)
    ){
      return false;
    }

    if(
      maxAge !== null &&
      maxAge !== undefined &&
      maxAge !== '' &&
      age > Number(maxAge)
    ){
      return false;
    }

    return true;
  }

  function matchesLocation(
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

    const actual = (
      String(partner.area || '') +
      ' ' +
      String(partner.city || '')
    ).toLowerCase();

    return (
      actual.indexOf(wanted) !== -1 ||
      wanted.indexOf(actual) !== -1
    );
  }

  function filterDynamicPartners(
    service,
    gender,
    minAge,
    maxAge,
    location
  ){
    return approvedDynamicPartners()
      .filter(function(p){

        return (
          matchesService(p, service) &&
          matchesGender(p, gender) &&
          matchesAge(p, minAge, maxAge) &&
          matchesLocation(p, location)
        );
      });
  }

  function installFindPartners(){

    if(
      typeof window.findPartners !== 'function'
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

        if(!Array.isArray(result)){
          result = [];
        }
      }catch(e){
        console.error(
          'Original findPartners error',
          e
        );
        result = [];
      }

      let service = '';
      let gender = '';
      let minAge = '';
      let maxAge = '';
      let location = '';

      try{
        const args =
          Array.prototype.slice.call(
            arguments
          );

        if(args.length >= 1){
          service = args[0] || '';
        }

        if(args.length >= 2){
          gender = args[1] || '';
        }

        if(args.length >= 3){
          minAge = args[2] || '';
        }

        if(args.length >= 4){
          maxAge = args[3] || '';
        }

        if(args.length >= 5){
          location = args[4] || '';
        }
      }catch(e){}

      /* Read current UI fields too */
      if(!service){

        service =
          firstExisting([
            'customerService',
            'searchService',
            'serviceSelect',
            'service'
          ]);
      }

      if(!gender){

        gender =
          firstExisting([
            'customerGenderPreference',
            'genderPreference',
            'searchGender',
            'customerGender'
          ]);

        if(!gender){

          const r =
            document.querySelector(
              'input[name="genderPreference"]:checked'
            ) ||
            document.querySelector(
              'input[name="customerGenderPreference"]:checked'
            );

          if(r){
            gender =
              String(r.value || '');
          }
        }
      }

      const dynamic =
        filterDynamicPartners(
          service,
          gender,
          minAge,
          maxAge,
          location
        );

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

      dynamic.forEach(function(p){

        const id =
          String(p.id);

        if(!existingIds.has(id)){
          result.push(p);
          existingIds.add(id);
        }
      });

      return result;
    }

    wrappedFindPartners.__BAP_MULTI_WRAPPED = true;
    wrappedFindPartners.__BAP_ORIGINAL = original;

    window.findPartners =
      wrappedFindPartners;

    return true;
  }

  /* ----------------------------------------------------------
     SELECT PARTNER
     ---------------------------------------------------------- */

  function installSelectPartner(){

    if(
      typeof window.selectPartner !== 'function'
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

    function wrappedSelectPartner(partner){

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
            }
          }
        }

      }catch(e){
        console.error(
          'Multi selectPartner error',
          e
        );
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

  /* ----------------------------------------------------------
     PARTNER DASHBOARD
     ---------------------------------------------------------- */

  function installPartnerDashboard(){

    if(
      typeof window.renderPartnerDashboard !== 'function'
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

    function wrappedPartnerDashboard(){

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

      const result =
        original.apply(
          this,
          arguments
        );

      setTimeout(function(){

        try{

          const partner =
            getCurrentPartner();

          if(!partner){
            return;
          }

          /* Update common dashboard texts */
          const selectors = [
            'partnerDashboardName',
            'pDashboardName',
            'partnerCurrentName'
          ];

          selectors.forEach(function(id){

            const el = byId(id);

            if(el){
              el.textContent =
                partner.name || '';
            }
          });

        }catch(e){
          console.error(e);
        }

      }, 0);

      return result;
    }

    wrappedPartnerDashboard.__BAP_MULTI_WRAPPED = true;
    wrappedPartnerDashboard.__BAP_ORIGINAL = original;

    window.renderPartnerDashboard =
      wrappedPartnerDashboard;

    return true;
  }

  /* ----------------------------------------------------------
     ADMIN HTML HELPERS
     ---------------------------------------------------------- */

  function escapeHtml(value){

    return String(
      value === undefined ||
      value === null ?
      '' :
      value
    )
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  }

  function partnerStatusClass(status){

    const s =
      String(status || '')
        .toLowerCase();

    if(s === 'approved'){
      return 'approved';
    }

    if(s === 'rejected'){
      return 'rejected';
    }

    return 'pending';
  }

  /* ----------------------------------------------------------
     ADMIN PARTNER ACTIONS
     ---------------------------------------------------------- */

  window.BAP_adminApprovePartner =
    function(partnerId){

      const list = getPartners();

      const index =
        list.findIndex(function(p){
          return String(p.id) ===
            String(partnerId);
        });

      if(index === -1){
        alert('Partner not found.');
        return;
      }

      list[index].verification =
        'Approved';

      list[index].approvedAt =
        new Date().toISOString();

      list[index].rejectedAt = '';

      savePartners(list);

      if(
        typeof window.renderAllPartnerApplications ===
        'function'
      ){
        window.renderAllPartnerApplications();
      }

      alert(
        'Partner approved successfully.'
      );
    };

  window.BAP_adminRejectPartner =
    function(partnerId){

      const list = getPartners();

      const index =
        list.findIndex(function(p){
          return String(p.id) ===
            String(partnerId);
        });

      if(index === -1){
        alert('Partner not found.');
        return;
      }

      list[index].verification =
        'Rejected';

      list[index].rejectedAt =
        new Date().toISOString();

      savePartners(list);

      if(
        typeof window.renderAllPartnerApplications ===
        'function'
      ){
        window.renderAllPartnerApplications();
      }

      alert(
        'Partner rejected.'
      );
    };

  /* ----------------------------------------------------------
     ADMIN RENDER
     ---------------------------------------------------------- */

  function renderPartnerCard(partner){

    const id =
      escapeHtml(partner.id);

    const name =
      escapeHtml(partner.name || '-');

    const age =
      escapeHtml(partner.age || '-');

    const gender =
      escapeHtml(partner.gender || '-');

    const mobile =
      escapeHtml(partner.mobile || '-');

    const area =
      escapeHtml(partner.area || '-');

    const service =
      escapeHtml(partner.service || '-');

    const rate =
      escapeHtml(partner.rate || '-');

    const availability =
      escapeHtml(partner.availability || '-');

    const experience =
      escapeHtml(
        partner.experience || '-'
      );

    const qualification =
      escapeHtml(
        partner.qualification || '-'
      );

    const status =
      escapeHtml(
        partner.verification ||
        'Pending Review'
      );

    const proofName =
      escapeHtml(
        partner.proofName ||
        ''
      );

    const photoHtml =
      partner.photo ?
      (
        '<img src="' +
        partner.photo +
        '" alt="Profile" ' +
        'style="width:95px;height:95px;' +
        'object-fit:cover;border-radius:12px;' +
        'display:block;">'
      ) :
      (
        '<div style="' +
        'width:95px;height:95px;' +
        'border-radius:12px;' +
        'background:#eee;' +
        'display:flex;align-items:center;' +
        'justify-content:center;' +
        'font-size:12px;">' +
        'No Photo' +
        '</div>'
      );

    const selfieHtml =
      partner.selfie ?
      (
        '<img src="' +
        partner.selfie +
        '" alt="Selfie" ' +
        'style="width:95px;height:95px;' +
        'object-fit:cover;border-radius:12px;' +
        'display:block;">'
      ) :
      (
        '<div style="' +
        'width:95px;height:95px;' +
        'border-radius:12px;' +
        'background:#eee;' +
        'display:flex;align-items:center;' +
        'justify-content:center;' +
        'font-size:12px;">' +
        'No Selfie' +
        '</div>'
      );

    const proofHtml =
      partner.proofId ?
      (
        '<button type="button" ' +
        'onclick="BAP_openPartnerProof(\'' +
        id +
        '\')" ' +
        'style="margin-top:8px;cursor:pointer;">' +
        'Open Proof' +
        '</button>' +
        (
          proofName ?
          '<div style="font-size:12px;margin-top:5px;">' +
          proofName +
          '</div>' :
          ''
        )
      ) :
      '<div style="font-size:12px;color:#888;">No proof</div>';

    const cls =
      partnerStatusClass(
        partner.verification
      );

    const actionHtml =
      (
        '<div style="' +
        'display:flex;gap:8px;flex-wrap:wrap;' +
        'margin-top:14px;">' +

        '<button type="button" ' +
        'onclick="BAP_adminApprovePartner(\'' +
        id +
        '\')" ' +
        'style="padding:8px 12px;' +
        'border-radius:8px;cursor:pointer;">' +
        'Approve' +
        '</button>' +

        '<button type="button" ' +
        'onclick="BAP_adminRejectPartner(\'' +
        id +
        '\')" ' +
        'style="padding:8px 12px;' +
        'border-radius:8px;cursor:pointer;">' +
        'Reject' +
        '</button>' +

        '</div>'
      );

    return (
      '<div class="bap-multi-partner-card" ' +
      'data-partner-id="' +
      id +
      '" ' +
      'style="' +
      'border:1px solid #ddd;' +
      'border-radius:16px;' +
      'padding:16px;' +
      'margin-bottom:16px;' +
      'background:#fff;' +
      'box-shadow:0 4px 18px rgba(0,0,0,.06);' +
      '">' +

      '<div style="' +
      'display:flex;' +
      'gap:16px;' +
      'flex-wrap:wrap;' +
      'align-items:flex-start;">' +

      '<div>' +
      photoHtml +
      '<div style="margin-top:8px;font-weight:600;">' +
      'Profile Photo' +
      '</div>' +
      '</div>' +

      '<div>' +
      selfieHtml +
      '<div style="margin-top:8px;font-weight:600;">' +
      'Selfie' +
      '</div>' +
      '</div>' +

      '<div style="flex:1;min-width:260px;">' +

      '<div style="display:flex;' +
      'justify-content:space-between;' +
      'gap:10px;align-items:center;' +
      'flex-wrap:wrap;">' +

      '<h3 style="margin:0;">' +
      name +
      '</h3>' +

      '<span style="' +
      'padding:5px 9px;' +
      'border-radius:999px;' +
      'background:#f2f2f2;' +
      'font-size:12px;">' +
      escapeHtml(cls) +
      ': ' +
      status +
      '</span>' +

      '</div>' +

      '<div style="margin-top:10px;line-height:1.7;">' +

      '<div><strong>Age:</strong> ' +
      age +
      '</div>' +

      '<div><strong>Gender:</strong> ' +
      gender +
      '</div>' +

      '<div><strong>Mobile:</strong> ' +
      mobile +
      '</div>' +

      '<div><strong>Area:</strong> ' +
      area +
      '</div>' +

      '<div><strong>Service:</strong> ' +
      service +
      '</div>' +

      '<div><strong>Hourly Rate:</strong> ₹' +
      rate +
      '</div>' +

      '<div><strong>Availability:</strong> ' +
      availability +
      '</div>' +

      '<div><strong>Experience:</strong> ' +
      experience +
      '</div>' +

      '<div><strong>Qualification:</strong> ' +
      qualification +
      '</div>' +

      '</div>' +

      '<div style="margin-top:10px;">' +
      '<strong>Proof:</strong><br>' +
      proofHtml +
      '</div>' +

      actionHtml +

      '</div>' +

      '</div>' +

      '</div>'
    );
  }

  function renderAllPartnerApplications(){

    const box =
      byId('partnerApplications');

    if(!box){
      return false;
    }

    const list =
      getPartners();

    currentAdminPartnerId = null;

    if(!list.length){

      box.innerHTML =
        '<div style="padding:20px;color:#777;">' +
        'No partner applications found.' +
        '</div>';

      return true;
    }

    box.innerHTML =
      '<div style="margin-bottom:14px;' +
      'font-weight:700;">' +
      'Total Partners: ' +
      list.length +
      '</div>' +

      list.map(function(partner){
        return renderPartnerCard(partner);
      }).join('');

    return true;
  }

  window.renderAllPartnerApplications =
    renderAllPartnerApplications;

  /* ----------------------------------------------------------
     ADMIN WRAPPER
     ---------------------------------------------------------- */

  function installAdmin(){

    if(
      typeof window.renderAdmin !== 'function'
    ){
      return false;
    }

    if(
      window.renderAdmin.__BAP_MULTI_ADMIN_WRAPPER
    ){
      return true;
    }

    const originalRenderAdmin =
      window.renderAdmin;

    function wrappedRenderAdmin(){

      let result;

      try{
        result =
          originalRenderAdmin.apply(
            this,
            arguments
          );
      }catch(e){
        console.error(
          'Original renderAdmin error',
          e
        );
      }

      setTimeout(
        renderAllPartnerApplications,
        0
      );

      setTimeout(
        renderAllPartnerApplications,
        150
      );

      setTimeout(
        renderAllPartnerApplications,
        500
      );

      setTimeout(
        renderAllPartnerApplications,
        1000
      );

      return result;
    }

    wrappedRenderAdmin.__BAP_MULTI_ADMIN_WRAPPER = true;
    wrappedRenderAdmin.__BAP_ORIGINAL = originalRenderAdmin;

    window.renderAdmin =
      wrappedRenderAdmin;

    return true;
  }

  /* ----------------------------------------------------------
     HOOK REINFORCEMENT
     ---------------------------------------------------------- */

  function reinforceHooks(){

    try{
      installFindPartners();
    }catch(e){
      console.error(
        'findPartners hook failed',
        e
      );
    }

    try{
      installSelectPartner();
    }catch(e){
      console.error(
        'selectPartner hook failed',
        e
      );
    }

    try{
      installPartnerDashboard();
    }catch(e){
      console.error(
        'partner dashboard hook failed',
        e
      );
    }

    try{
      installAdmin();
    }catch(e){
      console.error(
        'admin hook failed',
        e
      );
    }

    try{
      renderAllPartnerApplications();
    }catch(e){
      console.error(
        'admin render failed',
        e
      );
    }

    try{
      window.partnerApply =
        multiPartnerApply;
    }catch(e){}
  }

  /* ----------------------------------------------------------
     INSTALL
     ---------------------------------------------------------- */

  function install(){

    if(installed){
      return;
    }

    installed = true;

    try{
      migratePartners();
    }catch(e){
      console.error(
        'Migration failed',
        e
      );
    }

    /* Initial attempt */
    reinforceHooks();

    /*
      The main index.html has a very large inline script.
      Some legacy functions are defined AFTER this external
      JavaScript loads. Therefore we reinforce hooks several
      times so the final legacy functions are wrapped.
    */

    setTimeout(
      reinforceHooks,
      500
    );

    setTimeout(
      reinforceHooks,
      1500
    );

    setTimeout(
      reinforceHooks,
      3000
    );

    setTimeout(
      reinforceHooks,
      5000
    );

    setTimeout(
      reinforceHooks,
      8000
    );

    /*
      Keep partnerApply on the multi-partner implementation
      after the original page script has finished loading.
    */

    setTimeout(function(){
      window.partnerApply =
        multiPartnerApply;
    }, 3200);

    setTimeout(function(){
      window.partnerApply =
        multiPartnerApply;
    }, 5000);

    setTimeout(function(){
      window.partnerApply =
        multiPartnerApply;
    }, 8000);

    /*
      Observe DOM changes.
      Legacy renderAdmin may rebuild partnerApplications,
      so render the complete multi-partner list again.
    */

    if(
      !window.__BAP_MULTI_PARTNER_OBSERVER &&
      window.MutationObserver
    ){

      const observer =
        new MutationObserver(
          function(){

            const box =
              byId(
                'partnerApplications'
              );

            if(box){
              renderAllPartnerApplications();
            }
          }
        );

      if(document.body){

        observer.observe(
          document.body,
          {
            childList: true,
            subtree: true
          }
        );

        window.__BAP_MULTI_PARTNER_OBSERVER =
          observer;
      }
    }

    window.__BAP_MULTI_PARTNER_INSTALLED = true;
  }

  /* ----------------------------------------------------------
     DEBUG HELPERS
     ---------------------------------------------------------- */

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

  /* ----------------------------------------------------------
     START
     ---------------------------------------------------------- */

  if(
    document.readyState === 'loading'
  ){

    document.addEventListener(
      'DOMContentLoaded',
      install
    );

  }else{

    install();
  }

})();

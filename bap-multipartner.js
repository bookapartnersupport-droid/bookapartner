/* ==========================================================
   BOOK A PARTNER — MULTI PARTNER SYSTEM
   ----------------------------------------------------------
   Converts the prototype from one partner record to an array
   of partner profiles while keeping old localStorage keys
   working for compatibility.
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
    try{ return JSON.parse(value); }catch(e){ return fallback; }
  }

  function slugId(){
    return 'BAP' + Date.now() + Math.random().toString(36).slice(2,8);
  }

  function migratePartners(){
    let list = safeJsonParse(localStorage.getItem(PARTNER_LIST_KEY) || '[]', []);
    if(!Array.isArray(list)) list = [];

    let changed = false;

    list = list.map(function(p){
      if(p && !p.id){
        p.id = slugId();
        changed = true;
      }
      return p;
    }).filter(Boolean);

    const legacy = safeJsonParse(localStorage.getItem(LEGACY_KEY) || 'null', null);

    if(legacy){
      const exists = list.some(function(p){
        return p.id === legacy.id ||
          (p.mobile && legacy.mobile && p.mobile === legacy.mobile);
      });

      if(!exists){
        if(!legacy.id) legacy.id = slugId();
        list.push(legacy);
        changed = true;
      }
    }

    if(changed || localStorage.getItem(PARTNER_LIST_KEY) === null){
      try{
        localStorage.setItem(PARTNER_LIST_KEY, JSON.stringify(list));
      }catch(e){
        console.warn('Multi partner list save warning:', e);
      }
    }

    return list;
  }

  function getPartners(){
    return migratePartners();
  }

  function savePartners(list){
    localStorage.setItem(PARTNER_LIST_KEY, JSON.stringify(list));

    const latest = list.length ? list[list.length - 1] : null;
    if(latest){
      localStorage.setItem(LEGACY_KEY, JSON.stringify(latest));
    }
  }

  function findPartner(id){
    return getPartners().find(function(p){ return String(p.id) === String(id); }) || null;
  }

  function setCurrentPartner(id){
    if(id) localStorage.setItem(CURRENT_KEY, String(id));
  }

  function getCurrentPartner(){
    const id = localStorage.getItem(CURRENT_KEY);
    if(id){
      const found = findPartner(id);
      if(found) return found;
    }

    const list = getPartners();
    return list.length ? list[list.length - 1] : null;
  }

  /* ========================================================
     PROOF DOCUMENT DATABASE
     ======================================================== */

  function openDocDB(){
    return new Promise(function(resolve,reject){
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = function(e){
        const db = e.target.result;
        if(!db.objectStoreNames.contains(DOC_STORE)){
          db.createObjectStore(DOC_STORE, {keyPath:'id'});
        }
      };

      req.onsuccess = function(){ resolve(req.result); };
      req.onerror = function(){ reject(req.error); };
    });
  }

  async function saveDocument(file){
    if(!file) return null;

    const id = 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
    const db = await openDocDB();

    return new Promise(function(resolve,reject){
      const tx = db.transaction(DOC_STORE,'readwrite');
      const store = tx.objectStore(DOC_STORE);
      const req = store.put({
        id:id,
        name:file.name,
        type:file.type || 'application/octet-stream',
        blob:file
      });
      req.onsuccess = function(){ resolve({id:id,name:file.name}); };
      req.onerror = function(){ reject(req.error); };
    });
  }

  async function getDocument(id){
    if(!id) return null;
    const db = await openDocDB();

    return new Promise(function(resolve,reject){
      const tx = db.transaction(DOC_STORE,'readonly');
      const req = tx.objectStore(DOC_STORE).get(id);
      req.onsuccess = function(){ resolve(req.result || null); };
      req.onerror = function(){ reject(req.error); };
    });
  }

  window.BAP_openPartnerProof = async function(id){
    try{
      const record = await getDocument(id);
      if(!record || !record.blob){
        alert('Proof document is not available. Please ask the partner to upload it again.');
        return;
      }

      const blob = record.blob instanceof Blob
        ? record.blob
        : new Blob([record.blob], {type:record.type || 'application/octet-stream'});

      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');

      setTimeout(function(){ URL.revokeObjectURL(url); }, 60000);
    }catch(e){
      console.error('Proof open error:', e);
      alert('Could not open the verification proof.');
    }
  };

  /* ========================================================
     IMAGE COMPRESSION
     ======================================================== */

  function compressImage(file){
    return new Promise(function(resolve){
      if(!file || !file.type || !file.type.startsWith('image/')){
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = function(){
        const img = new Image();

        img.onload = function(){
          const max = 700;
          let w = img.width;
          let h = img.height;
          const scale = Math.min(1, max / w, max / h);
          w = Math.max(1, Math.round(w * scale));
          h = Math.max(1, Math.round(h * scale));

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;

          const ctx = canvas.getContext('2d');
          if(!ctx){ resolve(file); return; }

          ctx.drawImage(img,0,0,w,h);

          canvas.toBlob(function(blob){
            if(!blob){ resolve(file); return; }

            resolve(new File(
              [blob],
              'compressed_' + file.name.replace(/\.[^/.]+$/,'') + '.jpg',
              {type:'image/jpeg',lastModified:Date.now()}
            ));
          }, 'image/jpeg', 0.65);
        };

        img.onerror = function(){ resolve(file); };
        img.src = reader.result;
      };

      reader.onerror = function(){ resolve(file); };
      reader.readAsDataURL(file);
    });
  }

  function fileToDataURL(file){
    return new Promise(function(resolve,reject){
      const reader = new FileReader();
      reader.onload = function(){ resolve(reader.result); };
      reader.onerror = function(){ reject(reader.error); };
      reader.readAsDataURL(file);
    });
  }

  /* ========================================================
     CUSTOMER SEARCH
     ======================================================== */

  function approvedDynamicPartners(){
    return getPartners()
      .filter(function(p){ return p && p.verification === 'Approved'; })
      .map(function(p){
        return {
          id:p.id,
          name:p.name,
          age:Number(p.age),
          mobile:p.mobile,
          area:p.area,
          rate:Number(p.rate),
          rating:p.rating ?? 'New',
          reviews:p.reviews ?? 0,
          gender:p.gender || 'Any',
          services:[p.service],
          availability:p.availability,
          partnerId:p.id
        };
      });
  }

  function genderOK(preference,p){
    if(!preference || preference === 'Any') return true;
    return String(p.gender || '').toLowerCase() === String(preference).toLowerCase();
  }

  function installFindPartners(){
    window.findPartners = function(){
      const service = byId('service')?.value || '';
      const age = byId('age')?.value || 'Any age';
      const area = byId('area')?.value || 'Gurgaon NCR';
      const location = typeof getLocationValue === 'function' ? getLocationValue() : '';
      const preference = byId('customerGenderPreference')?.value || 'Any';

      if(!location){
        alert('Please enter/select the meeting location.');
        return;
      }

      let staticPartners = [];
      try{
        staticPartners = Array.isArray(window.partners) ? window.partners : [];
      }catch(e){ staticPartners = []; }

      const dynamic = approvedDynamicPartners();

      const pool = [
        ...staticPartners.map(function(p){
          return {...p, gender:p.gender || 'Any', partnerId:p.id || ('static_' + p.name)};
        }),
        ...dynamic
      ];

      const list = pool.filter(function(p){
        const services = Array.isArray(p.services) ? p.services : [];
        const agePass = typeof ageOK === 'function' ? ageOK(age,p) : true;
        return services.includes(service) && agePass && genderOK(preference,p);
      });

      let html =
        '<h2>Available Partners</h2>' +
        '<p class="muted">' +
        service + ' • ' + area + ' • Preferred age: ' + age +
        '</p>' +
        '<div class="partners">';

      list.forEach(function(p){
        const selectKey = String(p.partnerId).replace(/'/g,"\\'");
        html += `
          <div class="card">
            <div class="partner">
              <div class="avatar">${String(p.name || 'P')[0]}</div>
              <div>
                <b>${p.name}</b>
                <span class="pill verified">✓ VERIFIED</span>
                <div class="muted">Age ${p.age} • ${p.area}</div>
                <div>
                  <span class="rating">★★★★★</span>
                  <b>${p.rating ?? 'New'}</b>
                  (${p.reviews ?? 0})
                </div>
                <span class="pill available">● AVAILABLE</span>
              </div>
            </div>
            <div class="price">₹${p.rate}<small>/ hour</small></div>
            <div>${(p.services || []).map(function(x){return '<span class="pill">'+x+'</span>';}).join('')}</div>
            <div class="transportBox">🚗 <b>Transport:</b> Free up to 10 km. Beyond 10 km, maximum ₹150.</div>
            <button class="pink full" onclick="selectPartner('${selectKey}')">Request Booking</button>
          </div>
        `;
      });

      if(!list.length){
        html += '<div class="card">No matching partners found. Try another service, gender or age preference.</div>';
      }

      html += '</div><div class="notice"><b>Next:</b> Select a partner → review booking → continue to payment.</div>';
      byId('results').innerHTML = html;
    };
  }

  /* ========================================================
     SELECT PARTNER
     ======================================================== */

  function installSelectPartner(){
    window.selectPartner = function(identifier){
      let p = null;
      const dynamic = approvedDynamicPartners();
      const staticPartners = Array.isArray(window.partners) ? window.partners : [];

      p = dynamic.find(function(x){ return String(x.partnerId) === String(identifier); }) ||
          staticPartners.find(function(x){ return String(x.id || ('static_' + x.name)) === String(identifier); }) ||
          dynamic.find(function(x){ return x.name === identifier; }) ||
          staticPartners.find(function(x){ return x.name === identifier; });

      if(!p){
        alert('Partner profile could not be found.');
        return;
      }

      window.selected = {
        ...p,
        partnerId:p.partnerId,
        service:byId('service')?.value || p.services?.[0] || '',
        age:byId('age')?.value || '',
        area:byId('area')?.value || 'Gurgaon NCR',
        date:byId('date')?.value || '',
        time:byId('time')?.value || '',
        location:typeof getLocationValue === 'function' ? getLocationValue() : '',
        locationLat:byId('locationLat')?.value || '',
        locationLng:byId('locationLng')?.value || ''
      };

      const summary = byId('bookingSummary');
      if(summary){
        summary.innerHTML = `
          <div class="summary">
            <b>${p.name}</b>
            <span class="pill verified">✓ VERIFIED</span>
            <p>${window.selected.service}</p>
            <p>📅 ${window.selected.date || 'Date to be selected'} &nbsp; 🕐 ${window.selected.time || 'Time to be selected'}</p>
            <p>📍 ${window.selected.location}</p>
            <p>Area: ${window.selected.area}</p>
            <p><strong>₹${p.rate} / hour</strong></p>
          </div>`;
      }

      if(typeof go === 'function') go('details');
    };
  }

  /* ========================================================
     PARTNER APPLY — MULTIPLE PROFILES
     ======================================================== */

  async function multiPartnerApply(){
    const n = byId('partnerName')?.value.trim() || '';
    const age = Number(byId('partnerAge')?.value);
    const m = byId('partnerMobile')?.value.trim() || '';
    const area = byId('partnerArea')?.value.trim() || '';
    const service = byId('partnerService')?.value || '';
    const rate = Number(byId('partnerRate')?.value);
    const availability = byId('partnerAvailability')?.value || '';
    const photo = byId('partnerPhoto')?.files?.[0] || null;
    const selfie = byId('partnerSelfie')?.files?.[0] || null;
    const gender = byId('partnerGender')?.value || 'Any';

    if(!n || !Number.isFinite(age) || age < 18 || m.length !== 10 || !area || !service || !Number.isFinite(rate) || rate <= 0 || !photo || !selfie){
      alert('Please complete all partner details, including profile photo and selfie.');
      return;
    }

    const category = window.BAP_getCategory ? window.BAP_getCategory(service) : null;

    if(category){
      if(rate < category.minRate || rate > category.maxRate){
        alert('Please enter a rate between ₹' + category.minRate + ' and ₹' + category.maxRate + ' per hour.');
        return;
      }

      if(category.type === 'specialized'){
        const years = Number(byId('partnerExperienceYears')?.value);
        const details = byId('partnerExperienceDetails')?.value.trim() || '';
        const qualification = byId('partnerQualification')?.value.trim() || '';
        const proof = byId('partnerExperienceProof')?.files?.[0] || null;

        if(!Number.isFinite(years) || years < 0){
          alert('Please enter relevant experience in years.');
          return;
        }

        if(!details){
          alert('Please describe your relevant experience.');
          return;
        }

        if(category.qualificationRequired && !qualification){
          alert('Please enter your qualification/certification for this service.');
          return;
        }

        if(category.qualificationRequired && !proof){
          alert('Please upload the required qualification/certificate proof.');
          return;
        }
      }
    }

    try{
      const compressedPhoto = await compressImage(photo);
      const compressedSelfie = await compressImage(selfie);
      const photoData = await fileToDataURL(compressedPhoto);
      const selfieData = await fileToDataURL(compressedSelfie);

      let proofInfo = null;
      let years = null;
      let details = '';
      let qualification = '';

      if(category && category.type === 'specialized'){
        years = Number(byId('partnerExperienceYears')?.value);
        details = byId('partnerExperienceDetails')?.value.trim() || '';
        qualification = byId('partnerQualification')?.value.trim() || '';
        const proof = byId('partnerExperienceProof')?.files?.[0] || null;
        if(proof) proofInfo = await saveDocument(proof);
      }

      const partner = {
        id:slugId(),
        name:n,
        age:age,
        mobile:m,
        area:area,
        service:service,
        rate:rate,
        availability:availability,
        gender:gender,
        verification:'Pending Review',
        verificationNote:'Photo + selfie submitted for admin review',
        photoName:compressedPhoto.name,
        photoData:photoData,
        selfieName:compressedSelfie.name,
        selfieData:selfieData,
        experienceRequired:category?.type === 'specialized',
        experienceYears:years,
        experienceDetails:details,
        qualification:qualification,
        experienceProofId:proofInfo?.id || '',
        experienceProofName:proofInfo?.name || ''
      };

      const list = getPartners();
      list.push(partner);
      savePartners(list);
      setCurrentPartner(partner.id);

      alert('Partner application saved for demo. Real mobile OTP, identity verification and admin approval will be connected in the backend stage.');
      if(typeof go === 'function') go('partnerDashboard');

    }catch(error){
      console.error('Multi partner application error:', error);
      alert('Partner application could not be saved. Please try again.');
    }
  }

  /* ========================================================
     PARTNER DASHBOARD — CURRENT PARTNER
     ======================================================== */

  function installPartnerDashboard(){
    window.renderPartnerDashboard = function(){
      const p = getCurrentPartner();
      const profile = byId('partnerProfileCard');
      const req = byId('partnerRequests');

      if(!profile || !req) return;

      if(!p){
        profile.innerHTML = '<b>No partner profile yet.</b><p>Create your profile from Start Earning.</p><button class="pink" onclick="go(\'join\')">Create Partner Profile</button>';
        req.innerHTML = '';
        return;
      }

      profile.innerHTML = `
        <b>${p.name}</b>
        <span class="pill">${p.verification}</span>
        <p>Age ${p.age} • ${p.area}</p>
        <p>${p.service} • ₹${p.rate}/hour • ${p.availability}</p>
        <p>📸 ${p.photoName || '—'}<br>🤳 ${p.selfieName || '—'}</p>
        <p><span class="pill">💰 Payout rule: customer approval required</span></p>
      `;

      const bookings = safeJsonParse(localStorage.getItem('bap_bookings') || '[]', []);
      const partnerArea = String(p.area || '').toLowerCase().trim();

      const matching = bookings.filter(function(b){
        if(b.status !== 'Awaiting Partner' && b.status !== 'Confirmed') return false;
        if(b.partnerStatus === 'Rejected') return false;
        if(b.partnerId && String(b.partnerId) !== String(p.id)) return false;
        if(!b.partnerId && b.name !== p.name) return false;
        if(b.service !== p.service) return false;
        if(p.availability !== 'Available') return false;

        const customerArea = String(b.area || '').toLowerCase().trim();
        const meetingLocation = String(b.location || '').toLowerCase().trim();

        if(!partnerArea) return true;

        return !!(
          customerArea.includes('gurgaon') ||
          customerArea.includes('gurugram') ||
          meetingLocation.includes('gurgaon') ||
          meetingLocation.includes('gurugram') ||
          partnerArea.includes(customerArea) ||
          customerArea.includes(partnerArea) ||
          meetingLocation.includes(partnerArea) ||
          partnerArea.includes(meetingLocation)
        );
      });

      if(!matching.length){
        req.innerHTML = '<p class="muted">No matching booking requests are waiting right now.</p>';
        return;
      }

      req.innerHTML = matching.map(function(b){
        const statusText = b.status === 'Confirmed' ? 'Accepted / Confirmed' : 'Waiting for your response';
        const canAct = b.status === 'Awaiting Partner' && b.partnerStatus !== 'Rejected';

        return `
          <div class="card" style="margin-top:10px">
            <b>${b.service}</b>
            <p>${b.date} • ${b.time}<br>📍 ${b.location}<br>Area: ${b.area || '—'}</p>
            <span class="pill">${statusText}</span>
            <div style="margin-top:8px">
              ${canAct ? `
                <button class="green" onclick="partnerAcceptBooking('${String(b.id).replace(/'/g,"\\'")}')">Accept</button>
                <button class="light" onclick="partnerRejectBooking('${String(b.id).replace(/'/g,"\\'")}')">Reject</button>
              ` : ''}
            </div>
          </div>`;
      }).join('');
    };
  }

  window.multiPartnerSetCurrent = function(id){
    setCurrentPartner(id);
    if(typeof renderPartnerDashboard === 'function') renderPartnerDashboard();
  };

  /* ========================================================
     ADMIN PARTNER APPLICATIONS
     ======================================================== */

  function renderAllPartnerApplications(){
    const box = byId('partnerApplications');
    if(!box) return;

    const list = getPartners();

    if(!list.length){
      box.innerHTML = '<p class="muted">No partner applications yet.</p>';
      return;
    }

    box.innerHTML = list.slice().reverse().map(function(p){
      const buttonId = String(p.id).replace(/'/g,"\\'");
      const status = p.verification || 'Pending Review';
      const specialized = !!p.experienceRequired || !!(window.BAP_isSpecialized && window.BAP_isSpecialized(p.service));

      const proofHtml = p.experienceProofId
        ? `<button class="light" type="button" onclick="BAP_openPartnerProof('${buttonId}')">📄 Open Proof / Certificate</button>`
        : (p.experienceProofName ? `<span class="muted">Proof: ${p.experienceProofName}</span>` : '');

      const specializedHtml = specialized ? `
        <div class="card" style="margin-top:14px;background:#faf5ff;border-color:#ddd6fe">
          <b>🛡 Specialized Verification Details</b>
          <p>
            <b>Partner Gender:</b> ${p.gender || '—'}<br>
            <b>Relevant Experience:</b> ${p.experienceYears ?? '—'} years<br>
            <b>Experience Details:</b> ${p.experienceDetails || '—'}<br>
            <b>Qualification / Certification:</b> ${p.qualification || '—'}<br>
            <b>Proof / Certificate:</b> ${p.experienceProofName || '—'}
          </p>
          <div class="notice">⚠ Specialized service — verify experience, qualification and proof before approval.</div>
          ${proofHtml}
        </div>` : proofHtml;

      return `
        <div class="card" style="margin-top:10px">
          <span class="pill">${status}</span>
          <h4 style="margin-top:12px">${p.name || 'Partner'}</h4>
          <p>
            📱 ${p.mobile || '—'}<br>
            🎂 Age: ${p.age || '—'}<br>
            📍 ${p.area || '—'}<br>
            🛎️ Service: ${p.service || '—'}<br>
            👤 Gender: ${p.gender || '—'}<br>
            💰 ₹${p.rate || '—'} / hour<br>
            🕐 Availability: ${p.availability || '—'}
          </p>

          <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:15px">
            <div>
              <small style="display:block;font-weight:700;margin-bottom:6px;color:#334155">📷 Profile Photo</small>
              ${p.photoData ? `<img src="${p.photoData}" alt="Partner profile photo" style="width:140px;height:140px;object-fit:cover;border-radius:14px;border:1px solid #e2e8f0">` : `<p class="muted">Photo not available</p>`}
            </div>
            <div>
              <small style="display:block;font-weight:700;margin-bottom:6px;color:#334155">🤳 Selfie</small>
              ${p.selfieData ? `<img src="${p.selfieData}" alt="Partner selfie" style="width:140px;height:140px;object-fit:cover;border-radius:14px;border:1px solid #e2e8f0">` : `<p class="muted">Selfie not available</p>`}
            </div>
          </div>

          <p class="muted">${p.verificationNote || ''}</p>

          ${specializedHtml}

          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
            ${status !== 'Approved' ? `<button class="green" onclick="adminApprovePartner('${buttonId}')">✓ Approve</button>` : `<span class="pill available">✓ APPROVED</span>`}
            ${status !== 'Rejected' ? `<button class="light" onclick="adminRejectPartner('${buttonId}')">Reject</button>` : `<span class="pill">REJECTED</span>`}
          </div>
        </div>`;
    }).join('');
  }

  function installAdmin(){
    const originalRenderAdmin = window.renderAdmin;

    window.renderAdmin = function(){
      if(typeof originalRenderAdmin === 'function'){
        try{ originalRenderAdmin.apply(this, arguments); }catch(e){ console.warn('Legacy renderAdmin warning:',e); }
      }
      setTimeout(renderAllPartnerApplications, 0);
      setTimeout(renderAllPartnerApplications, 150);
      setTimeout(renderAllPartnerApplications, 500);
    };

    window.adminApprovePartner = function(id){
      const list = getPartners();
      const index = list.findIndex(function(p){ return String(p.id) === String(id); });
      if(index < 0){ alert('Partner application not found.'); return; }

      list[index].verification = 'Approved';
      list[index].verificationNote = 'Partner approved by admin.';
      savePartners(list);
      setCurrentPartner(list[index].id);

      alert('Partner approved successfully.');
      renderAllPartnerApplications();
    };

    window.adminRejectPartner = function(id){
      const list = getPartners();
      const index = list.findIndex(function(p){ return String(p.id) === String(id); });
      if(index < 0){ alert('Partner application not found.'); return; }

      list[index].verification = 'Rejected';
      list[index].verificationNote = 'Partner application rejected by admin.';
      savePartners(list);

      alert('Partner application rejected.');
      renderAllPartnerApplications();
    };
  }

  /* ========================================================
     INSTALL MULTI PARTNER BEHAVIOUR
     ======================================================== */

  function install(){
    if(installed) return;
    installed = true;

    migratePartners();
    installFindPartners();
    installSelectPartner();
    installPartnerDashboard();
    installAdmin();

    /* Override partnerApply after the existing category/validation
       scripts have had a chance to install their wrappers. */
    setTimeout(function(){
      window.partnerApply = multiPartnerApply;
    }, 3200);

    setTimeout(function(){
      window.partnerApply = multiPartnerApply;
    }, 5000);

    setTimeout(function(){
      renderAllPartnerApplications();
    }, 700);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', install);
  }else{
    install();
  }

})();

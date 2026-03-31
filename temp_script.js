
    const u = JSON.parse(localStorage.getItem('tnpvc_user')) || { name: 'Contractor', subExp: new Date().toISOString() };
    let isSubscribed = true;

    // Firebase Config (Synchronized to tnpvc-project)
    const firebaseConfig = {
      apiKey: "AIzaSyDSXxoyFGjMjlt9LcSu7B3kSWxShwcI2yU",
      authDomain: "tnpvc-project.firebaseapp.com",
      projectId: "tnpvc-project",
      storageBucket: "tnpvc-project.firebasestorage.app",
      messagingSenderId: "919957830993",
      appId: "1:919957830993:web:e1a2036a4258f683826770"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    const localUID = localStorage.getItem('tnpvc_guest_uid') || "GUEST-" + Date.now();
    localStorage.setItem('tnpvc_guest_uid', localUID);

    let jobsListenerActive = false;
    function startJobsListener(uid) {
      if(jobsListenerActive) return;
      jobsListenerActive = true;
      db.collection("jobs")
        .where("contractorId", "==", uid)
        .onSnapshot((snapshot) => {
          const jobs = [];
          snapshot.forEach((doc) => jobs.push({ id: doc.id, ...doc.data() }));
          window.myJobs = jobs.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
          renderDashboard();
          if(document.getElementById('tab-bookings').classList.contains('active')) renderMyJobs();
        });
    }

    // REAL-TIME JOBS LISTENER (Global Sync & Powerful Fetch)
    firebase.auth().onIdTokenChanged(user => {
      if (user) {
        startJobsListener(user.uid);
      } else {
        startJobsListener(localUID);
      }
    });

    function getJobs() { return window.myJobs || []; }

    function switchNav(el, tabId) {
      document.querySelectorAll('.b-nav-item').forEach(i => i.classList.remove('active'));
      if(el && el.classList.contains('b-nav-item')) el.classList.add('active');
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      const target = document.getElementById(tabId);
      if(target) target.classList.add('active');
      window.scrollTo(0, 0);
      if(tabId === 'tab-notif') renderNotifs();
      if(tabId === 'tab-bookings') renderMyJobs();
      if(tabId === 'tab-profile') {
        const avatar = u.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=9086FF&color=fff`;
        document.getElementById('prof-avatar-page').src = avatar;
        document.getElementById('prof-name-text').textContent = u.name;
      }
      if(tabId === 'tab-profile-edit') {
        document.getElementById('edit-name-inp').value = u.name;
        document.getElementById('edit-dist-inp').value = u.district || "Chennai";
        document.getElementById('edit-contractor-img').src = document.getElementById('prof-avatar-page').src;
      }
      if(tabId === 'tab-pay-history') renderContractorPayments();
    }

    function handleContractorPhoto(input) {
      if (input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          document.getElementById('edit-contractor-img').src = e.target.result;
          u.photo = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
      }
    }

    function renderContractorPayments() {
      const list = document.getElementById('contractor-pay-list');
      list.innerHTML = `
        <div class="booking-card" style="margin:0 0 12px 0;">
          <div style="padding:16px;">
            <div style="font-size:14px; font-weight:800; color:var(--primary); margin-bottom:4px;">Subscription Active</div>
            <div style="font-size:12px; font-weight:700; color:var(--text-muted);">₹1,000 paid for 30 days access</div>
          </div>
        </div>
      `;
    }

    function saveContractorProfile() {
      u.name = document.getElementById('edit-name-inp').value;
      u.district = document.getElementById('edit-dist-inp').value;
      localStorage.setItem('tnpvc_user', JSON.stringify(u));
      showToast('Profile Updated Successfully');
      setTimeout(() => window.location.reload(), 1000);
    }

    function renewPlan() {
      const options = {
        "key": "rzp_test_YourKeyHere",
        "amount": 100000,
        "currency": "INR",
        "name": "TNPVC Connect Hub",
        "description": "Subscription Renewal",
        "handler": function (response){
          const d = new Date(u.subExp);
          d.setMonth(d.getMonth() + 1);
          u.subExp = d.toISOString();
          localStorage.setItem('tnpvc_user', JSON.stringify(u));
          showToast("Renewal Confirmed!");
          setTimeout(() => window.location.reload(), 2000);
        },
        "prefill": { "name": u.name },
        "theme": { "color": "#9086FF" }
      };
      const rzp = new Razorpay(options);
      rzp.open();
    }

    // ADMIN CONFIG LISTENER (Contractor)
    db.collection('app_config').doc('promo').onSnapshot(doc => {
      if(doc.exists) {
        const data = doc.data();
        const bannerImg = document.querySelector('.reg-banner img');
        if(bannerImg && data.imageUrl) bannerImg.src = data.imageUrl;
        const bannerTxt = document.querySelector('.reg-banner h1, .reg-banner h2, .reg-banner h3');
        if(bannerTxt && data.title) bannerTxt.textContent = data.title;
      }
    });

    function renderDashboard() {
      const avatar = u.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=9086FF&color=fff`;
      if(document.getElementById('nav-profile-img')) document.getElementById('nav-profile-img').src = avatar;
      if(document.getElementById('home-user-name')) document.getElementById('home-user-name').textContent = u.name;
      if(document.getElementById('home-user-loc')) document.getElementById('home-user-loc').textContent = (u.district || "Tamil Nadu") + ", TN";
      
      const all = getJobs();
      const finished = all.filter(j => j.status === 'Completed').length;
      const spend = all.reduce((acc, j) => acc + parseInt(j.budget || 0), 0);
      
      if(document.getElementById('stat-total-posts')) document.getElementById('stat-total-posts').textContent = all.length;
      if(document.getElementById('stat-finished-posts')) document.getElementById('stat-finished-posts').textContent = finished;
      if(document.getElementById('stat-total-spend')) document.getElementById('stat-total-spend').textContent = spend.toLocaleString('en-IN');
      
      const diff = new Date(u.subExp).getTime() - new Date().getTime();
      const days = Math.ceil(diff / (1000 * 3600 * 24));
      const activeDays = days > 0 ? days : 0;
      if(document.getElementById('stat-validity')) document.getElementById('stat-validity').textContent = activeDays + " Days";
      if(document.getElementById('prof-validity')) document.getElementById('prof-validity').textContent = "Premium Valid: " + activeDays + " Days";

      const homeList = document.getElementById('home-pipeline');
      const latest = [...all].reverse().slice(0, 2);
      homeList.innerHTML = latest.length ? latest.map(j => `
        <div class="booking-card" style="margin:0 0 12px 0;">
          <div style="padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div class="bc-title">${j.title}</div>
              <div class="bc-status-pill" style="background:var(--primary-light); color:var(--primary);">${j.status}</div>
            </div>
            <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">📍 ${j.area} | Budget: ₹${j.budget}</p>
          </div>
        </div>
      `).join('') : '<p style="font-size:12px; color:var(--text-muted); text-align:center; padding:20px;">No active pipelines.</p>';
    }

    let currentFilter = 'all';
    function filterJobs(f, el) {
      currentFilter = f;
      if(el) {
        document.querySelectorAll('#pipeline-tabs .btab').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
      }
      renderMyJobs();
    }

    let windowCategoryFilter = null;
    function filterMyPosts(cat) {
      windowCategoryFilter = cat;
      switchNav(null, 'tab-category-hub');
      
      document.getElementById('hub-title').textContent = cat;
      document.getElementById('hub-promo-title').textContent = `Best Materials for ${cat}`;
      document.getElementById('hub-work-title').textContent = `My Posts: ${cat}`;
      
      renderCategoryHub();
    }

    function renderCategoryHub() {
      const supplierList = document.getElementById('hub-supplier-list');
      const jobList = document.getElementById('hub-job-list');
      
      const suppliers = [
        { name: "S.S Hardware", tag: "Fittings", icon: "🛠️" },
        { name: "Glass Hub", tag: "Supplier", icon: "🪟" },
        { name: "UPVC Profiles", tag: "Raw Profile", icon: "🏢" }
      ];
      
      supplierList.innerHTML = suppliers.map(s => `
        <div class="hp-card" style="flex:0 0 160px; min-height:140px; background:linear-gradient(135deg, #7C3AED 0%, #9086FF 100%);">
          <div class="hp-card-badge">${s.tag}</div>
          <h4 style="font-size:13px; line-height:1.2;">${s.name}</h4>
          <button class="hp-card-btn" style="padding:6px 12px; font-size:10px;" onclick="showToast('Materials Catalog Opening...')">View</button>
        </div>
      `).join('');

      let jobs = getJobs().filter(j => j.category === windowCategoryFilter).reverse();
      if(jobs.length === 0) {
        jobList.innerHTML = `<div style="text-align:center; padding:40px; background:#fff; border-radius:24px; border:1.5px dashed var(--border);"><p style="font-size:13px; color:var(--text-muted); font-weight:700;">No posts in ${windowCategoryFilter} yet.</p></div>`;
        return;
      }
      
      jobList.innerHTML = jobs.map(j => `
        <div class="booking-card" style="margin-bottom:12px;">
          <div style="padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div class="bc-title">${j.title}</div>
              <div class="bc-status-pill" style="background:var(--primary-light); color:var(--primary);">${j.status}</div>
            </div>
            <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">📍 ${j.area} | Budget: ₹${j.budget}</p>
          </div>
        </div>
      `).join('');
    }

    function renderMyJobs() {
      let jobs = getJobs();
      if(currentFilter === 'complete') jobs = jobs.filter(j => j.status === 'Completed');
      if(currentFilter === 'incomplete') jobs = jobs.filter(j => j.status === 'Active');
      if(windowCategoryFilter) jobs = jobs.filter(j => j.category === windowCategoryFilter);

      const list = document.getElementById('bookings-list');
      if(jobs.length === 0) { 
        list.innerHTML = `<div style="text-align:center; padding:40px 20px; margin: 20px 0; background: #fff; border-radius: 24px; border: 1.5px dashed var(--border); box-shadow: 0 4px 15px rgba(0,0,0,0.02);"><div style="font-size:40px; margin-bottom:12px;">📋</div><p style="color:var(--text-muted); font-weight:700;">No jobs found in this category.</p>
        ${windowCategoryFilter ? `<button onclick="filterMyPosts(null)" style="margin-top:16px; padding:10px 24px; border-radius:100px; background:#F8FAFC; border:1.5px solid var(--border); font-weight:700; color:var(--text-dark); cursor:pointer;">Clear Filter</button>` : ''}
        </div>`; 
        return; 
      }
      
      list.innerHTML = `
        ${windowCategoryFilter ? `<div style="text-align:right; margin-bottom:16px;"><span onclick="filterMyPosts(null)" style="font-size:12px; font-weight:700; color:#DC2626; cursor:pointer; background:#FEE2E2; padding:6px 12px; border-radius:100px;">Clear Filter ✕</span></div>` : ''}
        ${jobs.map(j => `
        <div class="booking-card">
          ${j.image ? `<img src="${j.image}" style="width:100%; height:160px; object-fit:cover;">` : ''}
          <div style="padding:20px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div class="bc-title">${j.title}</div>
              <div class="bc-status-pill" style="background:#EAE8FF; color:#9086FF;">${j.status}</div>
            </div>
            ${j.category ? `<div style="font-size:10px; font-weight:800; background:var(--primary-light); color:var(--primary); display:inline-block; padding:4px 8px; border-radius:8px; margin-top:8px;">${j.category}</div>` : ''}
            <p style="font-size:12px; color:var(--text-muted); margin-top:5px;">📍 ${j.area}, ${j.district} | ${j.sqft} sqft</p>
            <p style="font-size:15px; font-weight:800; color:var(--primary); margin-top:10px;">Platform Fee: ₹${j.budget}</p>
            ${j.status === 'Active' ? `<button onclick="closeJob('${j.id}')" style="margin-top:16px; width:100%; padding:14px; border:none; background:#059669; color:#fff; border-radius:16px; font-weight:800; cursor:pointer;">✓ Mark as Work Completed</button>` : ''}
          </div>
        </div>
      `).join('')}`;
    }

    function closeJob(id) {
       if(!confirm("Confirm work completion?")) return;
       db.collection("jobs").doc(id).update({ status: 'Completed' })
         .then(() => showToast("Work Status Updated!"));
    }

    function calculateFee() {
      const sqft = document.getElementById('post-sqft').value || 0;
      const feat = document.getElementById('post-feat').checked;
      let total = sqft * 1;
      if(feat) total += 199;
      document.getElementById('post-calculated-fee').textContent = total;
    }

    function confirmPost() {
      let title = document.getElementById('post-title').value;
      const categoryEl = document.getElementById('post-category');
      let category = categoryEl ? categoryEl.value : '';
      let district = document.getElementById('post-district').value;
      let area = document.getElementById('post-area-name').value;
      let phone = document.getElementById('post-phone').value;
      let sqft = document.getElementById('post-sqft').value;
      let desc = document.getElementById('post-desc').value;

      // Smart Auto-Fallbacks to guarantee post success even if fields are missed
      if(!category) category = "General Work";
      if(!title) title = category;
      if(!district) district = u.district || "Chennai";
      if(!area) area = "City Center";
      if(!phone) phone = "9876543210";
      if(!sqft) sqft = "100";
      if(!desc) desc = "Seeking skilled professional for " + title;

      const user = firebase.auth().currentUser;
      const uid = user ? user.uid : localUID;

      showToast("🚀 Dispatching to all Laborers in " + district + "...");
      
      const jobId = "JOB-" + Date.now();
      
      // Strict payload to prevent Firestore "Unsupported field value: undefined" crash!
      const payload = {
        id: jobId, 
        title: title || "General Work", 
        category: category || "General", 
        district: district || "Chennai", 
        area: area || "City Center", 
        phone: phone || "9999999999", 
        sqft: sqft || "100", 
        desc: desc || "Work description", 
        budget: sqft || "100",
        image: jobImageData || "", 
        status: 'Active', 
        contractor: u.name || "Guest Contractor", 
        contractorId: uid || localUID,
        date: new Date().toISOString(),
        createdAt: Date.now(),
        featured: !!document.getElementById('post-feat').checked
      };

      db.collection("jobs").doc(jobId).set(payload).then(() => {
        db.collection("district_alerts").add({
          district: payload.district, 
          title: "New Work in " + payload.area, 
          body: payload.title, 
          date: new Date().toISOString()
        });
        
        const popup = document.getElementById('success-popup');
        if(popup) popup.classList.add('show');
        
        setTimeout(() => {
          if(popup) popup.classList.remove('show');
          document.getElementById('post-title').value = "";
          document.getElementById('post-desc').value = "";
          document.getElementById('post-sqft').value = "";
          document.getElementById('post-area-name').value = "";
          removeJobImage();
          switchNav(document.getElementById('nav-bookings'), 'tab-bookings');
        }, 2200);
      }).catch(err => {
        showToast("System Error: " + err.message);
      });
    }

    function renewPlan() {
      openPayModal(1000, () => {
        let uData = JSON.parse(localStorage.getItem('tnpvc_user')) || u;
        let d = new Date(uData.subExp || new Date());
        if(d < new Date()) d = new Date();
        d.setDate(d.getDate() + 30);
        uData.subExp = d.toISOString();
        localStorage.setItem('tnpvc_user', JSON.stringify(uData));
        u.subExp = uData.subExp;
        showToast("Plan Extended Successfully!");
        renderDashboard();
      });
    }

    // REAL PAYMENT GATEWAY (Razorpay SDK Implementation)
    function openPayModal(amt, cb) {
      if(amt <= 0) { if(cb) cb(); return; }
      
      const options = {
        "key": "rzp_test_placeholder", // REPLACE WITH YOUR REAL RAZORPAY KEY ID
        "amount": amt * 100, // Amount in paise (e.g. 1000 INR = 100000 paise)
        "currency": "INR",
        "name": "TNPVC Connect Hub",
        "description": "Order for Platform Access/Job Post",
        "image": "https://ui-avatars.com/api/?name=TNPVC&background=9086FF&color=fff",
        "handler": function (response) {
          // This fires AFTER successful payment
          showToast("Payment Successful! Ref: " + response.razorpay_payment_id);
          if(cb) cb();
        },
        "prefill": {
          "name": u.name,
          "email": u.email || "user@example.com",
          "contact": u.phone || ""
        },
        "notes": {
          "address": "TNPVC Connect Hub HQ"
        },
        "theme": {
          "color": "#9086FF"
        }
      };
      
      const rzp = new Razorpay(options);
      
      rzp.on('payment.failed', function (response){
        alert("Payment Failed! " + response.error.description);
      });

      rzp.open();
    }
    
    // Fallback for manual close if modal existed (not needed for RZP but keeping for compatibility)
    function closePayModal() { 
      // Razorpay provides its own modal UI
    }

    let jobImageData = "";
    function handleJobImage(input) {
      if (!input.files || !input.files[0]) return;
      
      const file = input.files[0];
      
      // 1. INSTANT UI UPDATE (Lightning Fast Preview)
      const previewUrl = URL.createObjectURL(file);
      document.getElementById('post-img-tag').src = previewUrl;
      document.getElementById('post-image-preview').style.display = 'block';

      // 2. BACKGROUND PROCESSING (No Lag)
      const reader = new FileReader();
      reader.onload = (e) => {
         jobImageData = e.target.result; // Fallback to raw if compression fails
         
         const img = new Image();
         img.onload = () => {
            try {
               const canvas = document.createElement('canvas');
               const MAX = 600;
               let w = img.width, h = img.height;
               if (w > h && w > MAX) { h = Math.round(h * (MAX / w)); w = MAX; }
               else if (h > MAX) { w = Math.round(w * (MAX / h)); h = MAX; }
               canvas.width = w; canvas.height = h;
               canvas.getContext("2d").drawImage(img, 0, 0, w, h);
               jobImageData = canvas.toDataURL("image/jpeg", 0.5);
            } catch(e) { console.log("Silent fallback activated"); }
         };
         img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
    function removeJobImage() { jobImageData = ""; document.getElementById('post-image-preview').style.display = 'none'; document.getElementById('post-image-input').value = ""; }
    function showToast(m) { const t = document.getElementById('toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000); }
    function logout() { if(confirm("Logout?")) { localStorage.removeItem('tnpvc_user'); window.location.href = 'index.html'; } }

    // REAL-TIME NOTIFICATION LISTENER
    db.collection("notifications")
      .where("contractor", "==", u.name)
      .onSnapshot((snapshot) => {
        const notifs = [];
        snapshot.forEach((doc) => notifs.push({ id: doc.id, ...doc.data() }));
        window.activeNotifs = notifs.sort((a,b) => new Date(b.date) - new Date(a.date));
        checkNotifDot();
        if(document.getElementById('tab-notif').classList.contains('active')) renderNotifs();
      });

    function checkNotifDot() {
      const hasUnread = (window.activeNotifs || []).some(x => !x.read);
      document.getElementById('bell-dot').style.display = hasUnread ? 'block' : 'none';
    }

    function renderNotifs() {
      const list = document.getElementById('full-notif-list');
      const n = window.activeNotifs || [];
      if(n.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding:40px 20px; margin: 24px; background:#fff; border-radius: 24px; border: 1.5px dashed var(--border);"><div style="font-size:44px; margin-bottom:12px;">🔔</div><p style="color:var(--text-muted); font-weight:700; font-size:14px;">Your activity feed is empty.</p></div>`;
        return;
      }
      list.innerHTML = n.map(x => `
        <div class="notif-item" onclick="markRead('${x.id}')">
          <div class="ni-icon">👷</div>
          <div class="ni-content">
            <div class="ni-title">${x.title}</div>
            <div class="ni-body">${x.body}</div>
            <span class="ni-time">${new Date(x.date).toLocaleString()}</span>
          </div>
          ${!x.read ? '<div style="width:10px; height:10px; background:var(--primary); border-radius:50%;"></div>' : ''}
        </div>
      `).join('');
    }

    function markRead(id) {
       db.collection("notifications").doc(id).update({ read: true });
    }

    function clearNotifs() {
      if(!confirm("Are you sure you want to clear all notifications?")) return;
      const batch = db.batch();
      (window.activeNotifs || []).forEach(notif => {
         batch.delete(db.collection("notifications").doc(notif.id));
      });
      batch.commit().then(() => {
        showToast("Notifications Cleared");
        if(document.getElementById('notif-dropdown')) document.getElementById('notif-dropdown').classList.remove('show');
      });
    }

    function toggleMoreMenu(e) {
      if(e) e.stopPropagation();
      const drop = document.getElementById('notif-dropdown');
      drop.classList.toggle('show');
    }

    // Close menu on outside click
    window.onclick = function(e) {
      if(!e.target.closest('.more-menu')) {
        const drop = document.getElementById('notif-dropdown');
        if(drop) drop.classList.remove('show');
      }
    }

    renderDashboard();
    calculateFee();

    // PROMOTIONS LISTENER (Cards)
    db.collection('promotions').orderBy('createdAt', 'desc').onSnapshot(snap => {
      const scroller = document.querySelector('.ad-slider');
      if(!scroller) return;
      scroller.innerHTML = snap.docs.map(doc => {
        const p = doc.data();
        return `<div class="ad-card" style="background-image: url('${p.imageUrl}')">
          <h3>${p.title}</h3>
          <p>Verified Partner Promotion</p>
        </div>`;
      }).join('') + `
        <div class="ad-card ad-1">
          <h3>TNPVC Prime</h3>
          <p>Get exclusive access to top-tier verified workers.</p>
          <div class="ad-card-badge">HOT</div>
        </div>
        <div class="ad-card ad-2">
          <h3>Safety First</h3>
          <p>Guidelines for on-site safety and professional conduct.</p>
        </div>
      `;
    });

    // AUTO-SWIPE CAROUSEL LOGIC (5-Second Swipe)
    (function startBannerCarousel() {
      const scroller = document.querySelector('.home-promo-strip');
      if(!scroller) return;
      
      let currentPos = 0;
      const scrollCount = 3; // Number of hero banners

      setInterval(() => {
        currentPos = (currentPos + 1) % scrollCount;
        const cardWidth = scroller.offsetWidth; 
        scroller.scrollTo({
          left: currentPos * cardWidth,
          behavior: 'smooth'
        });
      }, 5000);
    })();
  
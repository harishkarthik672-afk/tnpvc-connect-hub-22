/* ===========================
   TNPVC Connect Hub - app.js
   All logic for routing, auth, jobs
   =========================== */

// --- APP STATE ---
let state = {
    role: null,        // 'contractor' | 'labour'
    user: null,        // signed up user object
    jobs: [            // Shared job store (mock seed data)
        {
            id: 1,
            title: 'UPVC Window Installation',
            desc: 'Supply and fix UPVC sliding windows for 3 residential floors. Professional tools and material will be provided.',
            location: 'Chromepet, Chennai',
            budget: '18,000',
            workers: 2,
            days: 3,
            phone: '9876543210',
            contractor: 'Sri Murugan Constructions',
            status: 'posted',
            applicants: []
        },
        {
            id: 2,
            title: 'PVC Main Door Fixing',
            desc: 'Install heavy-duty PVC door frame and shutter for 5 flats. All material ready at site.',
            location: 'Anna Nagar, Chennai',
            budget: '6,500',
            workers: 1,
            days: 1,
            phone: '8765432109',
            contractor: 'City Frame Works',
            status: 'posted',
            applicants: []
        },
        {
            id: 3,
            title: 'CPVC Pipe Fitting – Flat Block',
            desc: 'Full CPVC piping for 8 flats in a new apartment. Both hot and cold lines required.',
            location: 'Tambaram, Chennai',
            budget: '32,000',
            workers: 3,
            days: 5,
            phone: '7654321098',
            contractor: 'Rajan Plumbing Works',
            status: 'posted',
            applicants: []
        }
    ],
    acceptedJobs: []  // Jobs accepted by the logged-in labour
};

// --- DOM HELPERS ---
function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo(0, 0);
}

function el(id) { return document.getElementById(id); }

// --- ROLE SELECTION (Welcome Screen) ---
function chooseRole(role) {
    state.role = role;

    // Update visuals
    document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
    el('role-' + role).classList.add('selected');

    // Enable continue button
    el('btn-proceed').disabled = false;
}

function goToAuth(mode) {
    if (!state.role) return;

    // Update role badges
    const label = state.role === 'contractor' ? '🛠️ Contractor' : '👷 Labour';
    const badgeClass = state.role === 'contractor' ? 'contractor-badge' : 'labour-badge';

    if (mode === 'signup') {
        el('signup-role-badge').textContent = label + ' Signup';
        el('signup-role-badge').className = 'role-badge ' + badgeClass;
        updateSignupFields();
        show('screen-signup');
    } else {
        el('login-role-badge').textContent = label + ' Login';
        el('login-role-badge').className = 'role-badge ' + badgeClass;
        show('screen-login');
    }
}

// Initially called with no mode → goes to login
document.addEventListener('DOMContentLoaded', () => {
    // Patch proceed button
    el('btn-proceed').onclick = () => goToAuth('login');

    // Password confirm live check
    el('su-confirm').addEventListener('input', checkPasswordMatch);
    el('su-password').addEventListener('input', checkPasswordMatch);
});

function goBack(screenId) {
    show(screenId);
}

// --- SIGNUP FIELDS PER ROLE ---
function updateSignupFields() {
    if (state.role === 'labour') {
        el('contractor-extra').classList.add('hidden');
        el('labour-extra').classList.remove('hidden');
    } else {
        el('labour-extra').classList.add('hidden');
        el('contractor-extra').classList.remove('hidden');
    }
}

function checkPasswordMatch() {
    const pw = el('su-password').value;
    const cpw = el('su-confirm').value;
    const msg = el('pw-match-msg');
    if (!cpw) { msg.textContent = ''; return; }
    if (pw === cpw) {
        msg.textContent = '✓ Passwords match';
        msg.className = 'field-hint ok';
    } else {
        msg.textContent = '✗ Passwords do not match';
        msg.className = 'field-hint';
    }
}

function togglePassword(id) {
    const input = el(id);
    input.type = input.type === 'password' ? 'text' : 'password';
}

// --- LOGIN HANDLER ---
function handleLogin(e) {
    e.preventDefault();

    const email = el('login-email').value.trim();
    const password = el('login-password').value.trim();

    if (!email || !password) return;

    // For demo: accept any email/password combo, treat as the registered user or create a temp one
    if (!state.user) {
        // Simulate a returning user
        state.user = {
            name: email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            phone: '9000000000',
            email: email,
            aadhaar: 'XXXX-XXXX-1234',
            company: 'Demo Firm',
            skill: 'General Helper',
            role: state.role
        };
    }

    goToDashboard();
}

// --- SIGNUP HANDLER ---
function handleSignup(e) {
    e.preventDefault();

    const pw = el('su-password').value;
    const cpw = el('su-confirm').value;

    if (pw !== cpw) {
        el('pw-match-msg').textContent = '✗ Passwords do not match';
        el('pw-match-msg').className = 'field-hint';
        return;
    }

    // Save user
    state.user = {
        name: el('su-name').value.trim(),
        phone: el('su-phone').value.trim(),
        aadhaar: el('su-aadhaar').value.trim(),
        email: el('su-email').value.trim(),
        company: el('su-company') ? el('su-company').value.trim() : '',
        skill: el('su-skill') ? el('su-skill').value : '',
        role: state.role
    };

    // Show success screen
    el('success-msg').textContent = `Welcome, ${state.user.name}! Your account has been created.`;

    el('success-user-info').innerHTML = `
        <div class="success-info-row"><span>Role:</span> <strong>${state.role === 'contractor' ? '🛠️ Contractor' : '👷 Labour'}</strong></div>
        <div class="success-info-row"><span>Name:</span> <strong>${state.user.name}</strong></div>
        <div class="success-info-row"><span>Phone:</span> <strong>${state.user.phone}</strong></div>
        <div class="success-info-row"><span>Email:</span> <strong>${state.user.email}</strong></div>
    `;

    show('screen-success');
}

// --- NAVIGATE TO DASHBOARD ---
function goToDashboard() {
    if (!state.user) return;

    if (state.role === 'contractor') {
        populateContractorDashboard();
        show('screen-contractor');
    } else {
        populateLabourDashboard();
        show('screen-labour');
    }
}

// --- CONTRACTOR DASHBOARD ---
function populateContractorDashboard() {
    const u = state.user;
    const initials = u.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

    el('c-avatar').textContent = initials;
    el('c-name').textContent = u.name.split(' ')[0];

    // Profile tab
    el('c-profile-avatar').textContent = initials;
    el('c-profile-name').textContent = u.name;
    el('c-profile-phone').textContent = u.phone || '-';
    el('c-profile-email').textContent = u.email || '-';
    el('c-profile-aadhaar').textContent = u.aadhaar || '-';
    el('c-profile-company').textContent = u.company || '-';

    renderMyJobs();
}

function renderMyJobs() {
    const myJobs = state.jobs.filter(j => j.isOwn);
    const list = el('c-jobs-list');

    el('c-stat-jobs').textContent = myJobs.length;
    el('c-stat-applications').textContent = myJobs.reduce((sum, j) => sum + j.applicants.length, 0);
    el('c-stat-active').textContent = myJobs.filter(j => j.status === 'active').length;

    if (!myJobs.length) {
        list.innerHTML = `
            <div class="empty-state">
                <p>🗂️</p>
                <p>No jobs posted yet. Post your first work opportunity!</p>
                <button class="btn btn-outline" onclick="switchTab('c','post')">Post Job</button>
            </div>
        `;
        return;
    }

    list.innerHTML = myJobs.map(j => `
        <div class="job-card">
            <div class="job-card-top">
                <span class="job-card-title">${j.title}</span>
                <span class="status-tag status-${j.status}">${j.status.charAt(0).toUpperCase() + j.status.slice(1)}</span>
            </div>
            <div class="job-card-meta">
                <span class="meta-item">📍 ${j.location}</span>
                <span class="meta-item">💰 ₹${j.budget}</span>
                <span class="meta-item">👥 ${j.workers} workers</span>
                <span class="meta-item">⏱️ ${j.days} days</span>
            </div>
            <div class="job-card-actions">
                <button class="btn-sm" onclick="showApplications(${j.id})">Applications (${j.applicants.length})</button>
            </div>
        </div>
    `).join('');
}

function submitJob(e) {
    e.preventDefault();

    const job = {
        id: Date.now(),
        title: el('j-title').value,
        desc: el('j-desc').value,
        location: el('j-location').value,
        budget: el('j-budget').value,
        workers: el('j-workers').value,
        days: el('j-days').value,
        phone: el('j-phone').value || state.user.phone,
        contractor: state.user.name + (state.user.company ? ` (${state.user.company})` : ''),
        status: 'posted',
        applicants: [],
        isOwn: true
    };

    state.jobs.unshift(job);
    renderMyJobs();

    // Show success flash
    e.target.reset();
    switchTab('c', 'home');

    // Flash message
    showToast('✅ Job posted successfully!');
}

function showApplications(jobId) {
    const job = state.jobs.find(j => j.id === jobId);
    if (!job) return;
    alert(`Applications for "${job.title}":\n\n${job.applicants.length ? job.applicants.join('\n') : 'No applications yet.'}`);
}

// --- LABOUR DASHBOARD ---
function populateLabourDashboard() {
    const u = state.user;
    const initials = u.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

    el('l-avatar').textContent = initials;
    el('l-name').textContent = u.name.split(' ')[0];

    el('l-profile-avatar').textContent = initials;
    el('l-profile-name').textContent = u.name;
    el('l-profile-phone').textContent = u.phone || '-';
    el('l-profile-email').textContent = u.email || '-';
    el('l-profile-aadhaar').textContent = u.aadhaar || '-';
    el('l-profile-skill').textContent = u.skill || '-';

    renderJobFeed(state.jobs);
}

function filterJobs() {
    const query = el('job-search').value.toLowerCase();
    const filtered = state.jobs.filter(j =>
        j.title.toLowerCase().includes(query) ||
        j.location.toLowerCase().includes(query) ||
        j.contractor.toLowerCase().includes(query)
    );
    renderJobFeed(filtered);
}

function renderJobFeed(jobs) {
    const feed = el('l-jobs-feed');
    const count = jobs.length;
    el('job-count').textContent = count + ' job' + (count !== 1 ? 's' : '');

    if (!count) {
        feed.innerHTML = `<div class="empty-state"><p>🔍</p><p>No jobs match your search.</p></div>`;
        return;
    }

    feed.innerHTML = jobs.map(j => {
        const accepted = state.acceptedJobs.includes(j.id);
        return `
        <div class="labour-feed-card ${accepted ? 'accepted-card' : ''}" onclick="openJobModal(${j.id})">
            <div class="feed-card-top">
                <span class="feed-card-title">${j.title}</span>
                <span class="budget-badge">₹${j.budget}</span>
            </div>
            <div class="feed-card-meta">
                <span>📍 ${j.location}</span>
                <span>👥 ${j.workers} workers</span>
                <span>⏱️ ${j.days} days</span>
            </div>
            <div style="font-size:13px; color: var(--grey)">🏗️ ${j.contractor}</div>
            <div class="feed-card-actions" style="margin-top:14px">
                ${accepted
                    ? '<span style="color:var(--green);font-weight:700;font-size:14px">✅ Accepted</span>'
                    : `<button class="btn btn-primary" style="padding:10px;font-size:14px" onclick="event.stopPropagation();acceptJob(${j.id})">Accept Job</button>
                       <a href="tel:${j.phone}" class="btn btn-outline" style="padding:10px;font-size:14px;width:auto" onclick="event.stopPropagation()">📞 Call</a>`
                }
            </div>
        </div>
        `;
    }).join('');
}

// --- JOB MODAL ---
function openJobModal(jobId) {
    const job = state.jobs.find(j => j.id === jobId);
    if (!job) return;

    el('modal-job-title').textContent = job.title;
    el('modal-job-desc').innerHTML = `
        <strong>📍 Location:</strong> ${job.location}<br>
        <strong>💰 Budget:</strong> ₹${job.budget}<br>
        <strong>👥 Workers:</strong> ${job.workers}<br>
        <strong>⏱️ Duration:</strong> ${job.days} days<br>
        <strong>🏗️ Contractor:</strong> ${job.contractor}<br><br>
        ${job.desc}
    `;
    el('modal-call-btn').href = 'tel:' + job.phone;

    const accepted = state.acceptedJobs.includes(job.id);
    const acceptBtn = el('modal-accept-btn');
    if (accepted) {
        acceptBtn.textContent = '✅ Already Accepted';
        acceptBtn.disabled = true;
    } else {
        acceptBtn.textContent = '✅ Accept This Job';
        acceptBtn.disabled = false;
        acceptBtn.onclick = () => { acceptJob(job.id); closeModal(); };
    }

    el('accept-modal').classList.remove('hidden');
}

function closeModal() {
    el('accept-modal').classList.add('hidden');
}

function acceptJob(jobId) {
    if (!state.acceptedJobs.includes(jobId)) {
        state.acceptedJobs.push(jobId);

        // Add notification to contractor's job
        const job = state.jobs.find(j => j.id === jobId);
        if (job) job.applicants.push(state.user.name);

        renderJobFeed(state.jobs);
        renderMyAcceptedJobs();
        showToast('✅ Job accepted! Contractor notified.');
    }
}

function renderMyAcceptedJobs() {
    const container = el('l-my-works');
    const myJobs = state.jobs.filter(j => state.acceptedJobs.includes(j.id));

    if (!myJobs.length) {
        container.innerHTML = `
            <div class="empty-state">
                <p>📋</p>
                <p>No accepted jobs yet.</p>
                <button class="btn btn-outline" onclick="switchTab('l','jobs')">Browse Jobs</button>
            </div>
        `;
        return;
    }

    container.innerHTML = myJobs.map(j => `
        <div class="labour-feed-card accepted-card">
            <div class="feed-card-top">
                <span class="feed-card-title">${j.title}</span>
                <span class="status-tag status-active">Active</span>
            </div>
            <div class="feed-card-meta">
                <span>📍 ${j.location}</span>
                <span>💰 ₹${j.budget}</span>
                <span>⏱️ ${j.days} days</span>
            </div>
            <div style="font-size:13px;color:var(--grey);margin-top:4px">🏗️ ${j.contractor}</div>
            <a href="tel:${j.phone}" class="btn btn-outline" style="margin-top:12px;padding:10px;font-size:14px">📞 Call Contractor</a>
        </div>
    `).join('');
}

// --- TAB SWITCHING ---
function switchTab(role, tab) {
    // Hide all tabs for this role
    document.querySelectorAll(`#screen-${role === 'c' ? 'contractor' : 'labour'} .tab-content`)
        .forEach(t => t.classList.remove('active'));

    // Show target tab
    const tabEl = el(`${role}-tab-${tab}`);
    if (tabEl) tabEl.classList.add('active');

    // Update nav buttons
    document.querySelectorAll(`#screen-${role === 'c' ? 'contractor' : 'labour'} .nav-btn`)
        .forEach(b => b.classList.remove('active'));

    const navBtn = el(`${role}-nav-${tab}`);
    if (navBtn) navBtn.classList.add('active');

    // If switching to mywork tab on labour, refresh
    if (role === 'l' && tab === 'mywork') renderMyAcceptedJobs();
    if (role === 'c' && tab === 'home') renderMyJobs();
}

// --- LOGOUT ---
function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) return;
    state.user = null;
    state.role = null;
    state.acceptedJobs = [];

    // Reset role card selection
    document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
    el('btn-proceed').disabled = true;

    show('screen-welcome');
}

// --- TOAST ---
function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `
        position:fixed; bottom:90px; left:50%; transform:translateX(-50%);
        background:#111; color:#fff; padding:12px 20px; border-radius:12px;
        font-family:'Plus Jakarta Sans',sans-serif; font-size:14px; font-weight:600;
        z-index:9999; box-shadow:0 4px 20px rgba(0,0,0,0.2); white-space:nowrap;
    `;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.id === 'accept-modal') closeModal();
});

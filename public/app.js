// State management
let currentUser = null;
let allPolicies = [];
let allClaims = [];
let selectedClaimForInspection = null;

// Chart Instances
let metricsChart = null;
let exposureChart = null;
let billingChart = null;

// Pollers
let metricsInterval = null;
let prometheusInterval = null;

// App bootstrap
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
});

// Session Management
function checkSession() {
    const session = localStorage.getItem('cropinsure_user');
    if (session) {
        currentUser = JSON.parse(session);
        showApp();
    } else {
        showAuth();
    }
}

function showAuth() {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

function showApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';

    // Set user profile info in header
    document.getElementById('header-user-name').textContent = currentUser.fullname;
    
    const roleLabels = {
        farmer: 'Farmer / Policyholder',
        adjuster: 'Claims Adjuster',
        admin: 'System Manager',
        billing: 'Billing & Pricing Manager'
    };
    document.getElementById('header-user-role').textContent = roleLabels[currentUser.role] || currentUser.role;

    // Show correct dashboard panel
    showDashboard(currentUser.role);
}

function toggleAuthForms(formName) {
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    if (formName === 'login') {
        document.getElementById('login-form').classList.add('active');
    } else {
        document.getElementById('signup-form').classList.add('active');
    }
}

// Login Handler
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password_hash = document.getElementById('login-password').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password: password_hash })
        });
        const data = await res.json();
        
        if (res.ok) {
            localStorage.setItem('cropinsure_user', JSON.stringify(data.user));
            currentUser = data.user;
            showApp();
            document.getElementById('login-username').value = '';
            document.getElementById('login-password').value = '';
        } else {
            alert(data.error || 'Login failed.');
        }
    } catch (err) {
        alert('Could not connect to database. Make sure the database service is running.');
    }
}

// Signup Handler
async function handleSignup(e) {
    e.preventDefault();
    const fullname = document.getElementById('signup-fullname').value;
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;
    const role = document.getElementById('signup-role').value;
    const region = document.getElementById('signup-region').value;

    try {
        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role, fullname, region })
        });
        
        if (res.ok) {
            alert('Account created successfully! Please sign in.');
            toggleAuthForms('login');
            // Reset fields
            document.getElementById('signup-fullname').value = '';
            document.getElementById('signup-username').value = '';
            document.getElementById('signup-password').value = '';
            document.getElementById('signup-region').value = '';
        } else {
            const data = await res.json();
            alert(data.error || 'Signup failed.');
        }
    } catch (err) {
        alert('Could not connect to database.');
    }
}

// Logout Handler
function handleLogout() {
    localStorage.removeItem('cropinsure_user');
    currentUser = null;
    
    // Clear intervals
    if (metricsInterval) clearInterval(metricsInterval);
    if (prometheusInterval) clearInterval(prometheusInterval);
    
    // Destroy charts
    if (metricsChart) { metricsChart.destroy(); metricsChart = null; }
    if (exposureChart) { exposureChart.destroy(); exposureChart = null; }
    if (billingChart) { billingChart.destroy(); billingChart = null; }

    showAuth();
}

// Render role-specific dashboards
function showDashboard(role) {
    document.querySelectorAll('.dashboard-view').forEach(v => v.classList.remove('active'));

    // Reset components
    selectedClaimForInspection = null;
    const detailsDiv = document.getElementById('ndvi-inspection-details');
    if (detailsDiv) detailsDiv.style.display = 'none';
    const infoText = document.querySelector('#adjuster-inspection-card .info-text');
    if (infoText) infoText.style.display = 'block';

    if (role === 'farmer') {
        document.getElementById('dashboard-farmer').classList.add('active');
        document.getElementById('farmer-display-name').value = currentUser.fullname;
        fetchPolicies();
        fetchClaims();
    } else if (role === 'adjuster') {
        document.getElementById('dashboard-adjuster').classList.add('active');
        fetchClaims();
        renderAdjusterHistory();
    } else if (role === 'admin') {
        document.getElementById('dashboard-admin').classList.add('active');
        initAdminCharts();
        fetchVpcLogs();
        fetchS3Backups();
        startMetricsPoller();
        startPrometheusPoller();
    } else if (role === 'billing') {
        document.getElementById('dashboard-billing').classList.add('active');
        initBillingCharts();
        fetchPolicies();
        fetchClaims();
        recalculatePricing();
    }
}

// Fetch Policies (Filtered by role and user)
async function fetchPolicies() {
    try {
        const res = await fetch(`/api/policies?role=${currentUser.role}&username=${currentUser.username}`);
        allPolicies = await res.json();
        
        if (currentUser.role === 'farmer') {
            renderFarmerPoliciesTable();
            updateFarmerPolicyDropdown();
        } else if (currentUser.role === 'billing') {
            updateBillingDashboard();
        }
    } catch (e) {
        console.error('Error fetching policies', e);
    }
}

// Fetch Claims (Filtered by role and user)
async function fetchClaims() {
    try {
        const res = await fetch(`/api/claims?role=${currentUser.role}&username=${currentUser.username}`);
        allClaims = await res.json();
        
        if (currentUser.role === 'farmer') {
            renderFarmerClaimsTable();
        } else if (currentUser.role === 'adjuster') {
            renderAdjusterClaimsQueue();
        } else if (currentUser.role === 'billing') {
            updateBillingDashboard();
        }
    } catch (e) {
        console.error('Error fetching claims', e);
    }
}

// --- FARMER VIEWS HANDLERS ---

function renderFarmerPoliciesTable() {
    const tbody = document.querySelector('#policies-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (allPolicies.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No policies registered. Use form above to buy one.</td></tr>`;
        return;
    }

    allPolicies.forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${p.policy_number}</strong></td>
                <td>${p.crop_type}</td>
                <td>${p.acreage} Acres</td>
                <td>₹${parseFloat(p.sum_insured).toLocaleString()}</td>
                <td>₹${parseFloat(p.premium).toLocaleString()}</td>
                <td><span class="status-badge ${p.status}">${p.status}</span></td>
            </tr>
        `;
    });
}

function updateFarmerPolicyDropdown() {
    const select = document.getElementById('claim-policy-select');
    if (!select) return;
    select.innerHTML = '';
    
    const activePolicies = allPolicies.filter(p => p.status === 'Active');
    if (activePolicies.length === 0) {
        select.innerHTML = `<option value="">No Active Policies Available</option>`;
        document.getElementById('claim-crop-type').value = '';
        document.getElementById('claim-amount').value = '';
        return;
    }
    
    activePolicies.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.policy_number} (${p.crop_type})</option>`;
    });
    updateClaimFormCrop();
}

function updateClaimFormCrop() {
    const select = document.getElementById('claim-policy-select');
    if (!select) return;
    const policyId = parseInt(select.value);
    const policy = allPolicies.find(p => p.id === policyId);
    
    if (policy) {
        document.getElementById('claim-crop-type').value = policy.crop_type;
        calculateClaimAmount(policy);
    }
}

function updateDamageValue(val) {
    document.getElementById('damage-pct-val').textContent = `${val}% Damage`;
    const select = document.getElementById('claim-policy-select');
    if (!select) return;
    const policyId = parseInt(select.value);
    const policy = allPolicies.find(p => p.id === policyId);
    if (policy) calculateClaimAmount(policy);
}

function calculateClaimAmount(policy) {
    const pct = parseInt(document.getElementById('damage-pct').value) / 100;
    const payout = (policy.sum_insured * pct).toFixed(2);
    document.getElementById('claim-amount').value = `₹${parseFloat(payout).toLocaleString()}`;
}

function calculateEstimates() {
    const acres = parseInt(document.getElementById('acreage').value) || 0;
    const sumInsured = acres * 1200;
    const premium = sumInsured * 0.05;
    
    document.getElementById('sum-insured').value = `₹${sumInsured.toLocaleString()}`;
    document.getElementById('premium').value = `₹${premium.toLocaleString()}`;
}

async function submitPolicy(e) {
    e.preventDefault();
    const crop_type = document.getElementById('crop-type').value;
    const acreage = parseFloat(document.getElementById('acreage').value);
    const sum_insured = acreage * 1200;
    const premium = sum_insured * 0.05;

    const res = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: currentUser.username,
            crop_type,
            acreage,
            sum_insured,
            premium
        })
    });
    if (res.ok) {
        alert('Policy purchased successfully!');
        fetchPolicies();
    }
}

async function submitClaim(e) {
    e.preventDefault();
    const policy_id = parseInt(document.getElementById('claim-policy-select').value);
    const crop_type = document.getElementById('claim-crop-type').value;
    const estimated_damage_pct = parseFloat(document.getElementById('damage-pct').value);
    
    const policy = allPolicies.find(p => p.id === policy_id);
    if (!policy) return;
    const claim_amount = policy.sum_insured * (estimated_damage_pct / 100);
    const remarks = document.getElementById('claim-remarks').value;

    const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            policy_id,
            crop_type,
            estimated_damage_pct,
            claim_amount,
            remarks
        })
    });
    const data = await res.json();
    if (res.ok) {
        alert(`Claim submitted! Remote satellite validation recorded NDVI Crop Index of ${data.ndvi_health_index}. Undergoing review.`);
        document.getElementById('claim-remarks').value = '';
        fetchClaims();
        fetchPolicies();
    }
}

function renderFarmerClaimsTable() {
    const tbody = document.querySelector('#farmer-claims-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (allClaims.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">No claims filed yet.</td></tr>`;
        return;
    }

    allClaims.forEach(c => {
        const remarksSplit = c.remarks ? c.remarks.split('\nAdjuster Note: ') : ['', 'No review notes yet.'];
        const farmerRemarks = remarksSplit[0];
        const adjusterNotes = remarksSplit[1] || 'Undergoing evaluation by regional adjusters.';

        tbody.innerHTML += `
            <tr>
                <td><strong>${c.claim_number}</strong></td>
                <td>${c.crop_type}</td>
                <td>${new Date(c.reported_loss_date).toLocaleDateString()}</td>
                <td>${c.estimated_damage_pct}%</td>
                <td>₹${parseFloat(c.claim_amount).toLocaleString()}</td>
                <td><span class="status-badge ${c.status.replace(" ", ".")}">${c.status}</span></td>
                <td style="font-size: 0.85rem; color: var(--text-secondary);"><em>${adjusterNotes}</em></td>
            </tr>
        `;
    });
}


// --- CLAIMS ADJUSTER DASHBOARD ---

function renderAdjusterClaimsQueue() {
    const tbody = document.querySelector('#claims-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const pendingClaims = allClaims.filter(c => c.status === 'Pending Review');
    
    if (pendingClaims.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">No pending claims in the queue.</td></tr>`;
        return;
    }

    pendingClaims.forEach(c => {
        tbody.innerHTML += `
            <tr onclick="selectClaimForReview(${c.id})" class="clickable-row">
                <td><strong>${c.claim_number}</strong></td>
                <td>${c.crop_type}</td>
                <td>${c.estimated_damage_pct}%</td>
                <td>₹${parseFloat(c.claim_amount).toLocaleString()}</td>
                <td><strong>${c.ndvi_health_index}</strong></td>
                <td><span class="status-badge Pending">${c.status}</span></td>
                <td><button class="btn primary-btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Inspect</button></td>
            </tr>
        `;
    });
}

function selectClaimForReview(claimId) {
    selectedClaimForInspection = allClaims.find(c => c.id === claimId);
    if (!selectedClaimForInspection) return;

    document.getElementById('ndvi-inspection-details').style.display = 'block';
    document.querySelector('#adjuster-inspection-card .info-text').style.display = 'none';

    const ndvi = parseFloat(selectedClaimForInspection.ndvi_health_index);
    document.getElementById('ndvi-numerical-val').textContent = ndvi;
    
    const marker = document.getElementById('ndvi-marker');
    marker.style.left = `${ndvi * 100}%`;

    let analysisMsg = '';
    if (ndvi < 0.4) {
        analysisMsg = `⚠️ <strong>Remote Sensing Alert:</strong> NDVI of ${ndvi} represents highly stressed crops. Corresponds to drought/frost claim. <strong>Recommendation: APPROVE</strong>.`;
    } else {
        analysisMsg = `ℹ&nbsp; <strong>Remote Sensing Alert:</strong> NDVI of ${ndvi} indicates healthy green vegetation. Discrepancy detected. <strong>Recommendation: REJECT/INVESTIGATE</strong>.`;
    }
    document.getElementById('ndvi-analysis-result').innerHTML = analysisMsg;
    document.getElementById('adjuster-notes').value = '';
}

async function processClaim(status) {
    if (!selectedClaimForInspection) return;

    const remarks = document.getElementById('adjuster-notes').value;
    if (!remarks.trim()) {
        alert('Please fill out the investigation notes first.');
        return;
    }

    const res = await fetch(`/api/claims/${selectedClaimForInspection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, remarks })
    });

    if (res.ok) {
        alert(`Claim ${selectedClaimForInspection.claim_number} successfully ${status.toLowerCase()}!`);
        document.getElementById('ndvi-inspection-details').style.display = 'none';
        document.querySelector('#adjuster-inspection-card .info-text').style.display = 'block';
        
        // Add to adjuster local audit history
        saveAdjusterAudit(selectedClaimForInspection.claim_number, status, remarks);
        
        selectedClaimForInspection = null;
        fetchClaims();
    }
}

function saveAdjusterAudit(claimNum, action, remarks) {
    let auditList = JSON.parse(localStorage.getItem('adjuster_audit') || '[]');
    auditList.unshift({ claimNum, action, remarks, date: new Date().toLocaleTimeString() });
    localStorage.setItem('adjuster_audit', JSON.stringify(auditList));
    renderAdjusterHistory();
}

function renderAdjusterHistory() {
    const tbody = document.querySelector('#adjuster-history-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const audits = JSON.parse(localStorage.getItem('adjuster_audit') || '[]');
    if (audits.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-secondary);">No decisions audit trail logged yet.</td></tr>`;
        return;
    }

    audits.forEach(a => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${a.claimNum}</strong></td>
                <td><span class="status-badge ${a.action}">${a.action}</span></td>
                <td style="font-size: 0.8rem; color: var(--text-secondary); max-width: 150px; overflow: hidden; text-overflow: ellipsis;">${a.remarks}</td>
            </tr>
        `;
    });
}


// --- SYSTEM MANAGER (ADMIN) DASHBOARD ---

function startMetricsPoller() {
    if (metricsInterval) clearInterval(metricsInterval);
    
    metricsInterval = setInterval(async () => {
        try {
            const res = await fetch('/api/monitoring/metrics');
            const data = await res.json();
            
            document.getElementById('cpu-val').textContent = `${data.current.cpu}%`;
            document.getElementById('ram-val').textContent = `${data.current.memory}%`;
            
            updateMetricsChart(data.history);
        } catch (e) {
            console.error('Error fetching metrics', e);
        }
    }, 4000);
}

function startPrometheusPoller() {
    if (prometheusInterval) clearInterval(prometheusInterval);
    
    const pollProm = async () => {
        try {
            const res = await fetch('/api/monitoring/prometheus');
            const text = await res.text();
            const consoleBox = document.getElementById('prometheus-output');
            if (consoleBox) consoleBox.textContent = text;
        } catch (e) {}
    };

    pollProm();
    prometheusInterval = setInterval(pollProm, 5000);
}

async function fetchVpcLogs() {
    try {
        const res = await fetch('/api/networking/vpc-logs');
        const logs = await res.json();
        const logsDiv = document.getElementById('vpc-logs');
        if (!logsDiv) return;
        logsDiv.innerHTML = logs.map(l => `<div>${l}</div>`).join('');
    } catch(e) {}
}

async function fetchS3Backups() {
    try {
        const res = await fetch('/api/storage/backups');
        const files = await res.json();
        const filesDiv = document.getElementById('s3-files');
        if (!filesDiv) return;
        if (files.length === 0) {
            filesDiv.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.8rem;">No backups in S3 vault.</div>';
            return;
        }
        filesDiv.innerHTML = files.map(f => `
            <div class="s3-item">
                <span>📁 ${f.name}</span>
                <span>${f.size}</span>
            </div>
        `).join('');
    } catch(e) {}
}

async function runAdminScript(scriptName) {
    const term = document.getElementById('terminal-output');
    if (!term) return;
    term.textContent = `Executing: bash scripts/${scriptName}...`;
    
    try {
        const res = await fetch('/api/admin/run-script', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scriptName })
        });
        const data = await res.json();
        term.textContent = data.output;
        
        if (scriptName === 'backup.sh') fetchS3Backups();
        if (scriptName === 'monitor.sh') fetchVpcLogs();
    } catch (e) {
        term.textContent = `Execution failed: ${e.message}`;
    }
}

// System Manager Charts
function initAdminCharts() {
    const metricsCanvas = document.getElementById('metricsChart');
    if (!metricsCanvas) return;
    
    const ctx = metricsCanvas.getContext('2d');
    if (metricsChart) metricsChart.destroy();
    
    metricsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(15).fill(''),
            datasets: [{
                label: 'CPU (%)',
                borderColor: '#10b981', // Emerald
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                data: Array(15).fill(0),
                fill: true,
                tension: 0.25
            }, {
                label: 'RAM (%)',
                borderColor: '#0284c7', // Sky blue
                backgroundColor: 'rgba(2, 132, 199, 0.05)',
                data: Array(15).fill(0),
                fill: true,
                tension: 0.25
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    min: 0, 
                    max: 100,
                    grid: { color: '#f1f5f9' },
                    ticks: { color: '#64748b' }
                },
                x: {
                    grid: { display: false },
                    ticks: { display: false }
                }
            },
            plugins: {
                legend: { labels: { color: '#0f172a', font: { family: 'Outfit', size: 11 } } }
            }
        }
    });
}

function updateMetricsChart(history) {
    if (!metricsChart) return;
    const labels = history.map(h => new Date(h.timestamp).toLocaleTimeString());
    const cpuData = history.map(h => h.cpu_utilization);
    const ramData = history.map(h => h.memory_utilization);
    
    metricsChart.data.labels = labels;
    metricsChart.data.datasets[0].data = cpuData;
    metricsChart.data.datasets[1].data = ramData;
    metricsChart.update();
}


// --- BILLING & PRICING DASHBOARD ---

function updateBillingDashboard() {
    let totalPremium = 0;
    let totalClaimsPaid = 0;
    
    allPolicies.forEach(p => totalPremium += parseFloat(p.premium));
    allClaims.forEach(c => {
        if (c.status === 'Approved' || c.status === 'Disbursed') {
            totalClaimsPaid += parseFloat(c.claim_amount);
        }
    });

    const lossRatio = totalPremium > 0 ? ((totalClaimsPaid / totalPremium) * 100).toFixed(0) : 0;
    
    document.getElementById('billing-premium').textContent = `₹${totalPremium.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('billing-claims').textContent = `₹${totalClaimsPaid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('billing-ratio').textContent = `${lossRatio}%`;
    
    updateExposureChart();
}

function recalculatePricing() {
    const priceCompEl = document.getElementById('price-compute');
    if (!priceCompEl) return;
    
    const compVal = priceCompEl.value;
    const regions = parseInt(document.getElementById('price-regions').value);
    const storageGB = parseInt(document.getElementById('price-storage').value);
    const sla = document.getElementById('price-sla').value;
    
    let computeCost = compVal === 't3.medium' ? 2520 : compVal === 'm5.large' ? 5810 : 20600;
    let storageCost = storageGB * 1.90; // S3 standard ₹1.90/GB-month
    let slaCost = sla === 'bronze' ? 1245 : sla === 'silver' ? 7470 : 23240;
    
    // Formula: (Compute * Region Redundancy) + Storage + SLA Tier base
    const total = (computeCost * regions) + storageCost + slaCost;
    document.getElementById('total-monthly-cost').textContent = `₹${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    updateBillingChart(computeCost * regions, storageCost, slaCost);
}

function updateStorageLabel(val) {
    const cost = (val * 1.90).toFixed(2);
    document.getElementById('price-storage-val').textContent = `${val} GB (₹${parseFloat(cost).toLocaleString()}/mo)`;
}

// Billing Charts
function initBillingCharts() {
    // 1. Billing Allocation Chart
    const ctxBill = document.getElementById('billingChart').getContext('2d');
    if (billingChart) billingChart.destroy();
    
    billingChart = new Chart(ctxBill, {
        type: 'bar',
        data: {
            labels: ['Compute (EC2)', 'Storage (S3)', 'Disaster Recovery (SLA)'],
            datasets: [{
                label: 'Cost (₹ / month)',
                data: [0, 0, 0],
                backgroundColor: ['#059669', '#0284c7', '#d97706'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                    ticks: { color: '#64748b' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { family: 'Outfit' } }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });

    // 2. Exposure doughnut chart
    const ctxExposure = document.getElementById('cropExposureChart').getContext('2d');
    if (exposureChart) exposureChart.destroy();

    exposureChart = new Chart(ctxExposure, {
        type: 'doughnut',
        data: {
            labels: ['Corn', 'Soybeans', 'Wheat', 'Rice'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'right', 
                    labels: { color: '#0f172a', font: { family: 'Outfit', size: 12 } } 
                }
            }
        }
    });
}

function updateBillingChart(compute, storage, backup) {
    if (!billingChart) return;
    billingChart.data.datasets[0].data = [compute, storage, backup];
    billingChart.update();
}

function updateExposureChart() {
    if (!exposureChart) return;
    const crops = { 'Corn': 0, 'Soybeans': 0, 'Wheat': 0, 'Rice': 0 };
    
    allPolicies.forEach(p => {
        if (crops[p.crop_type] !== undefined) {
            crops[p.crop_type] += parseFloat(p.sum_insured);
        }
    });

    exposureChart.data.datasets[0].data = [
        crops['Corn'],
        crops['Soybeans'],
        crops['Wheat'],
        crops['Rice']
    ];
    exposureChart.update();
}

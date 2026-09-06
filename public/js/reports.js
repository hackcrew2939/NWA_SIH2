/**
 * NWA (National Weather Analytics) - Citizen Reporting & Moderation Module
 * Handles crowd-sourced report submissions, image preview, moderation actions, and list filtering.
 * Features built-in local persistence fallback if backend is offline.
 */

let currentFilter = 'all'; // 'all', 'unverified', 'verified'
let cachedReports = [];

const DEFAULT_SEED_REPORTS = [
  {
    id: 'rep-001',
    source: 'citizen',
    category: 'heavy_rain',
    location: 'Marine Drive, Mumbai',
    state: 'Maharashtra',
    lat: 18.9438,
    lon: 72.8232,
    description: 'Waterlogging up to 1.5 ft near Churchgate station. Traffic slow moving.',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    verified_status: 'verified',
    reporter_name: 'Aakash Mehta',
    urgency: 'medium'
  },
  {
    id: 'rep-002',
    source: 'citizen',
    category: 'cyclone',
    location: 'Puri Beach Road',
    state: 'Odisha',
    lat: 19.7983,
    lon: 85.8249,
    description: 'High storm surge and gusty winds exceeding 75 km/h. Sea rough, fishermen advised not to venture.',
    timestamp: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    verified_status: 'verified',
    reporter_name: 'Priyanka Das',
    urgency: 'high'
  },
  {
    id: 'rep-003',
    source: 'citizen',
    category: 'heatwave',
    location: 'Churu District',
    state: 'Rajasthan',
    lat: 28.2900,
    lon: 74.9600,
    description: 'Severe heatwave conditions with loo winds. Outdoor activity minimal after 11 AM.',
    timestamp: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    verified_status: 'verified',
    reporter_name: 'Sunil Sharma',
    urgency: 'high'
  },
  {
    id: 'rep-004',
    source: 'citizen',
    category: 'thunderstorm',
    location: 'Whitefield, Bengaluru',
    state: 'Karnataka',
    lat: 12.9698,
    lon: 77.7500,
    description: 'Sudden intense thunderstorm with frequent lightning and localized power outages.',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    verified_status: 'unverified',
    reporter_name: 'Rohan Iyer',
    urgency: 'medium'
  },
  {
    id: 'rep-005',
    source: 'citizen',
    category: 'flood',
    location: 'Kaziranga National Park',
    state: 'Assam',
    lat: 26.5775,
    lon: 93.1711,
    description: 'Brahmaputra water level breached danger mark, low-lying animal corridors inundated.',
    timestamp: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
    verified_status: 'verified',
    reporter_name: 'Himanta Borah',
    urgency: 'high'
  }
];

function getReportsFromLocalStorage() {
  try {
    const raw = localStorage.getItem('nwa_local_reports');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  localStorage.setItem('nwa_local_reports', JSON.stringify(DEFAULT_SEED_REPORTS));
  return [...DEFAULT_SEED_REPORTS];
}

function saveReportsToLocalStorage(reports) {
  try {
    localStorage.setItem('nwa_local_reports', JSON.stringify(reports));
  } catch (e) {}
}

async function loadCitizenReports() {
  const base = window.NWAWeather ? window.NWAWeather.getApiBaseUrl() : '';

  try {
    let url = `${base}/api/v1/reports`;
    if (currentFilter !== 'all') {
      url += `?status=${encodeURIComponent(currentFilter)}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error('Backend offline');
    const data = await res.json();
    cachedReports = Array.isArray(data) ? data : (data.reports || []);
    saveReportsToLocalStorage(cachedReports);
  } catch (err) {
    // Fallback to local storage
    const all = getReportsFromLocalStorage();
    cachedReports = currentFilter === 'all' 
      ? all 
      : all.filter(r => r.verified_status === currentFilter);
  }

  renderReportsList(cachedReports);

  // Update map overlay markers
  if (window.NWAMap && window.NWAMap.updateCitizenMapMarkers) {
    window.NWAMap.updateCitizenMapMarkers(cachedReports);
  }
}

function renderReportsList(reports) {
  const container = document.getElementById('reportsListContainer');
  if (!container) return;

  if (!reports || reports.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card" style="margin: 1rem 0;">
        <div class="empty-state-icon">
          <i class="fa-solid fa-clipboard-check"></i>
        </div>
        <div class="empty-state-title">No Weather Reports Found</div>
        <p class="empty-state-desc">There are no citizen incident reports matching the active filter criteria.</p>
        <button type="button" class="btn btn-outline" onclick="NWAReports.filterReports('all')" style="margin-top: 0.5rem;">
          <i class="fa-solid fa-rotate-left"></i> View All Reports
        </button>
      </div>
    `;
    return;
  }

  const catLabels = {
    heavy_rain: 'Heavy Rain',
    flood: 'Flash Flood',
    cyclone: 'Cyclone',
    heatwave: 'Heatwave',
    fog: 'Dense Fog',
    dust_storm: 'Dust Storm',
    strong_winds: 'Strong Winds',
    hailstorm: 'Hailstorm',
    thunderstorm: 'Thunderstorm',
    other: 'Severe Weather'
  };

  container.innerHTML = reports.map(r => {
    const isUnverified = r.verified_status === 'unverified';
    let statusClass = 'status-unverified';
    let statusText = 'PENDING VERIFICATION';
    if (r.verified_status === 'verified') {
      statusClass = 'status-verified';
      statusText = 'VERIFIED';
    } else if (r.verified_status === 'flagged_fake') {
      statusClass = 'status-rejected';
      statusText = 'FLAGGED FAKE';
    } else if (r.verified_status === 'rejected') {
      statusClass = 'status-rejected';
      statusText = 'REJECTED';
    } else if (r.verified_status === 'duplicate') {
      statusClass = 'status-unverified';
      statusText = 'DUPLICATE';
    }

    const timeAgo = formatTimeAgo(r.timestamp);

    return `
      <div class="report-item" id="report-${r.id}">
        <div class="report-item-header">
          <span class="category-tag cat-${r.category}">
            <i class="fa-solid fa-triangle-exclamation"></i>
            ${catLabels[r.category] || r.category || 'Weather Incident'}
          </span>
          <span class="status-badge ${statusClass}">
            ${statusText}
          </span>
        </div>
        <div class="report-location">
          <i class="fa-solid fa-location-dot" style="color: var(--accent-primary);"></i>
          ${escapeHtml(r.location)} ${r.state ? `<span style="font-weight:400; font-size:12px; color:var(--text-secondary);">(${escapeHtml(r.state)})</span>` : ''}
        </div>
        <p class="report-desc">${escapeHtml(r.description || 'No description provided.')}</p>
        ${r.photo ? `<img src="${r.photo}" style="max-height: 140px; border-radius: 6px; object-fit: cover; width: 100%; border: 1px solid var(--border-color); margin-top: 0.5rem;" alt="Report Attachment" />` : ''}
        ${r.video_url ? `<div style="margin-top: 0.5rem; font-size: 0.8rem;"><a href="${escapeHtml(r.video_url)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-primary); text-decoration: none;"><i class="fa-solid fa-video"></i> View Video Stream</a></div>` : ''}
        <div class="report-meta" style="margin-top: 0.75rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <span style="font-size: 0.8rem; color: var(--text-secondary);">
            <i class="fa-solid fa-user-pen" style="margin-right: 4px;"></i> By ${escapeHtml(r.reporter_name || 'Citizen Contributor')} • ${timeAgo}
          </span>
          ${isUnverified ? `
            <div class="moderation-actions" style="display: flex; gap: 0.4rem;">
              <button class="mod-btn verify" onclick="NWAReports.moderateReport('${r.id}', 'verify')" title="Verify Report">
                <i class="fa-solid fa-check"></i> Verify
              </button>
              <button class="mod-btn reject" onclick="NWAReports.moderateReport('${r.id}', 'reject')" title="Reject Report">
                <i class="fa-solid fa-xmark"></i> Reject
              </button>
            </div>
          ` : `
            <div style="font-size: 0.75rem; color: var(--text-muted);">
              ${r.verified_status === 'verified' ? '<i class="fa-solid fa-shield-check" style="color: #10b981;"></i> Observation Verified' : 'Status: ' + escapeHtml(r.verified_status)}
            </div>
          `}
        </div>
      </div>
    `;
  }).join('');
}

async function handleReportSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  const category = document.getElementById('reportCategory')?.value || 'heavy_rain';
  const location = document.getElementById('reportLocation')?.value?.trim() || '';
  const state = document.getElementById('reportState')?.value?.trim() || '';
  const lat = parseFloat(document.getElementById('reportLat')?.value);
  const lon = parseFloat(document.getElementById('reportLon')?.value);
  const description = document.getElementById('reportDescription')?.value?.trim() || '';
  const reporterName = document.getElementById('reportReporterName')?.value?.trim() || '';
  const photoPreview = document.getElementById('previewThumbnail');
  const videoInput = document.getElementById('reportVideo');
  const videoUrl = videoInput ? videoInput.value.trim() : '';

  if (!category || !location || isNaN(lat) || isNaN(lon)) {
    if (window.NWAApp && window.NWAApp.showToast) {
      window.NWAApp.showToast('Please fill out all required fields and ensure valid coordinates.', 'error');
    } else {
      alert('Please fill out all required fields and ensure valid coordinates.');
    }
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
  }

  const hasPhoto = Boolean(photoPreview && photoPreview.src && photoPreview.src.startsWith('data:image'));

  const payload = {
    id: `rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    source: 'citizen',
    category,
    location,
    state: state || 'India',
    lat,
    lon,
    description,
    reporter_name: reporterName || 'Citizen Contributor',
    photo: hasPhoto ? photoPreview.src : null,
    video_url: videoUrl || null,
    timestamp: new Date().toISOString(),
    verified_status: 'unverified',
    urgency: 'medium'
  };

  const base = window.NWAWeather ? window.NWAWeather.getApiBaseUrl() : '';

  try {
    const res = await fetch(`${base}/api/v1/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Backend submission error');
    }
    const data = await res.json();
    if (data && data.report) {
      // Prepend to local cache
      const all = getReportsFromLocalStorage();
      all.unshift(data.report);
      saveReportsToLocalStorage(all);
    }
  } catch (err) {
    console.warn('Backend reporting notice:', err.message);
    const all = getReportsFromLocalStorage();
    all.unshift(payload);
    saveReportsToLocalStorage(all);
  }

  if (window.NWAApp && window.NWAApp.showToast) {
    window.NWAApp.showToast('Weather report submitted! Queued in Verification Portal.', 'success');
  }

  closeReportModal();
  form.reset();
  clearPhotoAttachment();

  // Instantly reload citizen reports and sync with Admin Portal
  await loadCitizenReports();
  if (window.NWAAdmin && window.NWAAdmin.loadAdminData) {
    window.NWAAdmin.loadAdminData();
  }

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Weather Report';
  }
}

async function moderateReport(reportId, action) {
  const base = window.NWAWeather ? window.NWAWeather.getApiBaseUrl() : '';
  const token = localStorage.getItem('nwa_admin_token') || '';

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['x-admin-token'] = token;

    const res = await fetch(`${base}/api/v1/reports/${encodeURIComponent(reportId)}/moderate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action })
    });
    if (!res.ok) throw new Error('Backend moderation failed');
  } catch (err) {
    // Update local storage
    const all = getReportsFromLocalStorage();
    const rep = all.find(r => r.id === reportId);
    if (rep) {
      rep.verified_status = action === 'verify' ? 'verified' : (action === 'reject' ? 'rejected' : action);
      saveReportsToLocalStorage(all);
    }
  }

  if (window.NWAApp && window.NWAApp.showToast) {
    window.NWAApp.showToast(`Report marked as ${action === 'verify' ? 'verified' : action}!`, 'success');
  }
  await loadCitizenReports();
  if (window.NWAAdmin && window.NWAAdmin.loadAdminData) {
    window.NWAAdmin.loadAdminData();
  }
}

function filterReports(status) {
  currentFilter = status;
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-status') === status);
  });
  loadCitizenReports();
}

function openReportModal(prefillLocation = null) {
  const modal = document.getElementById('reportModal');
  if (!modal) return;

  const loc = prefillLocation || (window.NWAApp && window.NWAApp.getCurrentLocation ? window.NWAApp.getCurrentLocation() : null);

  if (loc) {
    const locInput = document.getElementById('reportLocation') || document.getElementById('qrLocation');
    const stateInput = document.getElementById('reportState') || document.getElementById('qrState');
    const cityInput = document.getElementById('reportCitySelect') || document.getElementById('qrCitySelect');
    const latInput = document.getElementById('reportLat') || document.getElementById('qrLat');
    const lonInput = document.getElementById('reportLon') || document.getElementById('qrLon');

    if (window.NWAApp && window.NWAApp.fillLocationFormFields) {
      window.NWAApp.fillLocationFormFields(stateInput, cityInput, locInput, latInput, lonInput, loc.lat, loc.lon, loc.name, loc.state);
    }
  }

  modal.classList.add('active');
}

function closeReportModal() {
  const modal = document.getElementById('reportModal');
  if (modal) modal.classList.remove('active');
}

function handlePhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 4 * 1024 * 1024) {
    if (window.NWAApp && window.NWAApp.showToast) {
      window.NWAApp.showToast('Photo must be under 4MB', 'error');
    } else {
      alert('Photo must be under 4MB');
    }
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    const preview = document.getElementById('previewThumbnail');
    const previewContainer = document.getElementById('photoPreviewContainer');
    const uploadLabel = document.getElementById('photoUploadLabel');
    const fileNameEl = document.getElementById('previewFileName');

    if (preview) preview.src = evt.target.result;
    if (fileNameEl) fileNameEl.textContent = file.name || 'Photo Attached';
    if (previewContainer) previewContainer.style.display = 'flex';
    if (uploadLabel) uploadLabel.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function clearPhotoAttachment() {
  const input = document.getElementById('reportPhoto');
  const previewContainer = document.getElementById('photoPreviewContainer');
  const preview = document.getElementById('previewThumbnail');
  const uploadLabel = document.getElementById('photoUploadLabel');

  if (input) input.value = '';
  if (preview) preview.src = '';
  if (previewContainer) previewContainer.style.display = 'none';
  if (uploadLabel) uploadLabel.style.display = 'flex';
}

function formatTimeAgo(isoString) {
  if (!isoString) return 'Just now';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}

window.NWAReports = {
  loadCitizenReports,
  handleReportSubmit,
  moderateReport,
  filterReports,
  openReportModal,
  closeReportModal,
  handlePhotoUpload,
  clearPhotoAttachment,
  getCachedReports: () => (cachedReports && cachedReports.length > 0 ? cachedReports : getReportsFromLocalStorage())
};

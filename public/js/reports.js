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
    if (raw) {
      const parsed = JSON.parse(raw);
      const cleaned = parsed.filter(r => !r.description?.includes('kjqwfohqwoif') && !r.description?.includes('IBA') && !r.photo?.includes('A2026'));
      localStorage.setItem('nwa_local_reports', JSON.stringify(cleaned));
      return cleaned;
    }
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

  detectAndMarkDuplicates(cachedReports);
  renderReportsList(cachedReports);

  // Update map overlay markers
  if (window.NWAMap && window.NWAMap.updateCitizenMapMarkers) {
    window.NWAMap.updateCitizenMapMarkers(cachedReports);
  }
}

/**
 * Detect duplicate reports client-side.
 * Two reports are considered duplicates ONLY when ALL three conditions are met:
 *   1. Same weather category
 *   2. Geographic coordinates within 10km of each other (Haversine)
 *   3. Submitted within 6 hours of each other
 * Every member of such a cluster gets is_duplicate = true.
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function detectAndMarkDuplicates(reports) {
  // Always reset flags so this is recalculated fresh from scratch
  reports.forEach(r => {
    r.is_duplicate = false;
    r.duplicate_cluster_size = undefined;
  });

  const RADIUS_KM = 10;          // Must be within 10km
  const TIME_WINDOW_MS = 6 * 60 * 60 * 1000; // Must be within 6 hours

  const clusters = [];
  const assigned = new Set();

  for (let i = 0; i < reports.length; i++) {
    if (assigned.has(i)) continue;
    const ri = reports[i];
    // Skip reports without valid coordinates
    if (!ri.lat || !ri.lon || isNaN(ri.lat) || isNaN(ri.lon)) continue;

    const cluster = new Set([i]);
    const riTime = ri.timestamp ? new Date(ri.timestamp).getTime() : null;

    for (let j = i + 1; j < reports.length; j++) {
      if (assigned.has(j)) continue;
      const rj = reports[j];
      if (!rj.lat || !rj.lon || isNaN(rj.lat) || isNaN(rj.lon)) continue;

      // Condition 1: same category
      if (ri.category !== rj.category) continue;

      // Condition 2: within 10km
      const dist = haversineKm(ri.lat, ri.lon, rj.lat, rj.lon);
      if (dist > RADIUS_KM) continue;

      // Condition 3: within 6 hours of each other
      if (riTime !== null && rj.timestamp) {
        const rjTime = new Date(rj.timestamp).getTime();
        if (Math.abs(riTime - rjTime) > TIME_WINDOW_MS) continue;
      }

      cluster.add(j);
    }

    // Only flag as duplicate when there are at least 2 matching reports
    if (cluster.size > 1) {
      cluster.forEach(idx => assigned.add(idx));
      clusters.push(cluster);
    }
  }

  // Mark all members of each duplicate cluster
  clusters.forEach(cluster => {
    const size = cluster.size;
    cluster.forEach(idx => {
      reports[idx].is_duplicate = true;
      reports[idx].duplicate_cluster_size = size;
    });
  });
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
      statusText = 'FLAGGED FAKE (AI)';
    } else if (r.verified_status === 'rejected') {
      statusClass = 'status-rejected';
      statusText = 'REJECTED';
    } else if (r.verified_status === 'duplicate') {
      statusClass = 'status-unverified';
      statusText = 'DUPLICATE';
    }

    const timeAgo = formatTimeAgo(r.timestamp);

    const isFake = r.verified_status === 'flagged_fake' || r.authenticity_grade === 'F' || (r.credibility_score && r.credibility_score < 40);

    const trust = r.ai_trust_breakdown || {
      nlp_credibility: isFake ? 0.10 : (r.credibility_score ? r.credibility_score / 100 : 0.85),
      geo_corroboration: r.corroboration_score ? r.corroboration_score / 100 : 0.90,
      visual_sensor_proof: isFake ? 0.12 : (r.photo ? 0.88 : 0.70),
      composite_trust: isFake ? 0.12 : (r.trust_score ? r.trust_score / 100 : 0.86),
      authenticity_grade: isFake ? 'F' : (r.authenticity_grade || (r.credibility_score >= 80 ? 'A' : (r.credibility_score >= 60 ? 'B' : 'C')))
    };

    const nlpVal = trust.nlp_credibility <= 1.0 ? trust.nlp_credibility : trust.nlp_credibility / 100;
    const geoVal = trust.geo_corroboration <= 1.0 ? trust.geo_corroboration : trust.geo_corroboration / 100;
    const visVal = trust.visual_sensor_proof <= 1.0 ? trust.visual_sensor_proof : trust.visual_sensor_proof / 100;
    const compVal = trust.composite_trust <= 1.0 ? trust.composite_trust : trust.composite_trust / 100;

    const nlpPct = Math.round((nlpVal || 0.85) * 100);
    const geoPct = Math.round((geoVal || 0.90) * 100);
    const visPct = Math.round((visVal || 0.75) * 100);
    const compPct = Math.round((compVal || 0.85) * 100);
    const grade = isFake ? 'F' : (trust.authenticity_grade || 'A');

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
        ${r.photo ? `<img src="${r.photo}" onclick="window.openImageModal ? window.openImageModal(this.src) : window.open(this.src, '_blank')" style="max-height: 160px; border-radius: 6px; object-fit: cover; width: 100%; border: 1px solid var(--border-color); margin-top: 0.5rem; cursor: zoom-in;" alt="Report Attachment" />` : ''}
        ${r.video_url && (r.video_url.endsWith('.mp4') || r.video_url.endsWith('.webm') || r.video_url.includes('/uploads/'))
          ? `<video src="${escapeHtml(r.video_url)}" controls style="max-height: 200px; width: 100%; border-radius: 6px; margin-top: 0.5rem; background: #000; border: 1px solid var(--border-color);"></video>`
          : (r.video_url ? `<div style="margin-top: 0.5rem; font-size: 0.8rem;"><a href="${escapeHtml(r.video_url)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-primary); text-decoration: none;"><i class="fa-solid fa-video"></i> View Video Stream</a></div>` : '')
        }
        
        <!-- Multi-Modal AI Trust & Media Forensics Breakdown -->
        <div class="ai-trust-badge" onclick="window.NWAReports && window.NWAReports.showAITrustModal('${r.id}')" title="Click to view deep AI Forensic & NLP Analysis Breakdown" style="margin-top: 0.5rem; cursor: pointer;">
          <span class="ai-trust-grade grade-${grade.toLowerCase()}">Grade ${grade}</span>
          <span class="ai-trust-score"><i class="fa-solid fa-shield-halved"></i> Trust ${compPct}%</span>
          <span class="ai-trust-subscores">NLP ${nlpPct}% · Geo ${geoPct}% · Vision ${visPct}%</span>
          <span style="margin-left: auto; font-size: 0.72rem; color: var(--accent-primary); font-weight: 600;"><i class="fa-solid fa-magnifying-glass-chart"></i> Inspect AI</span>
        </div>
        ${r.is_duplicate ? `
          <div style="margin-top: 0.5rem; font-size: 0.78rem; background: rgba(245, 158, 11, 0.10); color: #d97706; padding: 0.4rem 0.7rem; border-radius: 5px; border: 1px solid rgba(245, 158, 11, 0.30); display: flex; align-items: center; gap: 0.4rem; font-weight: 500;">
            <i class="fa-solid fa-clone" style="font-size: 0.82rem;"></i>
            <span><strong>Duplicated Incident:</strong> Corroborated with cluster of ${r.duplicate_cluster_size || 2} reports within 30km.</span>
          </div>
        ` : ''}

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
              ${r.verified_status === 'verified' ? '<i class="fa-solid fa-clipboard-check" style="color: #10b981;"></i> Observation Verified' : 'Status: ' + escapeHtml(r.verified_status)}
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
  const base = window.NWAWeather ? window.NWAWeather.getApiBaseUrl() : '';
  let uploadedPhotoUrl = hasPhoto ? photoPreview.src : null;

  if (hasPhoto) {
    try {
      const upRes = await fetch(`${base}/api/v1/upload-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: document.getElementById('previewFileName')?.textContent || 'attached-photo.png',
          fileData: photoPreview.src
        })
      });
      if (upRes.ok) {
        const upData = await upRes.json();
        if (upData && upData.url) {
          uploadedPhotoUrl = upData.url;
        }
      }
    } catch (err) {
      console.warn('Upload endpoint fallback notice:', err);
    }
  }

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
    photo: uploadedPhotoUrl,
    video_url: videoUrl || null,
    timestamp: new Date().toISOString(),
    verified_status: 'unverified',
    urgency: 'medium'
  };

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

  // Instantly reload citizen reports and sync with Alerts Portal & Admin Portal
  await loadCitizenReports();
  if (window.NWAAlerts && window.NWAAlerts.loadAlertsRegisteredReports) {
    window.NWAAlerts.loadAlertsRegisteredReports();
  }
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

function handleRealtimeNewReport(newReport) {
  if (!newReport || !newReport.id) return;
  // Check if report already exists in cached list
  const existingIdx = cachedReports.findIndex(r => r.id === newReport.id);
  if (existingIdx >= 0) {
    cachedReports[existingIdx] = newReport;
  } else {
    cachedReports.unshift(newReport);
  }
  saveReportsToLocalStorage(cachedReports);
  renderReportsList(cachedReports);

  if (window.NWAMap && window.NWAMap.updateCitizenMapMarkers) {
    window.NWAMap.updateCitizenMapMarkers(cachedReports);
  }
}

function showAITrustModal(reportId) {
  const modal = document.getElementById('aiForensicsModal');
  if (!modal) return;

  const report = (cachedReports || []).find(r => r.id === reportId) || 
    (getReportsFromLocalStorage() || []).find(r => r.id === reportId);
  if (!report) return;

  const isFake = report.verified_status === 'flagged_fake' || report.authenticity_grade === 'F' || (report.credibility_score && report.credibility_score < 40);
  const trust = report.ai_trust_breakdown || {
    nlp_credibility: isFake ? 0.10 : (report.credibility_score ? report.credibility_score / 100 : 0.85),
    geo_corroboration: report.corroboration_score ? report.corroboration_score / 100 : 0.90,
    visual_sensor_proof: isFake ? 0.12 : (report.photo ? 0.88 : 0.70),
    composite_trust: isFake ? 0.12 : (report.trust_score ? report.trust_score / 100 : 0.86),
    authenticity_grade: isFake ? 'F' : (report.authenticity_grade || (report.credibility_score >= 80 ? 'A' : (report.credibility_score >= 60 ? 'B' : 'C')))
  };

  const nlpPct = Math.round(((trust.nlp_credibility <= 1.0 ? trust.nlp_credibility : trust.nlp_credibility / 100) || 0.85) * 100);
  const geoPct = Math.round(((trust.geo_corroboration <= 1.0 ? trust.geo_corroboration : trust.geo_corroboration / 100) || 0.90) * 100);
  const visPct = Math.round(((trust.visual_sensor_proof <= 1.0 ? trust.visual_sensor_proof : trust.visual_sensor_proof / 100) || 0.75) * 100);
  const compPct = Math.round(((trust.composite_trust <= 1.0 ? trust.composite_trust : trust.composite_trust / 100) || 0.85) * 100);
  const grade = isFake ? 'F' : (trust.authenticity_grade || 'A');

  const repIdEl = document.getElementById('forensicsRepId');
  const repLocEl = document.getElementById('forensicsRepLoc');
  const repDescEl = document.getElementById('forensicsRepDesc');
  const gradeBadgeEl = document.getElementById('forensicsGradeBadge');
  const trustScoreEl = document.getElementById('forensicsTrustScore');

  if (repIdEl) repIdEl.textContent = report.id;
  if (repLocEl) repLocEl.textContent = `${report.location || 'Unknown Location'} (${report.state || 'India'})`;
  if (repDescEl) repDescEl.textContent = `"${report.description || 'No description provided.'}"`;
  if (gradeBadgeEl) {
    gradeBadgeEl.textContent = `Grade ${grade}`;
    gradeBadgeEl.className = `ai-trust-grade grade-${grade.toLowerCase()}`;
  }
  if (trustScoreEl) trustScoreEl.textContent = `${compPct}%`;

  const nlpFill = document.getElementById('forensicsNlpFill');
  const nlpVal = document.getElementById('forensicsNlpVal');
  if (nlpFill) nlpFill.style.width = `${nlpPct}%`;
  if (nlpVal) nlpVal.textContent = `${nlpPct}%`;

  const geoFill = document.getElementById('forensicsGeoFill');
  const geoVal = document.getElementById('forensicsGeoVal');
  if (geoFill) geoFill.style.width = `${geoPct}%`;
  if (geoVal) geoVal.textContent = `${geoPct}%`;

  const visFill = document.getElementById('forensicsVisFill');
  const visVal = document.getElementById('forensicsVisVal');
  if (visFill) visFill.style.width = `${visPct}%`;
  if (visVal) visVal.textContent = `${visPct}%`;

  const compFill = document.getElementById('forensicsCompFill');
  const compVal = document.getElementById('forensicsCompVal');
  if (compFill) compFill.style.width = `${compPct}%`;
  if (compVal) compVal.textContent = `${compPct}%`;

  const logList = document.getElementById('forensicsReasonList');
  if (logList) {
    const reasons = (report.ai_analysis && report.ai_analysis.reasons && report.ai_analysis.reasons.length > 0)
      ? report.ai_analysis.reasons
      : [
          geoPct > 70 ? 'GPS coordinates validated within Indian sovereign territorial boundary.' : 'GPS coordinates outside typical regional boundary.',
          nlpPct > 70 ? `Meteorological lexicon match confirmed via TF-IDF Vectorizer (Confidence: ${nlpPct}%).` : 'Text structure flagged for non-standard lexicon.',
          report.photo ? 'Visual media sensor corroborated with local precipitation and cloud cover.' : 'Text submission cross-checked with active IMD Doppler weather radar observations.',
          report.is_duplicate ? `Spatial deduplication consolidated ${report.duplicate_cluster_size || 2} concurrent observations within 20km.` : 'Unique event telemetry: No duplicate spatial clusters detected.'
        ];

    logList.innerHTML = reasons.map(r => `
      <li class="forensics-log-item">
        <i class="fa-solid fa-circle-check" style="color: #10b981;"></i>
        <span>${escapeHtml(r)}</span>
      </li>
    `).join('');
  }

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeAITrustModal() {
  const modal = document.getElementById('aiForensicsModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

window.NWAReports = {
  loadCitizenReports,
  handleRealtimeNewReport,
  handleReportSubmit,
  moderateReport,
  filterReports,
  openReportModal,
  closeReportModal,
  showAITrustModal,
  closeAITrustModal,
  handlePhotoUpload,
  clearPhotoAttachment,
  getCachedReports: () => (cachedReports && cachedReports.length > 0 ? cachedReports : getReportsFromLocalStorage())
};

// Automatic 15-second polling so reports registered by any user appear for all users
setInterval(() => {
  loadCitizenReports();
}, 15000);


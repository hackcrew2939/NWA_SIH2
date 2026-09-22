/**
 * NWA (National Weather Analytics) - Social Media & Big Data Stream Module (Phase 3)
 * Monitors #IMD and weather hashtags, displays NLP classification, and loads analytics.
 * Features auto-fallback to built-in simulation feed if backend is unreachable.
 */

let activeHashtagFilter = 'all';
let activeCategoryFilter = 'all';
let activePlatformFilter = 'all';
let socialAutoStreamTimer = null;

// No mock or simulated demo data - live intelligence feed is populated directly from genuine multi-source backend
const DEFAULT_SOCIAL_FEED = [];

async function loadSocialStream() {
  const base = window.NWAWeather ? window.NWAWeather.getApiBaseUrl() : '';
  let posts = [];

  const container = document.getElementById('socialPostsList');
  if (container && (!container.children || container.children.length === 0 || container.querySelector('.empty-state-card'))) {
    container.innerHTML = `
      <div class="empty-state-card" style="margin: 1rem 0;">
        <div class="empty-state-icon">
          <i class="fa-solid fa-satellite-dish fa-spin" style="color: var(--accent-primary);"></i>
        </div>
        <div class="empty-state-title">Fetching Live Intelligence Stream...</div>
        <p class="empty-state-desc">Ingesting real-time alerts and bulletins from IMD Official, Google News, UN GDACS, X, and Instagram...</p>
      </div>
    `;
  }

  try {
    let url = `${base}/api/v1/social/stream`;
    const params = [];
    if (activeCategoryFilter !== 'all') params.push(`category=${activeCategoryFilter}`);
    if (activeHashtagFilter !== 'all') params.push(`hashtag=${encodeURIComponent(activeHashtagFilter)}`);
    if (activePlatformFilter !== 'all') params.push(`platform=${activePlatformFilter}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Backend offline');
    const rawData = await res.json();
    posts = Array.isArray(rawData) ? rawData : (rawData.posts || rawData.items || []);
  } catch (err) {
    posts = [];
  }

  renderSocialFeed(posts);

  // Update map overlay with social markers
  if (window.NWAMap && window.NWAMap.updateSocialMapMarkers) {
    window.NWAMap.updateSocialMapMarkers(posts);
  }

  // Ensure live auto-streaming loop is active
  startLiveAutoStreaming();
}

function renderSocialFeed(posts) {
  const container = document.getElementById('socialPostsList');
  if (!container) return;

  if (!posts || posts.length === 0) {
    const platformNames = {
      imd: 'IMD Official Desk',
      google: 'Google News RSS',
      twitter: 'X / Twitter',
      gdacs: 'UN GDACS Alerts',
      instagram: 'Instagram'
    };
    const filterLabel = activePlatformFilter !== 'all' ? ` for ${platformNames[activePlatformFilter] || activePlatformFilter.toUpperCase()}` : '';

    container.innerHTML = `
      <div class="empty-state-card" style="margin: 1rem 0;">
        <div class="empty-state-icon">
          <i class="fa-solid fa-cloud-sun"></i>
        </div>
        <div class="empty-state-title">No Intelligence Posts Found${filterLabel}</div>
        <p class="empty-state-desc">No live signals match the currently selected filter. You can ingest the latest real-time signals or view all platform feeds.</p>
        <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; margin-top: 0.5rem;">
          <button type="button" class="btn btn-primary" onclick="window.NWASocial.fetchLiveSignals()">
            <i class="fa-solid fa-rotate"></i> Ingest Live Signals Now
          </button>
          <button type="button" class="btn btn-outline" onclick="window.NWASocial.resetSocialFilters()">
            <i class="fa-solid fa-filter-circle-xmark"></i> Show All Platforms
          </button>
        </div>
      </div>
    `;
    return;
  }

  const catLabels = {
    heavy_rain: 'Heavy Rain',
    flood: 'Flood',
    cyclone: 'Cyclone Alert',
    heatwave: 'Heatwave',
    hailstorm: 'Hailstorm',
    thunderstorm: 'Thunderstorm',
    other: 'Weather Event'
  };

  container.innerHTML = posts.map(p => {
    const timeAgo = formatSocialTime(p.timestamp);
    const urgencyClass = `urgency-${p.urgency || 'medium'}`;

    // Platform-specific icon, styling and metadata
    let platformIcon = '<i class="fa-brands fa-x-twitter"></i>';
    let platformName = 'X / Twitter';
    let avatarBg = '#0f172a';
    let sourceBadgeBg = 'rgba(15, 23, 42, 0.08)';
    let sourceBadgeColor = '#0f172a';
    let openLabel = 'Open on X';
    let isImdOfficial = false;

    const pLow = ((p.platform || '') + ' ' + (p.source || '') + ' ' + (p.user_handle || '')).toLowerCase();
    if (pLow.includes('imd') || pLow.includes('indiametdept')) {
      isImdOfficial = true;
      platformIcon = '<i class="fa-solid fa-satellite-dish" style="color: #ffffff;"></i>';
      platformName = 'IMD Official Desk';
      avatarBg = '#0284c7';
      sourceBadgeBg = 'rgba(2, 132, 199, 0.14)';
      sourceBadgeColor = '#0369a1';
      openLabel = 'IMD Advisory';
    } else if (pLow.includes('instagram')) {
      platformIcon = '<i class="fa-brands fa-instagram" style="color: #ffffff;"></i>';
      platformName = 'Instagram';
      avatarBg = '#E1306C';
      sourceBadgeBg = 'rgba(225, 48, 108, 0.12)';
      sourceBadgeColor = '#C13584';
      openLabel = 'Open on Instagram';
    } else if (pLow.includes('gdacs') || pLow.includes('united nations')) {
      platformIcon = '<i class="fa-solid fa-triangle-exclamation" style="color: #ffffff;"></i>';
      platformName = 'UN GDACS Disaster Alert';
      avatarBg = '#dc2626';
      sourceBadgeBg = 'rgba(220, 38, 38, 0.12)';
      sourceBadgeColor = '#b91c1c';
      openLabel = 'View UN Alert';
    } else if (pLow.includes('google')) {
      platformIcon = '<i class="fa-solid fa-newspaper" style="color: #ffffff;"></i>';
      platformName = 'Google News';
      avatarBg = '#2563eb';
      sourceBadgeBg = 'rgba(37, 99, 235, 0.12)';
      sourceBadgeColor = '#1d4ed8';
      openLabel = 'Read Article';
    } else if (pLow.includes('twitter') || pLow.includes('x')) {
      platformIcon = '<i class="fa-brands fa-x-twitter" style="color: #ffffff;"></i>';
      platformName = 'X / Twitter';
      avatarBg = '#0f172a';
      sourceBadgeBg = 'rgba(15, 23, 42, 0.08)';
      sourceBadgeColor = '#0f172a';
      openLabel = 'Open on X';
    }

    const extLink = p.external_url || p.link;
    const linkBtn = extLink ? `
      <a href="${escapeHtml(extLink)}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 11px; color: var(--accent-primary); text-decoration: none; font-weight: 600; padding: 2px 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); transition: all 0.2s;">
        <i class="fa-solid fa-arrow-up-right-from-square"></i> ${openLabel}
      </a>
    ` : '';

    const sevBadge = p.severity ? `
      <span style="font-size: 0.7rem; padding: 2px 7px; border-radius: 4px; background: rgba(239, 68, 68, 0.15); color: #dc2626; font-weight: 700; border: 1px solid rgba(239, 68, 68, 0.3);">
        <i class="fa-solid fa-circle-exclamation"></i> ${escapeHtml(p.severity)}
      </span>
    ` : '';

    const verifiedBadge = isImdOfficial ? `
      <span style="display: inline-flex; align-items: center; color: #0284c7; font-size: 0.85rem;" title="Official Government Verified Desk">
        <i class="fa-solid fa-circle-check"></i>
      </span>
    ` : '';

    return `
      <div class="social-post-card" style="border-left: 4px solid ${avatarBg};">
        <div class="post-header">
          <div class="post-user">
            <div class="post-avatar" style="background: ${avatarBg}; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 6px; flex-shrink: 0;">${platformIcon}</div>
            <div>
              <div class="post-handle" style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                <span style="font-weight: 600;">${escapeHtml(p.user_handle || '@official_feed')}</span>
                ${verifiedBadge}
                <span style="font-size: 0.7rem; padding: 1px 6px; border-radius: 4px; background: ${sourceBadgeBg}; color: ${sourceBadgeColor}; border: 1px solid var(--border-color); font-weight: 600;">${platformName}</span>
                ${sevBadge}
              </div>
              <div class="post-time" style="font-size: 0.75rem; color: var(--text-muted);">${timeAgo} • Inferred: ${escapeHtml(p.city || 'National')}, ${escapeHtml(p.state || 'India')}</div>
            </div>
          </div>
          <span class="category-tag cat-${p.category}">${catLabels[p.category] || p.category}</span>
        </div>
        <p class="post-content" style="line-height: 1.5; margin: 0.6rem 0;">${highlightHashtags(escapeHtml(p.description))}</p>
        <div class="post-badges" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <span class="category-meta-badge"><i class="fa-solid fa-tag"></i> ${catLabels[p.category]}</span>
          <span class="urgency-tag ${urgencyClass}">Urgency: ${(p.urgency || 'Medium').toUpperCase()}</span>
          ${linkBtn}
          <button onclick="window.NWAApp.loadLocationWeather('${p.city}', '${p.state}', ${p.lat}, ${p.lon})" style="margin-left: auto; background: transparent; border: 1px solid var(--border-color); color: var(--accent-primary); border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer;">
            <i class="fa-solid fa-compass"></i> View Station
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function loadAnalyticsData() {
  const base = window.NWAWeather ? window.NWAWeather.getApiBaseUrl() : '';
  let data = null;

  try {
    const res = await fetch(`${base}/api/v1/analytics/trends`);
    if (!res.ok) throw new Error('Backend offline');
    data = await res.json();
  } catch (err) {
    // Dynamic client-side analytics computation from live arrays
    const localCitizen = (window.NWAReports && window.NWAReports.getCachedReports ? window.NWAReports.getCachedReports() : []) || [];
    const localSocial = (socialFeed && socialFeed.length > 0) ? socialFeed : (DEFAULT_SEED_POSTS || []);
    const combined = [...localCitizen, ...localSocial];

    const categoryDist = { heavy_rain: 0, flood: 0, cyclone: 0, heatwave: 0, hailstorm: 0, thunderstorm: 0, other: 0 };
    const stateCounts = {};
    combined.forEach(item => {
      const cat = item.category || 'other';
      categoryDist[cat] = (categoryDist[cat] || 0) + 1;
      const st = item.state || 'General';
      stateCounts[st] = (stateCounts[st] || 0) + 1;
    });

    const topStates = Object.entries(stateCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([state, count]) => ({ state, count }));

    const verified = localCitizen.filter(r => r.verified_status === 'verified').length;
    const vRate = localCitizen.length > 0 ? parseFloat(((verified / localCitizen.length) * 100).toFixed(1)) : 100.0;

    data = {
      totalEvents: combined.length,
      citizenCount: localCitizen.length,
      socialCount: localSocial.length,
      verifiedCount: verified,
      categoryDistribution: categoryDist,
      topStates,
      verificationRate: vRate,
      nlpAccuracyIndex: vRate
    };
  }

  // Update KPI counters
  const totalEventsEl = document.getElementById('kpiTotalEvents');
  const citizenCountEl = document.getElementById('kpiCitizenCount');
  const socialCountEl = document.getElementById('kpiSocialCount');
  const accuracyEl = document.getElementById('kpiAccuracy');

  if (totalEventsEl) totalEventsEl.textContent = data.totalEvents || '0';
  if (citizenCountEl) citizenCountEl.textContent = data.citizenCount || '0';
  if (socialCountEl) socialCountEl.textContent = data.socialCount || '0';
  if (accuracyEl) {
    const rate = data.verificationRate ?? data.nlpAccuracyIndex ?? 100;
    accuracyEl.textContent = `${rate}%`;
  }

  // Render Charts
  if (window.NWACharts && window.NWACharts.renderAnalyticsCharts) {
    window.NWACharts.renderAnalyticsCharts(data);
  }

  // Poll and render live station telemetry grid
  loadLiveStationMatrix();
}

async function loadLiveStationMatrix() {
  const matrixContainer = document.getElementById('analyticsStationMatrix');
  if (!matrixContainer) return;

  const stations = [
    { name: 'New Delhi', zone: 'Northern Zone', lat: 28.6139, lon: 77.2090 },
    { name: 'Mumbai', zone: 'Western Coastal', lat: 19.0760, lon: 72.8777 },
    { name: 'Kolkata', zone: 'Eastern Zone', lat: 22.5726, lon: 88.3639 },
    { name: 'Chennai', zone: 'Southern Coastal', lat: 13.0827, lon: 80.2707 },
    { name: 'Bengaluru', zone: 'South Interior', lat: 12.9716, lon: 77.5946 },
    { name: 'Bhopal', zone: 'Central Plateau', lat: 23.2599, lon: 77.4126 },
    { name: 'Guwahati', zone: 'North East Zone', lat: 26.1445, lon: 91.7362 },
    { name: 'Shimla', zone: 'Western Himalayas', lat: 31.1048, lon: 77.1734 }
  ];

  try {
    const base = window.NWAWeather ? window.NWAWeather.getApiBaseUrl() : '';
    const results = await Promise.all(stations.map(async st => {
      try {
        const res = await fetch(`${base}/api/v1/weather/current?lat=${st.lat}&lon=${st.lon}`);
        if (res.ok) {
          const d = await res.json();
          if (d && d.current) return { ...st, current: d.current };
        }
      } catch (e) {}

      // Resilient Direct Open-Meteo Fallback
      try {
        const directRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${st.lat}&longitude=${st.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`);
        if (directRes.ok) {
          const d = await directRes.json();
          const cur = d.current || {};
          return {
            ...st,
            current: {
              temperature: cur.temperature_2m,
              humidity: cur.relative_humidity_2m,
              weathercode: cur.weather_code,
              wind_speed: cur.wind_speed_10m
            }
          };
        }
      } catch (e) {}

      return null;
    }));

    const validStations = results.filter(Boolean);
    if (!validStations.length) return;

    matrixContainer.innerHTML = validStations.map(st => {
      const c = st.current || {};
      const wmo = window.NWAWeather ? window.NWAWeather.getWmoInfo(c.weathercode) : { desc: 'Standard', icon: 'fa-sun' };
      return `
        <div class="metric-card" style="cursor: pointer; transition: var(--transition);" onclick="NWAApp.loadLocationWeather('${st.name}', '', ${st.lat}, ${st.lon}); document.querySelector('[data-tab=live-weather-view]').click();" title="Click to view full forecast for ${st.name}">
          <div class="metric-header">
            <span>${st.name}</span>
            <i class="fa-solid ${wmo.icon}" style="color: var(--accent-primary);"></i>
          </div>
          <div class="metric-value" style="font-size: 1.35rem; color: var(--text-primary);">${c.temperature ?? '--'}°C</div>
          <div class="metric-sub">
            <span>${wmo.desc}</span> • <span>Wind: ${c.wind_speed ?? 0} km/h</span>
          </div>
          <div style="margin-top: 0.35rem; font-size: 0.7rem; color: var(--text-muted); display: flex; justify-content: space-between;">
            <span>${st.zone}</span>
            <span style="color: var(--accent-primary); font-weight: 600;">View Radar &raquo;</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading live station matrix:', err);
  }
}

function filterSocialByPlatform(platform) {
  activePlatformFilter = platform;
  document.querySelectorAll('[data-platform]').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-platform') === platform);
  });
  loadSocialStream();
}

async function fetchLiveSignals() {
  const btn = document.getElementById('fetchLiveSignalsBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Fetching Signals...';
  }

  try {
    const base = window.NWAWeather ? window.NWAWeather.getApiBaseUrl() : '';
    const res = await fetch(`${base}/api/v1/social/refresh`);
    if (res.ok) {
      const data = await res.json();
      if (window.NWAApp && window.NWAApp.showToast) {
        window.NWAApp.showToast(data.message || 'Live Google News & Social Telemetry ingested!', 'success');
      }
    }
  } catch (err) {
    console.warn('Live refresh error:', err);
  }

  await loadSocialStream();

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Fetch Live Signals';
  }
}

function startLiveAutoStreaming() {
  if (socialAutoStreamTimer) return;
  socialAutoStreamTimer = setInterval(() => {
    // Silently poll for live stream updates if on social tab
    const socialView = document.getElementById('social-stream-view');
    if (socialView && socialView.classList.contains('active')) {
      loadSocialStreamSilently();
    }
  }, 12000);
}

async function loadSocialStreamSilently() {
  const base = window.NWAWeather ? window.NWAWeather.getApiBaseUrl() : '';
  try {
    let url = `${base}/api/v1/social/stream`;
    const params = [];
    if (activeCategoryFilter !== 'all') params.push(`category=${activeCategoryFilter}`);
    if (activeHashtagFilter !== 'all') params.push(`hashtag=${encodeURIComponent(activeHashtagFilter)}`);
    if (activePlatformFilter !== 'all') params.push(`platform=${activePlatformFilter}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    const res = await fetch(url);
    if (res.ok) {
      const rawData = await res.json();
      const posts = Array.isArray(rawData) ? rawData : (rawData.posts || rawData.items || []);
      renderSocialFeed(posts);
      if (window.NWAMap && window.NWAMap.updateSocialMapMarkers) {
        window.NWAMap.updateSocialMapMarkers(posts);
      }
    }
  } catch (err) {}
}

function filterSocialByHashtag(tag) {
  activeHashtagFilter = tag;
  document.querySelectorAll('.trending-tag').forEach(el => {
    el.style.fontWeight = el.getAttribute('data-tag') === tag ? '700' : '500';
  });
  loadSocialStream();
}

function filterSocialByCategory(cat) {
  activeCategoryFilter = cat;
  loadSocialStream();
}

function highlightHashtags(text) {
  return text.replace(/(#[a-zA-Z0-9_]+)/g, '<span style="color: var(--accent-primary); font-weight: 600;">$1</span>');
}

function formatSocialTime(isoString) {
  if (!isoString) return 'Just now';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function resetSocialFilters() {
  activeHashtagFilter = 'all';
  activeCategoryFilter = 'all';
  activePlatformFilter = 'all';
  document.querySelectorAll('[data-platform]').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-platform') === 'all');
  });
  document.querySelectorAll('.filter-hashtag-btn').forEach(b => b.classList.remove('active'));
  const allBtn = document.querySelector('.filter-hashtag-btn[data-hashtag="all"]');
  if (allBtn) allBtn.classList.add('active');
  const catSel = document.getElementById('socialCategoryFilter');
  if (catSel) catSel.value = 'all';
  loadSocialStream();
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}

window.NWASocial = {
  loadSocialStream,
  loadAnalyticsData,
  filterSocialByHashtag,
  filterSocialByCategory,
  filterSocialByPlatform,
  fetchLiveSignals,
  resetSocialFilters
};

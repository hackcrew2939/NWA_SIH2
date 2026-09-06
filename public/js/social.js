/**
 * NWA (National Weather Analytics) - Social Media & Big Data Stream Module (Phase 3)
 * Monitors #IMD and weather hashtags, displays NLP classification, and loads analytics.
 * Features auto-fallback to built-in simulation feed if backend is unreachable.
 */

let activeHashtagFilter = 'all';
let activeCategoryFilter = 'all';
let activePlatformFilter = 'all';
let socialAutoStreamTimer = null;

const DEFAULT_SOCIAL_FEED = [
  {
    id: 'soc-gnews-001',
    source: 'google_news',
    platform: 'Google News / Intelligence',
    user_handle: '@google_news_weather',
    hashtag: '#GoogleNews #IndiaWeather #IMD',
    category: 'heavy_rain',
    description: '[Google Weather Alert] Flash flood and cloudburst advisories issued across Western Ghats and Northern India. Live radar tracking active.',
    city: 'New Delhi',
    state: 'Delhi',
    lat: 28.6139,
    lon: 77.2090,
    sentiment: 'alert',
    urgency: 'high',
    timestamp: new Date().toISOString()
  },
  {
    id: 'soc-gnews-002',
    source: 'google_news',
    platform: 'Google News / Intelligence',
    user_handle: '@google_imd_intel',
    hashtag: '#GoogleNews #Monsoon2026',
    category: 'cyclone',
    description: '[Google Disaster Watch] IMD Doppler Radar registers deep convective depression system moving towards eastern coastal belts.',
    city: 'Bhubaneswar',
    state: 'Odisha',
    lat: 20.2961,
    lon: 85.8245,
    sentiment: 'critical',
    urgency: 'high',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: 'soc-101',
    source: 'social_media',
    platform: 'X / Twitter',
    user_handle: '@mumbaifloodwatch',
    hashtag: '#MumbaiRains #IMD',
    category: 'heavy_rain',
    description: 'IMD issues Orange Alert for Mumbai, Thane and Palghar. Colaba recorded 68mm rainfall in last 3 hours. #MumbaiRains #IMD',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.0760,
    lon: 72.8777,
    sentiment: 'alert',
    urgency: 'high',
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString()
  },
  {
    id: 'soc-imd-001',
    source: 'official_imd',
    platform: 'IMD Official',
    user_handle: '@mausam_bhawan_official',
    hashtag: '#IMD #OfficialAlert',
    category: 'thunderstorm',
    description: 'IMD National Weather Forecasting Centre: Severe thunderstorm with lightning and gusty winds (40-50 km/h) likely over Northwest India.',
    city: 'New Delhi',
    state: 'Delhi',
    lat: 28.6139,
    lon: 77.2090,
    sentiment: 'alert',
    urgency: 'high',
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString()
  },
  {
    id: 'soc-102',
    source: 'social_media',
    platform: 'X / Twitter',
    user_handle: '@odisha_nowcast',
    hashtag: '#CycloneAlert #IMD',
    category: 'cyclone',
    description: 'Depression over Bay of Bengal likely to intensify into Deep Depression. Coastal Odisha districts on high alert. #CycloneAlert #IMD',
    city: 'Bhubaneswar',
    state: 'Odisha',
    lat: 20.2961,
    lon: 85.8245,
    sentiment: 'critical',
    urgency: 'high',
    timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString()
  },
  {
    id: 'soc-103',
    source: 'social_media',
    platform: 'X / Twitter',
    user_handle: '@delhi_weather_radar',
    hashtag: '#DelhiWeather #IMD',
    category: 'heatwave',
    description: 'Safdarjung Observatory records max temp 43.4°C today. Heatwave warning extended for 48 hours. Drink plenty of water. #DelhiWeather #IMD',
    city: 'New Delhi',
    state: 'Delhi',
    lat: 28.6139,
    lon: 77.2090,
    sentiment: 'alert',
    urgency: 'medium',
    timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString()
  },
  {
    id: 'soc-104',
    source: 'social_media',
    platform: 'X / Twitter',
    user_handle: '@chennai_rains_update',
    hashtag: '#ChennaiRains #IMD',
    category: 'thunderstorm',
    description: 'Convective cloud bands moving across north coastal Tamil Nadu. Moderate to intense thunderstorms expected around evening. #ChennaiRains',
    city: 'Chennai',
    state: 'Tamil Nadu',
    lat: 13.0827,
    lon: 80.2707,
    sentiment: 'info',
    urgency: 'low',
    timestamp: new Date(Date.now() - 44 * 60 * 1000).toISOString()
  },
  {
    id: 'soc-105',
    source: 'social_media',
    platform: 'X / Twitter',
    user_handle: '@himalaya_pulse',
    hashtag: '#HimachalWeather #Cloudburst #IMD',
    category: 'flood',
    description: 'Heavy rainfall triggers landslide near Mandi-Kullu highway. Traffic diverted. Stay safe travellers. #HimachalWeather #IMD',
    city: 'Mandi',
    state: 'Himachal Pradesh',
    lat: 31.5892,
    lon: 76.9182,
    sentiment: 'critical',
    urgency: 'high',
    timestamp: new Date(Date.now() - 65 * 60 * 1000).toISOString()
  },
  {
    id: 'soc-106',
    source: 'social_media',
    platform: 'X / Twitter',
    user_handle: '@kerala_rain_tracker',
    hashtag: '#KeralaMonsoon #IMD',
    category: 'heavy_rain',
    description: 'Idukki and Wayanad ghat sections witness continuous torrential downpours. Dam shutters being monitored closely. #KeralaMonsoon #IMD',
    city: 'Kochi',
    state: 'Kerala',
    lat: 9.9312,
    lon: 76.2673,
    sentiment: 'alert',
    urgency: 'medium',
    timestamp: new Date(Date.now() - 85 * 60 * 1000).toISOString()
  }
];

async function loadSocialStream() {
  const base = window.NWAWeather ? window.NWAWeather.getApiBaseUrl() : '';
  let posts = [];

  try {
    let url = `${base}/api/v1/social/stream`;
    const params = [];
    if (activeCategoryFilter !== 'all') params.push(`category=${activeCategoryFilter}`);
    if (activeHashtagFilter !== 'all') params.push(`hashtag=${encodeURIComponent(activeHashtagFilter)}`);
    if (activePlatformFilter !== 'all') params.push(`platform=${activePlatformFilter}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Backend offline');
    posts = await res.json();
  } catch (err) {
    // Fallback to client-side feed
    posts = [...DEFAULT_SOCIAL_FEED];
    if (activePlatformFilter !== 'all') {
      const pLow = activePlatformFilter.toLowerCase();
      posts = posts.filter(i => (i.platform || '').toLowerCase().includes(pLow));
    }
    if (activeCategoryFilter !== 'all') {
      posts = posts.filter(i => i.category === activeCategoryFilter);
    }
    if (activeHashtagFilter !== 'all') {
      posts = posts.filter(i => i.hashtag.toLowerCase().includes(activeHashtagFilter.toLowerCase()));
    }
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
    container.innerHTML = `
      <div class="empty-state-card" style="margin: 1rem 0;">
        <div class="empty-state-icon">
          <i class="fa-solid fa-tower-broadcast"></i>
        </div>
        <div class="empty-state-title">No Intelligence Signals Found</div>
        <p class="empty-state-desc">No monitored Google News, Twitter, or IMD weather alert posts match the active filter criteria.</p>
        <button type="button" class="btn btn-outline" onclick="window.NWASocial.resetSocialFilters()" style="margin-top: 0.5rem;">
          <i class="fa-solid fa-rotate-left"></i> Reset Filter Feed
        </button>
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

    // Platform-specific icon and styling
    let platformIcon = '<i class="fa-brands fa-x-twitter"></i>';
    let platformName = p.platform || 'Social Feed';
    let avatarBg = '#0f172a';

    const pLow = (p.platform || '').toLowerCase();
    if (pLow.includes('google')) {
      platformIcon = '<i class="fa-brands fa-google" style="color: #ffffff;"></i>';
      platformName = 'Google News / Intelligence';
      avatarBg = '#4285F4';
    } else if (pLow.includes('imd')) {
      platformIcon = '<i class="fa-solid fa-satellite-dish" style="color: #ffffff;"></i>';
      platformName = 'IMD Official Desk';
      avatarBg = '#0284c7';
    }

    return `
      <div class="social-post-card">
        <div class="post-header">
          <div class="post-user">
            <div class="post-avatar" style="background: ${avatarBg}; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 6px;">${platformIcon}</div>
            <div>
              <div class="post-handle" style="display: flex; align-items: center; gap: 0.4rem;">
                <span>${escapeHtml(p.user_handle)}</span>
                <span style="font-size: 0.7rem; padding: 1px 6px; border-radius: 4px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); font-weight: 500;">${platformName}</span>
              </div>
              <div class="post-time">${timeAgo} • Inferred: ${escapeHtml(p.city)}, ${escapeHtml(p.state)}</div>
            </div>
          </div>
          <span class="category-tag cat-${p.category}">${catLabels[p.category] || p.category}</span>
        </div>
        <p class="post-content">${highlightHashtags(escapeHtml(p.description))}</p>
        <div class="post-badges">
          <span class="category-meta-badge"><i class="fa-solid fa-tag"></i> ${catLabels[p.category]}</span>
          <span class="urgency-tag ${urgencyClass}">Urgency: ${(p.urgency || 'Medium').toUpperCase()}</span>
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
      const posts = await res.json();
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

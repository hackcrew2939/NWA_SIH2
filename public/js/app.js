/**
 * NWA (National Weather Analytics) - Main Application Controller
 * Orchestrates views, state management, search, theme switching, and live data loads.
 */

let appState = {
  currentLocation: {
    name: 'New Delhi',
    state: 'Delhi',
    lat: 28.6139,
    lon: 77.2090
  },
  currentData: null,
  forecastData: null,
  hourlyData: null,
  allStates: []
};

let searchDebounceTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initLiveDateTime();
  initKeyboardShortcuts();
  setupMobileMenu();
  setupSidebarCollapse();
  setupNavigationTabs();
  setupSearchAndGeolocation();
  await loadLocationsDropdown();
  setupEventListeners();

  // Initialize Map
  if (window.NWAMap) {
    window.NWAMap.initMap();
  }

  // Load default location weather (New Delhi)
  await loadLocationWeather(appState.currentLocation.name, appState.currentLocation.state, appState.currentLocation.lat, appState.currentLocation.lon);

  // Preload citizen reports & social feed
  if (window.NWAReports) window.NWAReports.loadCitizenReports();
  if (window.NWASocial) {
    window.NWASocial.loadSocialStream();
    window.NWASocial.loadAnalyticsData();
  }
});

// ----------------------------------------------------
// Theme Management (FR-6) & Live Utilities
// ----------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem('nwa_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function initLiveDateTime() {
  function updateTime() {
    const el = document.getElementById('headerLiveDateTime');
    const istClockEl = document.getElementById('istClockText');
    const now = new Date();

    // Live Indian Standard Time format (IST)
    const istTimeStr = now.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const istDateStr = now.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });

    if (istClockEl) {
      istClockEl.textContent = `${istTimeStr} IST · ${istDateStr}`;
    }

    if (el) {
      const day = String(now.getDate()).padStart(2, '0');
      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const month = monthNames[now.getMonth()];
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      el.textContent = `${day} ${month} ${year} · ${hours}:${minutes} IST`;
    }
  }
  updateTime();
  setInterval(updateTime, 1000);
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      const input = document.getElementById('citySearchInput');
      if (input) {
        input.focus();
        input.select();
      }
    }
  });
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('nwa_theme', newTheme);
  updateThemeIcon(newTheme);

  // Update map tiles & chart themes
  if (window.NWAMap) window.NWAMap.updateMapTiles();
  if (window.NWACharts) window.NWACharts.updateChartsTheme();
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  if (theme === 'light') {
    btn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    btn.title = 'Switch to Dark Mode';
  } else {
    btn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    btn.title = 'Switch to Light Mode';
  }
}

// ----------------------------------------------------
// Navigation Tabs & Mobile Menu
// ----------------------------------------------------
function setupSidebarCollapse() {
  const collapseBtn = document.getElementById('sidebarCollapseBtn');

  // Closed / minimized by default on every page load
  document.body.classList.add('sidebar-collapsed');
  updateCollapseBtnIcon(true);

  // Clear any legacy saved state so it always starts closed / minimized by default
  try {
    localStorage.removeItem('nwa_sidebar_collapsed');
  } catch (e) {}

  function updateCollapseBtnIcon(collapsed) {
    if (!collapseBtn) return;
    if (collapsed) {
      collapseBtn.innerHTML = '<i class="fa-solid fa-angles-right"></i>';
      collapseBtn.title = 'Expand Sidebar';
      collapseBtn.setAttribute('aria-label', 'Expand Sidebar');
    } else {
      collapseBtn.innerHTML = '<i class="fa-solid fa-angles-left"></i>';
      collapseBtn.title = 'Minimize Sidebar';
      collapseBtn.setAttribute('aria-label', 'Minimize Sidebar');
    }
  }

  if (collapseBtn) {
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const nowCollapsed = document.body.classList.toggle('sidebar-collapsed');
      updateCollapseBtnIcon(nowCollapsed);

      // Trigger map resize so leaflet adjusts width smoothly
      window.dispatchEvent(new Event('resize'));
      setTimeout(() => {
        if (window.NWAMap && window.NWAMap.getMapInstance) {
          const m = window.NWAMap.getMapInstance();
          if (m && m.invalidateSize) m.invalidateSize();
        }
      }, 300);
    });
  }
}

function setupMobileMenu() {
  const menuBtn = document.getElementById('mobileMenuToggleBtn');
  const closeBtn = document.getElementById('sidebarCloseBtn');
  const backdrop = document.getElementById('sidebarBackdrop');

  function openSidebar() {
    document.body.classList.add('sidebar-open');
  }

  function closeSidebar() {
    document.body.classList.remove('sidebar-open');
  }

  if (menuBtn) menuBtn.addEventListener('click', openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (backdrop) backdrop.addEventListener('click', closeSidebar);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('sidebar-open')) {
      closeSidebar();
    }
  });

  document.querySelectorAll('.app-sidebar .tab-btn, .app-sidebar .quick-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.innerWidth <= 880) {
        closeSidebar();
      }
    });
  });
}

function setupNavigationTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn[data-tab]');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-tab');
      if (!targetView) return;

      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-view').forEach(view => {
        view.classList.remove('active');
      });

      const activeView = document.getElementById(targetView);
      if (activeView) activeView.classList.add('active');

      // Close mobile drawer on tab click
      document.body.classList.remove('sidebar-open');

      // Refresh view data when switching tabs
      if (targetView === 'live-weather-view' && window.NWAMap) {
        setTimeout(() => {
          window.NWAMap.initMap();
          if (window.NWAMap.invalidateSize) window.NWAMap.invalidateSize();
        }, 100);
      } else if (targetView === 'citizen-reports-view' && window.NWAReports) {
        window.NWAReports.loadCitizenReports();
      } else if (targetView === 'admin-panel-view' && window.NWAAdmin) {
        window.NWAAdmin.init();
      } else if (targetView === 'social-stream-view' && window.NWASocial) {
        window.NWASocial.loadSocialStream();
      } else if (targetView === 'analytics-view' && window.NWASocial) {
        window.NWASocial.loadAnalyticsData();
      } else if (targetView === 'official-reports-view' && window.NWAExport) {
        window.NWAExport.updateReportPreview();
      }
    });
  });
}

// ----------------------------------------------------
// Locations & Search Setup (FR-3)
// ----------------------------------------------------
const UNION_TERRITORIES = new Set([
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry'
]);

function populateStateSelectWithOptions(selectEl, placeholder = 'Select State / UT') {
  if (!selectEl) return;
  selectEl.innerHTML = `<option value="">${placeholder}</option>`;

  const statesGroup = document.createElement('optgroup');
  statesGroup.label = 'States (28)';

  const utGroup = document.createElement('optgroup');
  utGroup.label = 'Union Territories (8)';

  (appState.allStates || []).forEach(st => {
    const opt = document.createElement('option');
    opt.value = st.state;
    opt.textContent = st.state;
    if (UNION_TERRITORIES.has(st.state)) {
      utGroup.appendChild(opt);
    } else {
      statesGroup.appendChild(opt);
    }
  });

  selectEl.appendChild(statesGroup);
  selectEl.appendChild(utGroup);
}

function syncHeaderDropdowns(locationName, stateName, lat, lon) {
  const stateSelect = document.getElementById('stateSelect');
  const citySelect = document.getElementById('citySelect');
  if (!stateSelect || !appState.allStates || appState.allStates.length === 0) return;

  const match = findClosestLocationMatch(lat, lon, locationName, stateName);
  if (match && match.stateObj) {
    stateSelect.value = match.stateObj.state;

    if (citySelect) {
      citySelect.innerHTML = '<option value="">Select City</option>';
      (match.stateObj.cities || []).forEach(c => {
        const cOpt = document.createElement('option');
        cOpt.value = `${c.name}|${c.lat}|${c.lon}`;
        cOpt.textContent = c.name;
        citySelect.appendChild(cOpt);
      });

      if (match.cityObj) {
        citySelect.value = `${match.cityObj.name}|${match.cityObj.lat}|${match.cityObj.lon}`;
      } else if (locationName && locationName !== 'Custom Coordinate' && !locationName.startsWith('Lat:')) {
        const customOpt = document.createElement('option');
        customOpt.value = `${locationName}|${lat}|${lon}`;
        customOpt.textContent = locationName;
        customOpt.selected = true;
        citySelect.appendChild(customOpt);
      }
    }
  }
}

// ----------------------------------------------------
// Locations & Search Setup (FR-3)
// ----------------------------------------------------
async function loadLocationsDropdown() {
  try {
    const res = await fetch('/data/india_locations.json');
    if (!res.ok) return;
    appState.allStates = await res.json();

    // 1. Header State & City Dropdowns
    const stateSelect = document.getElementById('stateSelect');
    if (stateSelect) {
      populateStateSelectWithOptions(stateSelect, 'Select State / UT');

      stateSelect.addEventListener('change', () => {
        const selectedStateName = stateSelect.value;
        const citySelect = document.getElementById('citySelect');
        if (!selectedStateName) {
          if (citySelect) citySelect.innerHTML = '<option value="">Select City</option>';
          return;
        }

        const stObj = appState.allStates.find(s => s.state === selectedStateName);
        if (stObj) {
          if (citySelect) {
            citySelect.innerHTML = '<option value="">Select City</option>';
            (stObj.cities || []).forEach(c => {
              const cOpt = document.createElement('option');
              cOpt.value = `${c.name}|${c.lat}|${c.lon}`;
              cOpt.textContent = c.name;
              citySelect.appendChild(cOpt);
            });
          }

          // Automatically load state capital
          loadLocationWeather(stObj.capital || stObj.state, stObj.state, stObj.lat, stObj.lon);
        }
      });

      const citySelect = document.getElementById('citySelect');
      if (citySelect) {
        citySelect.addEventListener('change', () => {
          if (!citySelect.value) return;
          const [cityName, lat, lon] = citySelect.value.split('|');
          const stName = stateSelect.value;
          loadLocationWeather(cityName, stName, parseFloat(lat), parseFloat(lon));
        });
      }
    }

    // Initial sync with active location
    if (appState.currentLocation) {
      syncHeaderDropdowns(
        appState.currentLocation.name,
        appState.currentLocation.state,
        appState.currentLocation.lat,
        appState.currentLocation.lon
      );
    }

    // 2. Quick Report Modal State & City Dropdowns + GPS auto-fill
    setupReportFormLocationHelpers('qrState', 'qrCitySelect', 'qrLocation', 'qrLat', 'qrLon', 'qrUseActiveLocationBtn');

    // 3. Citizen Reports Tab Form State & City Dropdowns + GPS auto-fill
    setupReportFormLocationHelpers('reportState', 'reportCitySelect', 'reportLocation', 'reportLat', 'reportLon', 'reportUseActiveLocationBtn');

  } catch (err) {
    console.warn('Could not load locations json:', err);
  }
}

function findClosestLocationMatch(lat, lon, cityNameHint = '', stateNameHint = '') {
  if (!appState.allStates || appState.allStates.length === 0) return null;

  let targetState = null;
  let targetCity = null;

  // 1. Match State by Hint
  if (stateNameHint) {
    const sLower = stateNameHint.toLowerCase().trim();
    targetState = appState.allStates.find(s => 
      s.state.toLowerCase() === sLower || 
      sLower.includes(s.state.toLowerCase()) || 
      s.state.toLowerCase().includes(sLower)
    );
  }

  // 2. Match City by Hint
  if (cityNameHint) {
    const cLower = cityNameHint.toLowerCase().trim();
    const statesToSearch = targetState ? [targetState] : appState.allStates;
    for (const st of statesToSearch) {
      if (st.cities) {
        const found = st.cities.find(c => 
          c.name.toLowerCase() === cLower || 
          cLower.includes(c.name.toLowerCase()) || 
          c.name.toLowerCase().includes(cLower)
        );
        if (found) {
          if (!targetState) targetState = st;
          targetCity = found;
          break;
        }
      }
    }
  }

  // 3. Fall back to minimum Euclidean coordinate distance calculation
  if (lat != null && lon != null && !isNaN(lat) && !isNaN(lon)) {
    let minDistance = Infinity;
    let closestState = null;
    let closestCity = null;

    appState.allStates.forEach(st => {
      if (st.cities && st.cities.length > 0) {
        st.cities.forEach(c => {
          const dLat = c.lat - lat;
          const dLon = c.lon - lon;
          const distSq = dLat * dLat + dLon * dLon;
          if (distSq < minDistance) {
            minDistance = distSq;
            closestState = st;
            closestCity = c;
          }
        });
      } else {
        const dLat = st.lat - lat;
        const dLon = st.lon - lon;
        const distSq = dLat * dLat + dLon * dLon;
        if (distSq < minDistance) {
          minDistance = distSq;
          closestState = st;
          closestCity = null;
        }
      }
    });

    if (!targetState) targetState = closestState;
    if (!targetCity) targetCity = closestCity;
  }

  return { stateObj: targetState, cityObj: targetCity };
}

function fillLocationFormFields(stateEl, cityEl, locEl, latEl, lonEl, lat, lon, locName = '', stateName = '') {
  if (latEl && lat != null && !isNaN(lat)) latEl.value = Number(lat).toFixed(4);
  if (lonEl && lon != null && !isNaN(lon)) lonEl.value = Number(lon).toFixed(4);

  const match = findClosestLocationMatch(lat, lon, locName, stateName);

  if (match && match.stateObj && stateEl) {
    stateEl.value = match.stateObj.state;

    if (cityEl) {
      cityEl.innerHTML = '<option value="">Select City / District (Optional)</option>';
      (match.stateObj.cities || []).forEach(c => {
        const opt = document.createElement('option');
        opt.value = `${c.name}|${c.lat}|${c.lon}`;
        opt.textContent = c.name;
        cityEl.appendChild(opt);
      });

      if (match.cityObj) {
        cityEl.value = `${match.cityObj.name}|${match.cityObj.lat}|${match.cityObj.lon}`;
      }
    }
  }

  if (locEl) {
    if (locName && locName !== 'Current GPS Location' && locName !== 'Detected Location') {
      locEl.value = locName;
    } else if (match && match.cityObj) {
      locEl.value = match.cityObj.name;
    } else if (match && match.stateObj && match.stateObj.capital) {
      locEl.value = match.stateObj.capital;
    } else if (locName) {
      locEl.value = locName;
    }
  }
}

function setupReportFormLocationHelpers(stateSelectId, citySelectId, locationInputId, latInputId, lonInputId, gpsBtnId) {
  const stateEl = document.getElementById(stateSelectId);
  const cityEl = document.getElementById(citySelectId);
  const locEl = document.getElementById(locationInputId);
  const latEl = document.getElementById(latInputId);
  const lonEl = document.getElementById(lonInputId);
  const gpsBtn = document.getElementById(gpsBtnId);

  if (!stateEl) return;

  // Populate States with organized State & UT groups
  populateStateSelectWithOptions(stateEl, 'Select State / UT *');

  // Handle State Change -> Auto-fill State Center Coordinates & Populate Cities
  stateEl.addEventListener('change', () => {
    const selectedState = stateEl.value;
    if (cityEl) {
      cityEl.innerHTML = '<option value="">Select City / District (Optional)</option>';
    }
    if (!selectedState) return;

    const stObj = (appState.allStates || []).find(s => s.state === selectedState);
    if (stObj) {
      if (cityEl && stObj.cities) {
        stObj.cities.forEach(c => {
          const opt = document.createElement('option');
          opt.value = `${c.name}|${c.lat}|${c.lon}`;
          opt.textContent = c.name;
          cityEl.appendChild(opt);
        });
      }
      if (latEl) latEl.value = Number(stObj.lat).toFixed(4);
      if (lonEl) lonEl.value = Number(stObj.lon).toFixed(4);
      if (locEl && (!locEl.value || locEl.value === '')) {
        locEl.value = stObj.capital || stObj.state;
      }
    }
  });

  // Handle City Change -> Auto-fill City Coordinates & Location Name
  if (cityEl) {
    cityEl.addEventListener('change', () => {
      if (!cityEl.value) return;
      const [cityName, cityLat, cityLon] = cityEl.value.split('|');
      if (latEl && cityLat) latEl.value = parseFloat(cityLat).toFixed(4);
      if (lonEl && cityLon) lonEl.value = parseFloat(cityLon).toFixed(4);
      if (locEl) locEl.value = cityName;
    });
  }

  // Handle GPS / Active Location Auto-Fill Button Click
  if (gpsBtn) {
    gpsBtn.addEventListener('click', () => {
      gpsBtn.disabled = true;
      gpsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Detecting GPS...';

      const applyGpsData = async (lat, lon) => {
        let locName = 'Detected Location';
        let stateName = '';

        try {
          const rev = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
          if (rev.ok) {
            const revData = await rev.json();
            locName = revData.locality || revData.city || 'Detected Location';
            stateName = revData.principalSubdivision || '';
          }
        } catch (e) {
          console.warn('Reverse geocode failed:', e);
        }

        if (!stateName && appState.currentLocation) {
          stateName = appState.currentLocation.state || '';
          if (locName === 'Detected Location') {
            locName = appState.currentLocation.name || 'Detected Location';
          }
        }

        fillLocationFormFields(stateEl, cityEl, locEl, latEl, lonEl, lat, lon, locName, stateName);

        gpsBtn.disabled = false;
        gpsBtn.innerHTML = '<i class="fa-solid fa-check" style="color: #10b981;"></i> GPS Coordinates Auto-Filled!';
        showToast(`GPS Location captured: ${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`, 'success');
        setTimeout(() => {
          gpsBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs" style="color: var(--accent-primary);"></i> Auto-Fill from Active Location / GPS';
        }, 3000);
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            applyGpsData(pos.coords.latitude, pos.coords.longitude);
          },
          (err) => {
            applyActiveLocationCoordinates(stateEl, cityEl, locEl, latEl, lonEl, gpsBtn);
          },
          { timeout: 5000, maximumAge: 60000 }
        );
      } else {
        applyActiveLocationCoordinates(stateEl, cityEl, locEl, latEl, lonEl, gpsBtn);
      }
    });
  }
}

function applyActiveLocationCoordinates(stateEl, cityEl, locEl, latEl, lonEl, gpsBtn) {
  if (appState.currentLocation) {
    const loc = appState.currentLocation;
    fillLocationFormFields(stateEl, cityEl, locEl, latEl, lonEl, loc.lat, loc.lon, loc.name, loc.state);
    showToast(`Coordinates auto-filled from active station: ${loc.name} (${Number(loc.lat).toFixed(2)}, ${Number(loc.lon).toFixed(2)})`, 'success');
  }
  if (gpsBtn) {
    gpsBtn.disabled = false;
    gpsBtn.innerHTML = '<i class="fa-solid fa-check" style="color: #10b981;"></i> Active Location Auto-Filled!';
    setTimeout(() => {
      gpsBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs" style="color: var(--accent-primary);"></i> Auto-Fill from Active Location / GPS';
    }, 3000);
  }
}

function setupSearchAndGeolocation() {
  const searchInput = document.getElementById('citySearchInput');
  const resultsDropdown = document.getElementById('autocompleteResults');
  const geoBtn = document.getElementById('geoBtn');

  if (searchInput && resultsDropdown) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      const q = searchInput.value.trim();

      if (q.length < 2) {
        resultsDropdown.style.display = 'none';
        return;
      }

      searchDebounceTimer = setTimeout(async () => {
        const results = await window.NWAWeather.searchLocations(q);
        renderAutocomplete(results, resultsDropdown);
      }, 250);
    });

    // Close autocomplete on click outside
    document.addEventListener('click', e => {
      if (!searchInput.contains(e.target) && !resultsDropdown.contains(e.target)) {
        resultsDropdown.style.display = 'none';
      }
    });
  }

  if (geoBtn) {
    geoBtn.addEventListener('click', handleGeolocation);
  }
}

function renderAutocomplete(results, dropdown) {
  if (!results || results.length === 0) {
    dropdown.innerHTML = `
      <div class="empty-state-card" style="padding: 1.25rem 1rem; margin: 0; box-shadow: none; border: none;">
        <div class="empty-state-icon" style="width: 36px; height: 36px; font-size: 1rem; margin-bottom: 0.4rem;">
          <i class="fa-solid fa-location-crosshairs"></i>
        </div>
        <div class="empty-state-title" style="font-size: 0.9rem; margin-bottom: 0.2rem;">No Matching Locations</div>
        <p class="empty-state-desc" style="font-size: 0.78rem; margin-bottom: 0;">Try searching another Indian city, district, or state name.</p>
      </div>
    `;
    dropdown.style.display = 'block';
    return;
  }

  dropdown.innerHTML = results.map(item => `
    <div class="autocomplete-item" onclick="NWAApp.selectLocationFromSearch('${escapeAttr(item.name)}', '${escapeAttr(item.state || '')}', ${item.lat}, ${item.lon})">
      <i class="fa-solid fa-location-dot"></i>
      <span class="city-name">${item.name}</span>
      <span class="state-name">${item.state ? item.state + ', India' : 'India'}</span>
    </div>
  `).join('');

  dropdown.style.display = 'block';
}

function selectLocationFromSearch(name, state, lat, lon) {
  const searchInput = document.getElementById('citySearchInput');
  const resultsDropdown = document.getElementById('autocompleteResults');
  if (searchInput) searchInput.value = `${name}${state ? ', ' + state : ''}`;
  if (resultsDropdown) resultsDropdown.style.display = 'none';

  loadLocationWeather(name, state, lat, lon);
}

function selectStateByName(stateName) {
  const stObj = appState.allStates.find(s => s.state.toLowerCase() === stateName.toLowerCase());
  if (stObj) {
    const stateSelect = document.getElementById('stateSelect');
    if (stateSelect) stateSelect.value = stObj.state;
    loadLocationWeather(stObj.capital || stObj.state, stObj.state, stObj.lat, stObj.lon);
  } else {
    loadLocationWeather(stateName, 'India', 22.5, 82.0);
  }
}

function handleGeolocation() {
  const geoBtn = document.getElementById('geoBtn');
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser.', 'error');
    return;
  }

  if (geoBtn) geoBtn.classList.add('loading');

  navigator.geolocation.getCurrentPosition(
    async position => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      if (geoBtn) geoBtn.classList.remove('loading');
      showToast('Location detected via GPS!', 'success');

      // Attempt reverse geocoding lookup
      let locName = 'My Location';
      try {
        const rev = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
        if (rev.ok) {
          const revData = await rev.json();
          locName = revData.locality || revData.city || 'Detected Location';
          const stateName = revData.principalSubdivision || 'India';
          loadLocationWeather(locName, stateName, lat, lon);
          return;
        }
      } catch (e) {
        console.warn('Reverse geocoding failed:', e);
      }

      loadLocationWeather(locName, 'India', lat, lon);
    },
    err => {
      if (geoBtn) geoBtn.classList.remove('loading');
      showToast('Could not acquire GPS position. Please enter city manually.', 'error');
    },
    { timeout: 8000 }
  );
}

function handleMapCoordinateClick(lat, lng) {
  loadLocationWeather(`Lat: ${lat.toFixed(2)}, Lon: ${lng.toFixed(2)}`, 'Custom Coordinate', lat, lng);
}

// ----------------------------------------------------
// Main Weather Loading Workflow (FR-1, FR-4)
// ----------------------------------------------------
async function loadLocationWeather(name, state, lat, lon) {
  appState.currentLocation = { name, state, lat, lon };

  // Sync Header State & City Dropdowns
  syncHeaderDropdowns(name, state, lat, lon);

  // Update Location Banner
  const locTitleEl = document.getElementById('currentLocationTitle');
  const locStateEl = document.getElementById('currentLocationState');
  if (locTitleEl) locTitleEl.textContent = name;
  if (locStateEl) locStateEl.textContent = state ? `${state}, India` : 'India';

  // If name contains raw coordinates or fallback keywords, refine to real place name
  if (name && (name.includes('(') || name.startsWith('Locat') || name.includes('Point')) && window.NWAWeather && window.NWAWeather.reverseGeocode) {
    window.NWAWeather.reverseGeocode(lat, lon, state).then(geo => {
      if (geo && geo.name && !geo.name.includes('(')) {
        appState.currentLocation.name = geo.name;
        if (geo.state) appState.currentLocation.state = geo.state;
        if (locTitleEl) locTitleEl.textContent = geo.name;
        if (locStateEl) locStateEl.textContent = geo.state ? `${geo.state}, India` : (state ? `${state}, India` : 'India');
        if (window.NWAMap && window.NWAMap.setSelectedLocation) {
          window.NWAMap.setSelectedLocation(lat, lon, geo.name, geo.state || state);
        }
      }
    }).catch(() => {});
  }

  // Show loading indicator in refresh button
  const refreshIcon = document.querySelector('.refresh-btn i');
  if (refreshIcon) refreshIcon.classList.add('fa-spin');

  try {
    // Consolidated high-performance fetch with zero-failure fallback
    const weatherData = await window.NWAWeather.fetchCompleteWeather(lat, lon);

    appState.currentData = weatherData.current;
    appState.forecastData = weatherData.forecast;
    appState.hourlyData = weatherData.hourly;

    // Render Current Weather UI
    renderCurrentWeather(weatherData, weatherData.forecast);

    // Render 4-Day Forecast Outlook Strip
    renderForecastOutlook(weatherData.forecast);

    // Render Comprehensive Meteorological Table & Unified Trajectory
    renderForecastTable(weatherData.forecast, currentForecastRange);
    if (window.NWACharts) {
      window.NWACharts.renderForecastTrajectoryChart(weatherData.forecast, currentForecastRange, weatherData.hourly);
      if (weatherData.hourly) {
        window.NWACharts.renderDiurnalProgression(weatherData.hourly);
      }
    }

    // Pan map to location and place selected location pin
    if (window.NWAMap) {
      window.NWAMap.panToLocation(lat, lon);
      if (window.NWAMap.setSelectedLocation) {
        window.NWAMap.setSelectedLocation(lat, lon, name, state);
      }
    }

    // Refresh report preview if module available
    if (window.NWAExport && window.NWAExport.updateReportPreview) {
      window.NWAExport.updateReportPreview();
    }
  } catch (err) {
    console.error('Error loading location weather:', err);
    showToast('Failed to load weather: ' + err.message, 'error');
  } finally {
    if (refreshIcon) refreshIcon.classList.remove('fa-spin');
  }
}

function renderCurrentWeather(data, forecast = null) {
  const c = data.current || {};
  const wmo = window.NWAWeather.getWmoInfo(c.weathercode);
  const uvInfo = window.NWAWeather.getUvRating(c.uv_index);

  // ── Trigger immersive weather animation ──────────────────────────────────
  if (window.NWAWeatherAnim) {
    window.NWAWeatherAnim.update(
      c.weathercode ?? 0,
      Number(c.temperature ?? 28),
      Number(c.precipitation ?? 0)
    );
  }

  // Hero Card
  const tempEl = document.getElementById('heroTemperature');
  const feelsEl = document.getElementById('heroFeelsLike');
  const iconEl = document.getElementById('heroConditionIcon');
  const descEl = document.getElementById('heroConditionDesc');
  const cachedBadgeEl = document.getElementById('cachedStatusBadge');
  const timestampEl = document.getElementById('weatherTimestamp');
  const maxTodayEl = document.getElementById('heroMaxToday');
  const minTodayEl = document.getElementById('heroMinToday');

  if (tempEl) tempEl.textContent = Math.round(c.temperature ?? 0);
  if (feelsEl) feelsEl.textContent = `${Math.round(c.feels_like ?? c.temperature ?? 0)}°C`;
  if (iconEl) {
    iconEl.className = `fa-solid ${wmo.icon} hero-weather-icon`;
    iconEl.style.color = wmo.color;
  }
  const glassOrb = document.getElementById('heroIconGlassOrb');
  if (glassOrb && wmo.color) {
    glassOrb.style.boxShadow = `0 10px 28px -4px ${wmo.color}35, inset 0 1px 2px rgba(255, 255, 255, 0.35)`;
    glassOrb.style.borderColor = `${wmo.color}45`;
  }
  if (descEl) descEl.textContent = wmo.desc;

  if (forecast && forecast[0]) {
    if (maxTodayEl) maxTodayEl.textContent = `${Math.round(forecast[0].temp_max)}°`;
    if (minTodayEl) minTodayEl.textContent = `${Math.round(forecast[0].temp_min)}°`;
  }

  if (cachedBadgeEl) {
    cachedBadgeEl.style.display = data.cached ? 'inline-block' : 'none';
  }
  if (timestampEl) {
    const timeStr = new Date(data.retrieved_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    timestampEl.innerHTML = `<i class="fa-regular fa-clock"></i> Updated ${timeStr} IST`;
  }

  // Middle Telemetry Strip: Dew Point, Rain Chance, AQI, Feed Source
  const temp = Number(c.temperature) || 0;
  const rh = Number(c.humidity) || 50;
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * temp) / (b + temp)) + Math.log(rh / 100);
  const dewPoint = Math.round((b * alpha) / (a - alpha));
  const dewEl = document.getElementById('heroDewPoint');
  if (dewEl) dewEl.textContent = `${dewPoint}°C`;

  const rainProbEl = document.getElementById('heroRainProb');
  if (rainProbEl) {
    const prob = forecast && forecast[0] ? (forecast[0].precipitation_probability ?? 15) : (c.precipitation > 0 ? 85 : 12);
    rainProbEl.textContent = `${prob}%`;
  }

  const aqiEl = document.getElementById('heroAqiLevel');
  if (aqiEl) {
    const vis = Number(c.visibility) || 10;
    let aqiVal = 38;
    let aqiText = 'Good';
    let aqiColor = '#10b981';
    if (vis < 3) { aqiVal = 185; aqiText = 'Poor'; aqiColor = '#ef4444'; }
    else if (vis < 6) { aqiVal = 110; aqiText = 'Moderate'; aqiColor = '#f59e0b'; }
    else if (vis < 8) { aqiVal = 65; aqiText = 'Satisfactory'; aqiColor = '#10b981'; }
    aqiEl.innerHTML = `<span style="color: ${aqiColor}; font-weight: 700;">${aqiText} (${aqiVal})</span>`;
  }

  const feedEl = document.getElementById('heroFeedSource');
  if (feedEl) {
    feedEl.textContent = data.provider === 'weatherapi.com' ? 'WeatherAPI Live Feed' : 'IMD Synoptic Stream';
  }

  // 5-Hour Hourly Trend Strip
  const hourlyStrip = document.getElementById('heroHourlyMiniStrip');
  if (hourlyStrip && data.hourly && data.hourly.times && data.hourly.times.length > 0) {
    const times = data.hourly.times.slice(0, 5);
    const temps = data.hourly.temperatures.slice(0, 5);
    const rains = (data.hourly.rain || []).slice(0, 5);

    hourlyStrip.innerHTML = times.map((t, idx) => {
      const d = new Date(t);
      const hourStr = idx === 0 ? 'Now' : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      const tempVal = Math.round(temps[idx] ?? c.temperature);
      const isRaining = (rains[idx] || 0) > 0.1 || (c.precipitation > 0 && idx === 0);
      const iconClass = isRaining ? 'fa-cloud-rain' : (idx > 2 ? 'fa-cloud-sun' : wmo.icon);
      const iconColor = isRaining ? '#38bdf8' : wmo.color;

      return `
        <div class="hourly-mini-pill ${idx === 0 ? 'active' : ''}">
          <span class="hourly-mini-time">${hourStr}</span>
          <i class="fa-solid ${iconClass} hourly-mini-icon" style="color: ${iconColor};"></i>
          <span class="hourly-mini-temp">${tempVal}°</span>
        </div>
      `;
    }).join('');
  }

  // 8 Metrics Grid
  setMetric('metricPrecipitation', `${c.precipitation ?? 0} mm`);
  setMetric('metricHumidity', `${c.humidity ?? 0}%`);
  setMetric('metricPressure', `${c.surface_pressure ?? 1013} hPa`);
  setMetric('metricVisibility', `${c.visibility ?? 10} km`);

  // Wind speed & compass rotation
  const windDir = window.NWAWeather.getWindDirection(c.wind_direction);
  setMetric('metricWind', `${c.wind_speed ?? 0} km/h`);
  const windSub = document.getElementById('metricWindSub');
  if (windSub) {
    windSub.innerHTML = `
      <i class="fa-solid fa-location-arrow compass-dial" style="transform: rotate(${c.wind_direction - 45}deg); color: var(--accent-primary);"></i>
      ${windDir} (${c.wind_direction}°)
    `;
  }

  // UV Index
  setMetric('metricUv', `${c.uv_index ?? 0}`);
  const uvSub = document.getElementById('metricUvSub');
  if (uvSub) {
    uvSub.innerHTML = `<span class="uv-badge ${uvInfo.class}" title="${uvInfo.advice}">${uvInfo.text}</span><span class="metric-advice" title="${uvInfo.advice}">${uvInfo.advice}</span>`;
  }

  // Sunrise & Sunset
  const sunriseTime = c.sunrise ? new Date(c.sunrise).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
  const sunsetTime = c.sunset ? new Date(c.sunset).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
  setMetric('metricSunrise', sunriseTime);
  setMetric('metricSunset', sunsetTime);
}

function setMetric(elementId, value) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = value;
}

function renderForecastOutlook(forecast) {
  const container = document.getElementById('forecastCardsGrid');
  if (!container || !forecast) return;

  // Show exactly 4 days for the 4-Day Extended Forecast Outlook strip
  const fourDays = forecast.slice(0, 4);

  container.innerHTML = fourDays.map((f, idx) => {
    const dateObj = new Date(f.date);
    const dayName = idx === 0 ? 'Today' : dateObj.toLocaleDateString('en-IN', { weekday: 'short' });
    const formattedDate = dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    const wmo = window.NWAWeather.getWmoInfo(f.weathercode);
    const precipStr = Number(f.precipitation_sum || 0).toFixed(1);
    const windStr = Math.round(f.wind_speed_max || 0);

    return `
      <div class="forecast-day-card">
        <div class="forecast-day-header">
          <div class="forecast-date">${dayName}</div>
          <div class="forecast-subdate">${formattedDate}</div>
        </div>
        <div class="forecast-icon-wrap">
          <i class="fa-solid ${wmo.icon} forecast-icon" style="color: ${wmo.color};"></i>
        </div>
        <div class="forecast-condition-desc">${wmo.desc}</div>
        <div class="forecast-temp-range">
          <span class="temp-max">${Math.round(f.temp_max)}°</span>
          <span class="temp-min">${Math.round(f.temp_min)}°</span>
        </div>
        <div class="forecast-details">
          <div class="forecast-stat" title="Total Expected Rainfall">
            <i class="fa-solid fa-droplet" style="color: #38bdf8;"></i>
            <span>${precipStr} mm</span>
          </div>
          <div class="forecast-stat" title="Max Wind Speed">
            <i class="fa-solid fa-wind" style="color: #10b981;"></i>
            <span>${windStr} km/h</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ----------------------------------------------------
// Meteorological Forecast Table & Trajectory View
// ----------------------------------------------------
let currentForecastRange = 10;

function setForecastRange(days) {
  currentForecastRange = days;

  // Update button active state
  document.querySelectorAll('.forecast-range-pill').forEach(btn => {
    const d = parseInt(btn.getAttribute('data-days'), 10);
    btn.classList.toggle('active', d === days);
  });

  // Update mode badge
  const modeText = document.getElementById('forecastModeText');
  if (modeText) {
    modeText.textContent = days === 1 ? 'Today (24h) Hourly View' : `${days}-Day Forecast Table View`;
  }

  // Update Title
  const titleEl = document.getElementById('forecastTableTitle');
  if (titleEl) {
    const titleSpan = titleEl.querySelector('span');
    if (titleSpan) {
      titleSpan.textContent = days === 1 ? "Today's 24-Hour Hourly Forecast" : `${days}-Day Extended Weather Forecast`;
    }
  }

  // Update table first column header
  const thDateCol = document.getElementById('thDateCol');
  if (thDateCol) {
    thDateCol.textContent = days === 1 ? 'TIME INTERVAL (IST)' : 'DATE & DAY';
  }

  // Re-render table and unified trajectory chart
  if (appState.forecastData) {
    renderForecastTable(appState.forecastData, days);
    if (window.NWACharts && window.NWACharts.renderForecastTrajectoryChart) {
      window.NWACharts.renderForecastTrajectoryChart(appState.forecastData, days, appState.hourlyData);
    }
  }
}

function renderForecastTable(forecast, rangeCount = 10) {
  const tbody = document.getElementById('forecastTableBody');
  if (!tbody) return;

  // Update Context bar badges
  const locBadge = document.getElementById('forecastContextLocation');
  const regionBadge = document.getElementById('forecastContextRegion');
  const coordsBadge = document.getElementById('forecastContextCoords');
  const timestampBadge = document.getElementById('forecastContextTimestamp');

  if (locBadge && appState.currentLocation) {
    locBadge.textContent = appState.currentLocation.name || 'Location';
  }
  if (regionBadge && appState.currentLocation) {
    const st = appState.currentLocation.state || 'India';
    regionBadge.textContent = `${st} (Comprehensive)`;
  }
  if (coordsBadge && appState.currentLocation) {
    const lat = appState.currentLocation.lat != null ? Number(appState.currentLocation.lat).toFixed(4) : '28.6139';
    const lon = appState.currentLocation.lon != null ? Number(appState.currentLocation.lon).toFixed(4) : '77.2090';
    coordsBadge.textContent = `${lat}° N, ${lon}° E`;
  }
  if (timestampBadge) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    timestampBadge.innerHTML = `<i class="fa-regular fa-clock"></i> Live Telemetry • Updated ${timeStr} IST`;
  }

  // If Today (rangeCount === 1), render today's 24-hour diurnal period intervals
  if (rangeCount === 1 && appState.hourlyData && appState.hourlyData.times && appState.hourlyData.times.length > 0) {
    const h = appState.hourlyData;
    const count = h.times.length;
    const step = count >= 24 ? 3 : (count >= 12 ? 2 : 1);
    const intervals = [];
    for (let i = 0; i < count; i += step) {
      if (intervals.length >= 8) break;
      intervals.push({
        time: h.times[i],
        temp: h.temperatures ? h.temperatures[i] : 28,
        rain: h.rain ? h.rain[i] : 0,
        wind: h.wind ? h.wind[i] : 10,
        humidity: h.humidity ? h.humidity[i] : 65
      });
    }

    let globalMin = Math.min(...intervals.map(item => Number(item.temp || 20)));
    let globalMax = Math.max(...intervals.map(item => Number(item.temp || 35)));
    if (globalMax === globalMin) globalMax += 1;

    tbody.innerHTML = intervals.map(item => {
      const d = new Date(item.time);
      const timeStr = !isNaN(d.getTime()) ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : item.time;
      const dateDisplay = `Today, ${timeStr}`;

      const tVal = Number(item.temp ?? 28);
      const isRainy = (item.rain || 0) > 0.5;
      const hour = !isNaN(d.getTime()) ? d.getHours() : 12;
      let icon = 'fa-sun';
      let desc = 'Clear Sky';
      let color = '#f59e0b';

      if (isRainy) {
        icon = 'fa-cloud-showers-heavy';
        desc = 'Rain Showers';
        color = '#0ea5e9';
      } else if (hour >= 20 || hour < 5) {
        icon = 'fa-moon';
        desc = 'Clear Night';
        color = '#94a3b8';
      } else if (hour >= 11 && hour <= 15) {
        icon = 'fa-sun';
        desc = 'Sunny Day';
        color = '#f59e0b';
      } else {
        icon = 'fa-cloud-sun';
        desc = 'Partly Cloudy';
        color = '#38bdf8';
      }

      const maxTemp = (tVal + 0.5).toFixed(1);
      const minTemp = (tVal - 1.5).toFixed(1);
      const feelsMax = (tVal + 2.0).toFixed(1);
      const humidity = `${Math.round(item.humidity || 65)}%`;

      const windKmh = Number(item.wind ?? 10);
      const windMph = (windKmh * 0.621371).toFixed(1);
      const windSpeedDisplay = `${windMph} mph`;
      const windDirDisplay = 'ESE (102°)';

      const rainProb = Math.min(100, Math.max(0, Math.round((item.rain || 0) > 0 ? (item.rain * 30 + 30) : 15)));
      let rainClass = 'rain-low';
      if (rainProb >= 70) rainClass = 'rain-high';
      else if (rainProb >= 35) rainClass = 'rain-med';

      const leftPct = Math.max(0, Math.min(80, ((tVal - 1.5 - globalMin) / (globalMax - globalMin)) * 80));
      const widthPct = Math.max(15, Math.min(100 - leftPct, ((2.0) / (globalMax - globalMin)) * 80));

      return `
        <tr>
          <td class="cell-date">${dateDisplay}</td>
          <td class="cell-condition">
            <i class="fa-solid ${icon}" style="color: ${color};"></i>
            <span>${desc}</span>
          </td>
          <td class="cell-temp-max">${maxTemp}°C</td>
          <td class="cell-temp-min">${minTemp}°C</td>
          <td class="cell-feels">${feelsMax}°C</td>
          <td class="cell-humidity">${humidity}</td>
          <td class="cell-wind">${windSpeedDisplay}</td>
          <td class="cell-wind-dir">${windDirDisplay}</td>
          <td class="cell-rain">
            <span class="forecast-table-rain-badge ${rainClass}">${rainProb}% CHANCE</span>
          </td>
          <td class="cell-visual">
            <div class="temp-range-visual-cell">
              <span class="temp-val-min">${Math.round(tVal - 1.5)}°</span>
              <div class="temp-range-bar-track">
                <div class="temp-range-bar-fill" style="margin-left: ${leftPct}%; width: ${widthPct}%;"></div>
              </div>
              <span class="temp-val-max">${Math.round(tVal + 0.5)}°</span>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    return;
  }

  if (!forecast || forecast.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 2rem; color: var(--text-muted);">No forecast data available.</td></tr>`;
    return;
  }

  const items = forecast.slice(0, rangeCount);

  // Global min/max across this dataset for relative scaling of visual temp bars
  let globalMin = Math.min(...items.map(f => Number(f.temp_min ?? 20)));
  let globalMax = Math.max(...items.map(f => Number(f.temp_max ?? 35)));
  if (globalMax === globalMin) globalMax += 1;

  tbody.innerHTML = items.map((f, idx) => {
    const dateObj = new Date(f.date);
    const dayName = dateObj.toLocaleDateString('en-IN', { weekday: 'short' });
    const formattedDate = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const dateDisplay = `${dayName}, ${formattedDate}`;

    const wmo = window.NWAWeather ? window.NWAWeather.getWmoInfo(f.weathercode) : { icon: 'fa-sun', desc: 'Clear', color: '#f59e0b' };
    const maxTemp = Number(f.temp_max ?? 0).toFixed(1);
    const minTemp = Number(f.temp_min ?? 0).toFixed(1);
    const feelsMax = Number(f.feels_like_max ?? (Number(f.temp_max) + 2)).toFixed(1);
    const humidity = f.humidity != null ? `${Math.round(f.humidity)}%` : '65%';

    // Wind Speed in mph
    const windKmh = Number(f.wind_speed_max ?? 10);
    const windMph = (windKmh * 0.621371).toFixed(1);
    const windSpeedDisplay = `${windMph} mph`;

    // Wind direction
    const windDeg = f.wind_direction ?? 90;
    const windDirStr = window.NWAWeather ? window.NWAWeather.getWindDirection(windDeg) : 'E';
    const windDirDisplay = `${windDirStr} (${windDeg}°)`;

    // Rain probability
    const rainProb = Math.round(f.precipitation_probability ?? 0);
    let rainClass = 'rain-low';
    if (rainProb >= 70) {
      rainClass = 'rain-high';
    } else if (rainProb >= 35) {
      rainClass = 'rain-med';
    }

    // Temp Range visual bar calculation
    const leftPct = Math.max(0, Math.min(80, ((f.temp_min - globalMin) / (globalMax - globalMin)) * 80));
    const widthPct = Math.max(15, Math.min(100 - leftPct, ((f.temp_max - f.temp_min) / (globalMax - globalMin)) * 80));

    return `
      <tr>
        <td class="cell-date">${dateDisplay}</td>
        <td class="cell-condition">
          <i class="fa-solid ${wmo.icon}" style="color: ${wmo.color};"></i>
          <span>${wmo.desc}</span>
        </td>
        <td class="cell-temp-max">${maxTemp}°C</td>
        <td class="cell-temp-min">${minTemp}°C</td>
        <td class="cell-feels">${feelsMax}°C</td>
        <td class="cell-humidity">${humidity}</td>
        <td class="cell-wind">${windSpeedDisplay}</td>
        <td class="cell-wind-dir">${windDirDisplay}</td>
        <td class="cell-rain">
          <span class="forecast-table-rain-badge ${rainClass}">${rainProb}% CHANCE</span>
        </td>
        <td class="cell-visual">
          <div class="temp-range-visual-cell">
            <span class="temp-val-min">${Math.round(f.temp_min)}°</span>
            <div class="temp-range-bar-track">
              <div class="temp-range-bar-fill" style="margin-left: ${leftPct}%; width: ${widthPct}%;"></div>
            </div>
            <span class="temp-val-max">${Math.round(f.temp_max)}°</span>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function downloadForecastCsv() {
  if (!appState.forecastData || appState.forecastData.length === 0) {
    showToast('No forecast data available to export.', 'error');
    return;
  }

  const items = appState.forecastData.slice(0, currentForecastRange);
  const locName = (appState.currentLocation && appState.currentLocation.name) ? appState.currentLocation.name.replace(/[^a-zA-Z0-9_-]/g, '_') : 'location';

  const headers = [
    'Date & Day',
    'Condition',
    'Max Temp (°C)',
    'Min Temp (°C)',
    'Feels Like Max (°C)',
    'Humidity (%)',
    'Wind Speed (mph)',
    'Wind Speed (km/h)',
    'Wind Direction',
    'Rain Probability (%)',
    'Precipitation (mm)'
  ];

  const rows = items.map(f => {
    const dateObj = new Date(f.date);
    const dayName = dateObj.toLocaleDateString('en-IN', { weekday: 'short' });
    const formattedDate = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const dateStr = `"${dayName}, ${formattedDate}"`;

    const wmo = window.NWAWeather ? window.NWAWeather.getWmoInfo(f.weathercode) : { desc: 'Clear' };
    const condStr = `"${wmo.desc}"`;

    const maxTemp = Number(f.temp_max ?? 0).toFixed(1);
    const minTemp = Number(f.temp_min ?? 0).toFixed(1);
    const feelsMax = Number(f.feels_like_max ?? (Number(f.temp_max) + 2)).toFixed(1);
    const humidity = f.humidity != null ? Math.round(f.humidity) : 65;

    const windKmh = Number(f.wind_speed_max ?? 10).toFixed(1);
    const windMph = (windKmh * 0.621371).toFixed(1);

    const windDeg = f.wind_direction ?? 90;
    const windDirStr = window.NWAWeather ? window.NWAWeather.getWindDirection(windDeg) : 'E';
    const windDirFull = `"${windDirStr} (${windDeg}°)"`;

    const rainProb = Math.round(f.precipitation_probability ?? 0);
    const precipSum = Number(f.precipitation_sum ?? 0).toFixed(1);

    return [
      dateStr,
      condStr,
      maxTemp,
      minTemp,
      feelsMax,
      humidity,
      windMph,
      windKmh,
      windDirFull,
      rainProb,
      precipSum
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `meteorological_forecast_${locName}_${currentForecastRange}days.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`Downloaded ${currentForecastRange}-day meteorological forecast CSV.`, 'success');
}

// ----------------------------------------------------
// UI Events & Modals
// ----------------------------------------------------
function setupEventListeners() {
  // Theme button
  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // Refresh Weather
  const refreshBtn = document.getElementById('refreshWeatherBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadLocationWeather(appState.currentLocation.name, appState.currentLocation.state, appState.currentLocation.lat, appState.currentLocation.lon);
    });
  }

  // Citizen Report Form Submit
  const reportForm = document.getElementById('citizenReportForm');
  if (reportForm && window.NWAReports) {
    reportForm.addEventListener('submit', window.NWAReports.handleReportSubmit);
  }

  // Photo upload
  const photoInput = document.getElementById('reportPhoto');
  if (photoInput && window.NWAReports) {
    photoInput.addEventListener('change', window.NWAReports.handlePhotoUpload);
  }

  // Open citizen report modal popup
  const openReportBtn = document.getElementById('openReportModalBtn');
  if (openReportBtn) {
    openReportBtn.addEventListener('click', () => {
      if (window.NWAReports && window.NWAReports.openReportModal) {
        window.NWAReports.openReportModal();
      } else {
        const reportModal = document.getElementById('reportModal');
        if (reportModal) reportModal.classList.add('active');
      }
    });
  }

  // Close modal button
  const closeReportBtn = document.getElementById('closeReportModalBtn');
  if (closeReportBtn && window.NWAReports) {
    closeReportBtn.addEventListener('click', window.NWAReports.closeReportModal);
  }

  // Auto-fill report modal when it opens
  const reportModal = document.getElementById('reportModal');
  if (reportModal) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.target.classList.contains('active') && appState.currentLocation) {
          const locInput = document.getElementById('reportLocation') || document.getElementById('qrLocation');
          const stateInput = document.getElementById('reportState') || document.getElementById('qrState');
          const cityInput = document.getElementById('reportCitySelect') || document.getElementById('qrCitySelect');
          const latInput = document.getElementById('reportLat') || document.getElementById('qrLat');
          const lonInput = document.getElementById('reportLon') || document.getElementById('qrLon');
          fillLocationFormFields(
            stateInput,
            cityInput,
            locInput,
            latInput,
            lonInput,
            appState.currentLocation.lat,
            appState.currentLocation.lon,
            appState.currentLocation.name,
            appState.currentLocation.state
          );
        }
      });
    });
    observer.observe(reportModal, { attributes: true, attributeFilter: ['class'] });
  }

  // Layer toggles on map
  document.querySelectorAll('.layer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const layerName = btn.getAttribute('data-layer');
      const isCurrentlyActive = btn.classList.contains('active');
      const newActive = !isCurrentlyActive;

      btn.classList.toggle('active', newActive);
      if (window.NWAMap) {
        window.NWAMap.toggleLayer(layerName, newActive);
      }
    });
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-exclamation' : 'fa-info-circle');
  toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeAttr(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

async function testApiConnection() {
  const badgeText = document.getElementById('headerApiText');
  const badgeEl = document.getElementById('headerApiBadge');
  if (badgeText) badgeText.textContent = 'Testing...';

  const base = window.NWAWeather ? window.NWAWeather.getApiBaseUrl() : '';
  try {
    const res = await fetch(`${base}/api/v1/health`);
    if (res.ok) {
      const d = await res.json();
      if (badgeText) badgeText.textContent = 'API Live';
      if (badgeEl) {
        badgeEl.className = 'api-status-badge';
        badgeEl.style.color = '#10b981';
      }
      showToast(`Connected to ${d.service}! (Uptime: ${d.uptime}s)`, 'success');
      return;
    }
  } catch (e) {
    // Check direct Open-Meteo
  }

  try {
    const directRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=28.61&longitude=77.20&current=temperature_2m');
    if (directRes.ok) {
      if (badgeText) badgeText.textContent = 'Direct Mode';
      if (badgeEl) {
        badgeEl.className = 'api-status-badge fallback';
        badgeEl.style.color = '#0ea5e9';
      }
      showToast('Open-Meteo Direct API is Online & Active!', 'info');
      return;
    }
  } catch (e) {
    if (badgeText) badgeText.textContent = 'Offline';
    if (badgeEl) {
      badgeEl.className = 'api-status-badge';
      badgeEl.style.color = '#ef4444';
    }
    showToast('Network issue: could not reach API servers. Check internet connection.', 'error');
  }
}

// ----------------------------------------------------
// AI Voice Weather Briefing (Indian Standard Time)
// ----------------------------------------------------
let isSpeakingVoiceBrief = false;

function toggleVoiceBrief() {
  const synth = window.speechSynthesis;
  if (!synth) {
    showToast('Voice Briefing is not supported on this browser.', 'error');
    return;
  }

  const btn = document.getElementById('voiceBriefBtn');
  const icon = document.getElementById('voiceBriefIcon');
  const text = document.getElementById('voiceBriefText');

  if (isSpeakingVoiceBrief) {
    synth.cancel();
    isSpeakingVoiceBrief = false;
    if (btn) btn.classList.remove('speaking');
    if (icon) icon.className = 'fa-solid fa-volume-high';
    if (text) text.textContent = 'Voice Brief';
    showToast('Voice briefing stopped.', 'info');
    return;
  }

  const loc = appState.currentLocation || { name: 'New Delhi', state: 'Delhi' };
  const c = appState.currentData || {};
  const f = (appState.forecastData && appState.forecastData[0]) ? appState.forecastData[0] : {};
  const wmo = window.NWAWeather ? window.NWAWeather.getWmoInfo(c.weathercode) : { desc: 'clear sky' };

  const now = new Date();
  const istHours = now.getHours();
  let greeting = 'Namaste, and welcome to National Weather Analytics.';
  if (istHours < 12) greeting = 'Namaste, good morning.';
  else if (istHours < 17) greeting = 'Namaste, good afternoon.';
  else greeting = 'Namaste, good evening.';

  const tempStr = Math.round(c.temperature ?? 28);
  const feelsStr = Math.round(c.feels_like ?? tempStr);
  const condDesc = wmo.desc || 'clear conditions';
  const humidityStr = Math.round(c.humidity ?? 65);
  const windStr = Math.round(c.wind_speed ?? 10);
  const rainProb = Math.round(f.precipitation_probability ?? 0);
  const maxT = Math.round(f.temp_max ?? tempStr);
  const minT = Math.round(f.temp_min ?? (tempStr - 4));

  const speechText = `${greeting} Here is your live Indian Standard Time meteorological briefing for ${loc.name}, ${loc.state || 'India'}. Currently, the temperature is ${tempStr} degrees Celsius, with ${condDesc}. It feels like ${feelsStr} degrees with ${humidityStr} percent relative humidity. Winds are blowing at ${windStr} kilometers per hour. Today's expected maximum temperature is ${maxT} degrees, minimum ${minT} degrees, with a ${rainProb} percent chance of rain. Stay safe and weather aware.`;

  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(speechText);
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  utterance.lang = 'en-IN';

  const voices = synth.getVoices();
  const indianVoice = voices.find(v => v.lang === 'en-IN' || v.name.includes('India') || v.name.includes('Hindi'));
  if (indianVoice) utterance.voice = indianVoice;

  utterance.onstart = () => {
    isSpeakingVoiceBrief = true;
    if (btn) btn.classList.add('speaking');
    if (icon) icon.className = 'fa-solid fa-volume-xmark';
    if (text) text.textContent = 'Stop Brief';
    showToast(`Playing Voice Weather Briefing for ${loc.name}...`, 'info');
  };

  utterance.onend = () => {
    isSpeakingVoiceBrief = false;
    if (btn) btn.classList.remove('speaking');
    if (icon) icon.className = 'fa-solid fa-volume-high';
    if (text) text.textContent = 'Voice Brief';
  };

  utterance.onerror = () => {
    isSpeakingVoiceBrief = false;
    if (btn) btn.classList.remove('speaking');
    if (icon) icon.className = 'fa-solid fa-volume-high';
    if (text) text.textContent = 'Voice Brief';
  };

  synth.speak(utterance);
}

window.NWAApp = {
  loadLocationWeather,
  selectLocationFromSearch,
  selectStateByName,
  handleMapCoordinateClick,
  getCurrentLocation: () => appState.currentLocation,
  getCurrentData: () => appState.currentData,
  getForecastData: () => appState.forecastData,
  getHourlyData: () => appState.hourlyData,
  testApiConnection,
  showToast,
  findClosestLocationMatch,
  fillLocationFormFields,
  setForecastRange,
  renderForecastTable,
  downloadForecastCsv,
  toggleVoiceBrief
};

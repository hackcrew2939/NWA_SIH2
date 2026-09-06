/**
 * NWA (National Weather Analytics) - Leaflet India Map Module
 * Interactive India map with state boundaries, layer switches, and event markers.
 */

// -------------------------------------------------------
// CARTO Basemaps API Key — paste your key from
// https://carto.com/basemaps/apikey
// -------------------------------------------------------
const CARTO_API_KEY = 'cb1_2xph_1_f7ebc941b2ac55d89324448d';

let mapInstance = null;
let currentTileLayer = null;
let stateGeojsonLayer = null;
let weatherMarkersLayer = null;
let citizenReportsLayer = null;
let socialMarkersLayer = null;
let selectedLocationMarker = null;

let activeLayers = {
  weather: true,
  citizen: true,
  social: true
};

const MAJOR_HUBS = [
  { name: 'New Delhi', state: 'Delhi', lat: 28.6139, lon: 77.2090 },
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lon: 72.8777 },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lon: 88.3639 },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lon: 80.2707 },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lon: 77.5946 },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lon: 78.4867 },
  { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lon: 72.5714 },
  { name: 'Guwahati', state: 'Assam', lat: 26.1445, lon: 91.7362 },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lon: 75.7873 },
  { name: 'Srinagar', state: 'Jammu and Kashmir', lat: 34.0837, lon: 74.7973 }
];

let currentHoveredState = 'India';

function formatCoordinate(lat, lng) {
  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
  return { latStr, lngStr };
}

function updateMapHoverTelemetry(stateName, lat, lng) {
  const stateEl = document.getElementById('mapHoverStateName');
  const latEl = document.getElementById('mapHoverLat');
  const lngEl = document.getElementById('mapHoverLng');

  if (stateEl && stateName) {
    stateEl.textContent = stateName;
  }
  if (latEl && lngEl && lat != null && lng != null) {
    const { latStr, lngStr } = formatCoordinate(lat, lng);
    latEl.textContent = `Lat: ${latStr},`;
    lngEl.textContent = `Lng: ${lngStr}`;
  }
}

function initMap() {
  const mapEl = document.getElementById('indiaMap');
  if (!mapEl || mapInstance) return;

  // Initialize map centered at India
  mapInstance = L.map('indiaMap', {
    center: [22.8, 82.5],
    zoom: 4.6,
    minZoom: 4,
    maxZoom: 14,
    zoomControl: true,
    attributionControl: false
  });

  // Layer groups
  weatherMarkersLayer = L.layerGroup().addTo(mapInstance);
  citizenReportsLayer = L.layerGroup().addTo(mapInstance);
  socialMarkersLayer = L.layerGroup().addTo(mapInstance);

  // Set tile layer according to current theme
  updateMapTiles();

  // Load simplified India State Boundaries
  loadStateBoundaries();

  // Populate major weather hub markers
  populateWeatherHubs();

  // Place pin on active location if already available
  if (window.NWAApp && window.NWAApp.appState && window.NWAApp.appState.currentLocation) {
    const loc = window.NWAApp.appState.currentLocation;
    setSelectedLocation(loc.lat, loc.lon, loc.name, loc.state);
  }

  // Bind map click to pick coordinates and place selected location pin (Only inside India)
  mapInstance.on('click', async (e) => {
    const { lat, lng } = e.latlng;

    // Strict boundary validation: Must be inside India / blue outlines
    const matchedState = isPointInsideIndia(lat, lng);
    if (!matchedState) {
      if (window.NWAApp && window.NWAApp.showToast) {
        window.NWAApp.showToast('Location is outside India. Please select a point within Indian territory.', 'warning');
      }
      return; // Do NOT place pin outside the blue outline
    }

    const latInput = document.getElementById('reportLat');
    const lonInput = document.getElementById('reportLon');
    if (latInput && lonInput) {
      latInput.value = lat.toFixed(4);
      lonInput.value = lng.toFixed(4);
    }
    const { latStr, lngStr } = formatCoordinate(lat, lng);

    // 1. Immediately drop the pin with a responsive loading label
    setSelectedLocation(lat, lng, 'Locating...', `${matchedState}, India`);

    // 2. Perform reverse geocoding to obtain the real Indian location/city name
    let resolvedName = `${matchedState} Region`;
    let resolvedState = matchedState;

    try {
      if (window.NWAWeather && window.NWAWeather.reverseGeocode) {
        const geoInfo = await window.NWAWeather.reverseGeocode(lat, lng, matchedState);
        if (geoInfo && geoInfo.name) {
          resolvedName = geoInfo.name;
          resolvedState = geoInfo.state || matchedState;
        }
      }
    } catch (geoErr) {
      console.warn('Reverse geocode error on map click:', geoErr);
    }

    // 3. Update the selected location pin with the real location name
    setSelectedLocation(lat, lng, resolvedName, `${resolvedState}, India`);

    // Also prefill location name in citizen report form if open
    const reportLocInput = document.getElementById('reportLocation');
    if (reportLocInput) {
      reportLocInput.value = `${resolvedName}, ${resolvedState}`;
    }

    // 4. Load full weather analytics for this resolved location
    if (window.NWAApp) {
      if (window.NWAApp.loadLocationWeather) {
        window.NWAApp.loadLocationWeather(resolvedName, resolvedState, lat, lng);
      } else if (window.NWAApp.showToast) {
        window.NWAApp.showToast(`Selected location: ${resolvedName}, ${resolvedState}`, 'info');
      }
    }
  });

  // Live mouse hover coordinate tracking across the map canvas
  mapInstance.on('mousemove', (e) => {
    const { lat, lng } = e.latlng;
    updateMapHoverTelemetry(currentHoveredState || 'India', lat, lng);
  });

  setTimeout(() => {
    if (mapInstance) mapInstance.invalidateSize();
  }, 250);

  window.addEventListener('resize', () => {
    if (mapInstance) mapInstance.invalidateSize();
  });
}

function updateMapTiles() {
  if (!mapInstance) return;
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';

  if (currentTileLayer) {
    mapInstance.removeLayer(currentTileLayer);
  }

  const tileUrl = isLight
    ? `https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`
    : `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`;

  currentTileLayer = L.tileLayer(tileUrl, {
    maxZoom: 19
  }).addTo(mapInstance);
}

let indiaBoundaryFeatures = [];

function initBoundarySpatialIndex(geojson) {
  if (!geojson || !geojson.features) return;
  indiaBoundaryFeatures = geojson.features.map(f => {
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    function updateBBox(pt) {
      if (pt[0] < minLng) minLng = pt[0];
      if (pt[0] > maxLng) maxLng = pt[0];
      if (pt[1] < minLat) minLat = pt[1];
      if (pt[1] > maxLat) maxLat = pt[1];
    }
    if (f.geometry.type === 'Polygon') {
      f.geometry.coordinates[0].forEach(updateBBox);
    } else if (f.geometry.type === 'MultiPolygon') {
      f.geometry.coordinates.forEach(poly => poly[0].forEach(updateBBox));
    }
    return {
      name: f.properties ? (f.properties.name || f.properties.ST_NM) : 'State',
      geometry: f.geometry,
      bbox: { minLng, minLat, maxLng, maxLat }
    };
  });
}

function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function isPointInGeometry(lng, lat, geometry) {
  if (geometry.type === 'Polygon') {
    return pointInRing(lng, lat, geometry.coordinates[0]);
  } else if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some(poly => pointInRing(lng, lat, poly[0]));
  }
  return false;
}

function isPointInsideIndia(lat, lng) {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (isNaN(latNum) || isNaN(lngNum)) return null;

  // Fast outer bounding box check for India territory
  if (latNum < 6.0 || latNum > 37.5 || lngNum < 68.0 || lngNum > 97.6) {
    return null;
  }

  // Check against parsed boundary features
  if (indiaBoundaryFeatures && indiaBoundaryFeatures.length > 0) {
    for (const f of indiaBoundaryFeatures) {
      if (latNum >= f.bbox.minLat && latNum <= f.bbox.maxLat &&
          lngNum >= f.bbox.minLng && lngNum <= f.bbox.maxLng) {
        if (isPointInGeometry(lngNum, latNum, f.geometry)) {
          return f.name;
        }
      }
    }
  }

  // Fallback check for registered Indian states/cities in appState (e.g. Lakshadweep atolls)
  if (window.NWAApp && window.NWAApp.appState && window.NWAApp.appState.allStates) {
    for (const st of window.NWAApp.appState.allStates) {
      if (Math.abs(st.lat - latNum) < 0.35 && Math.abs(st.lon - lngNum) < 0.35) {
        return st.state;
      }
      for (const c of (st.cities || [])) {
        if (Math.abs(c.lat - latNum) < 0.35 && Math.abs(c.lon - lngNum) < 0.35) {
          return st.state;
        }
      }
    }
  }

  return null;
}

async function loadStateBoundaries() {
  try {
    const res = await fetch('/data/india_states_geojson.json');
    if (!res.ok) return;
    const geojson = await res.json();
    initBoundarySpatialIndex(geojson);

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    stateGeojsonLayer = L.geoJSON(geojson, {
      style: feature => ({
        color: isLight ? '#0284c7' : '#38bdf8',
        weight: 1.2,
        opacity: 0.6,
        fillColor: isLight ? '#38bdf8' : '#0ea5e9',
        fillOpacity: isLight ? 0.04 : 0.08
      }),
      onEachFeature: (feature, layer) => {
        const stateName = feature.properties ? (feature.properties.name || feature.properties.ST_NM || 'State') : 'State';

        layer.bindTooltip((l) => {
          const lat = l.latlng ? l.latlng.lat : 22;
          const lng = l.latlng ? l.latlng.lng : 82;
          const { latStr, lngStr } = formatCoordinate(lat, lng);
          return `
            <div style="font-family: var(--font-body); padding: 2px 4px;">
              <strong style="color: #38bdf8; font-size: 11px;">${stateName}</strong><br/>
              <span style="font-size: 10px; color: #94a3b8; font-family: monospace;">${latStr}, ${lngStr}</span>
            </div>
          `;
        }, {
          sticky: true,
          className: 'state-tooltip'
        });

        layer.on({
          mouseover: e => {
            currentHoveredState = stateName;
            const l = e.target;
            l.setStyle({
              weight: 2.5,
              opacity: 1,
              fillOpacity: 0.25,
              color: '#38bdf8'
            });
            l.bringToFront();
            updateMapHoverTelemetry(stateName, e.latlng.lat, e.latlng.lng);
          },
          mousemove: e => {
            currentHoveredState = stateName;
            updateMapHoverTelemetry(stateName, e.latlng.lat, e.latlng.lng);
          },
          mouseout: e => {
            currentHoveredState = 'India';
            if (stateGeojsonLayer) stateGeojsonLayer.resetStyle(e.target);
            if (e.latlng) {
              updateMapHoverTelemetry('India', e.latlng.lat, e.latlng.lng);
            }
          },
          click: e => {
            L.DomEvent.stopPropagation(e);
            const { lat, lng } = e.latlng;
            const latInput = document.getElementById('reportLat');
            const lonInput = document.getElementById('reportLon');
            if (latInput && lonInput) {
              latInput.value = lat.toFixed(4);
              lonInput.value = lng.toFixed(4);
            }
            const { latStr, lngStr } = formatCoordinate(lat, lng);
            setSelectedLocation(lat, lng, `${stateName} Point`, `${stateName}, India`);

            if (window.NWAApp) {
              if (window.NWAApp.loadLocationWeather) {
                window.NWAApp.loadLocationWeather(`${stateName} (${lat.toFixed(2)}, ${lng.toFixed(2)})`, stateName, lat, lng);
              } else if (window.NWAApp.selectStateByName) {
                window.NWAApp.selectStateByName(stateName);
              }
            }
          }
        });
      }
    }).addTo(mapInstance);
  } catch (err) {
    console.warn('Could not load state geojson boundaries:', err.message);
  }
}

function populateWeatherHubs() {
  if (!weatherMarkersLayer) return;
  weatherMarkersLayer.clearLayers();

  MAJOR_HUBS.forEach(hub => {
    const icon = L.divIcon({
      className: 'custom-weather-pin',
      html: `
        <div style="background: rgba(14, 165, 233, 0.9); border: 2px solid #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.4); font-size: 11px; cursor: pointer;">
          <i class="fa-solid fa-cloud-sun"></i>
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    const marker = L.marker([hub.lat, hub.lon], { icon });
    marker.bindPopup(`
      <div class="map-popup-card" style="padding: 2px;">
        <h4 class="map-popup-title">${hub.name}</h4>
        <p class="map-popup-subtitle">${hub.state}, India</p>
        <button onclick="window.NWAApp.loadLocationWeather('${hub.name}', '${hub.state}', ${hub.lat}, ${hub.lon})" class="map-popup-btn">
          View Full Weather
        </button>
      </div>
    `);
    weatherMarkersLayer.addLayer(marker);
  });
}

function updateCitizenMapMarkers(reports) {
  if (!citizenReportsLayer) return;
  citizenReportsLayer.clearLayers();

  const catColors = {
    heavy_rain: '#3b82f6',
    flood: '#0ea5e9',
    cyclone: '#ef4444',
    heatwave: '#f59e0b',
    hailstorm: '#a855f7',
    thunderstorm: '#eab308',
    other: '#94a3b8'
  };

  reports.forEach(r => {
    if (!r.lat || !r.lon) return;
    const color = catColors[r.category] || '#0ea5e9';
    const isUrgent = r.urgency === 'high';

    const icon = L.divIcon({
      className: 'citizen-marker-div',
      html: `
        <div class="pulse-marker" style="background: ${color}; color: ${color}; box-shadow: 0 0 10px ${color};"></div>
      `,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    const marker = L.marker([r.lat, r.lon], { icon });
    const verifiedBadge = r.verified_status === 'verified'
      ? '<span style="background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">Verified Report</span>'
      : '<span style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">Pending Verification</span>';

    marker.bindPopup(`
      <div class="map-popup-card" style="max-width: 240px; padding: 2px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-weight: 700; text-transform: uppercase; font-size: 11px; color: ${color};">${r.category.replace('_', ' ')}</span>
          ${verifiedBadge}
        </div>
        <h4 class="map-popup-title">${r.location}</h4>
        <p class="map-popup-desc">${r.description}</p>
        ${r.photo ? `<img src="${r.photo}" style="width: 100%; border-radius: 4px; margin-bottom: 6px; max-height: 90px; object-fit: cover;" />` : ''}
        <div class="map-popup-footer">
          Reported by ${r.reporter_name || 'Citizen'} • ${new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    `);

    citizenReportsLayer.addLayer(marker);
  });
}

function updateSocialMapMarkers(posts) {
  if (!socialMarkersLayer) return;
  socialMarkersLayer.clearLayers();

  posts.forEach(p => {
    if (!p.lat || !p.lon) return;

    const icon = L.divIcon({
      className: 'social-marker-div',
      html: `
        <div style="background: #1d9bf0; color: #fff; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.5);">
          <i class="fa-brands fa-x-twitter"></i>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    const marker = L.marker([p.lat, p.lon], { icon });
    marker.bindPopup(`
      <div class="map-popup-card" style="max-width: 240px; padding: 2px;">
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
          <strong style="font-size:12px; color:#1d9bf0;">${p.user_handle}</strong>
          <span class="map-popup-footer" style="border:none; padding:0;">${p.hashtag}</span>
        </div>
        <p class="map-popup-desc">${p.description}</p>
        <div class="map-popup-footer">
          Location: ${p.city}, ${p.state} • ${p.sentiment.toUpperCase()}
        </div>
      </div>
    `);

    socialMarkersLayer.addLayer(marker);
  });
}

function toggleLayer(layerName, isVisible) {
  activeLayers[layerName] = isVisible;
  if (!mapInstance) return;

  if (layerName === 'weather' && weatherMarkersLayer) {
    if (isVisible) mapInstance.addLayer(weatherMarkersLayer);
    else mapInstance.removeLayer(weatherMarkersLayer);
  } else if (layerName === 'citizen' && citizenReportsLayer) {
    if (isVisible) mapInstance.addLayer(citizenReportsLayer);
    else mapInstance.removeLayer(citizenReportsLayer);
  } else if (layerName === 'social' && socialMarkersLayer) {
    if (isVisible) mapInstance.addLayer(socialMarkersLayer);
    else mapInstance.removeLayer(socialMarkersLayer);
  }
}

function setSelectedLocation(lat, lon, label = '', state = '') {
  if (!mapInstance || lat == null || lon == null) return;

  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  if (isNaN(latNum) || isNaN(lonNum)) return;

  // Strict check: Block pin placement outside the map of India / blue outline
  const insideState = isPointInsideIndia(latNum, lonNum);
  if (indiaBoundaryFeatures && indiaBoundaryFeatures.length > 0 && !insideState) {
    console.warn(`[NWAMap] Pin blocked outside India boundaries: (${latNum}, ${lonNum})`);
    return;
  }

  const { latStr, lngStr } = formatCoordinate(latNum, lonNum);
  const title = label || (window.NWAApp && window.NWAApp.appState && window.NWAApp.appState.currentLocation && window.NWAApp.appState.currentLocation.name) || 'Selected Location';
  const subtitle = state ? `${state}, India` : `${latStr}, ${lngStr}`;

  const pinHtml = `
    <div class="selected-pin-container" title="${title}">
      <div class="selected-pin-radar"></div>
      <div class="selected-pin-icon">
        <svg viewBox="0 0 28 36" width="28" height="36" style="display:block; overflow:visible;">
          <defs>
            <radialGradient id="gmapGroundShadow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#000000" stop-opacity="0.35"/>
              <stop offset="65%" stop-color="#000000" stop-opacity="0.12"/>
              <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <!-- Ground Contact Shadow -->
          <ellipse cx="16.5" cy="33.5" rx="7" ry="2.2" fill="url(#gmapGroundShadow)"/>
          <!-- Authentic Google Maps Red Teardrop Body -->
          <path d="M13 1.5 C7.7 1.5 3.5 5.7 3.5 11 C3.5 18.2 13 33 13 33 C13 33 22.5 18.2 22.5 11 C22.5 5.7 18.3 1.5 13 1.5 Z" fill="#EA4335" stroke="#C5221F" stroke-width="0.8"/>
          <!-- Soft Specular Reflection on Upper Shoulder -->
          <path d="M6.2 10.5 C6.2 6.8 9.2 3.8 13 3.5 C10 3.8 7.5 6.5 7.5 10.5 C7.5 13 8.3 15.5 9.5 18 C8.2 15.5 6.2 13.2 6.2 10.5 Z" fill="#ffffff" opacity="0.3"/>
          <!-- Trademark Google Maps Dark Center Circle -->
          <circle cx="13" cy="11" r="3.7" fill="#761413"/>
          <circle cx="13" cy="11" r="3.7" fill="none" stroke="#500b0b" stroke-width="0.5"/>
        </svg>
      </div>
    </div>
  `;

  const pinIcon = L.divIcon({
    className: 'selected-location-div-icon',
    html: pinHtml,
    iconSize: [28, 36],
    iconAnchor: [13, 33],
    popupAnchor: [0, -34]
  });

  if (selectedLocationMarker) {
    selectedLocationMarker.setLatLng([latNum, lonNum]);
    selectedLocationMarker.setIcon(pinIcon);
  } else {
    selectedLocationMarker = L.marker([latNum, lonNum], {
      icon: pinIcon,
      zIndexOffset: 3000,
      riseOnHover: true
    }).addTo(mapInstance);
  }

  const popupContent = `
    <div class="map-popup-card" style="min-width: 170px; padding: 2px;">
      <div style="display: inline-flex; align-items: center; gap: 5px; background: rgba(225, 29, 72, 0.16); border: 1px solid rgba(225, 29, 72, 0.35); border-radius: 999px; padding: 2px 8px; font-size: 10px; font-weight: 700; color: #ef4444; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: #ef4444; display: inline-block;"></span>
        Selected Location
      </div>
      <h4 class="map-popup-title">${title}</h4>
      <p class="map-popup-subtitle">${subtitle}</p>
      <div style="font-size: 10px; font-family: monospace; color: var(--accent-primary); background: rgba(14, 165, 233, 0.1); padding: 3px 6px; border-radius: 4px; border: 1px solid rgba(14, 165, 233, 0.2);">
        ${latStr}, ${lngStr}
      </div>
    </div>
  `;

  selectedLocationMarker.bindPopup(popupContent);
}

function panToLocation(lat, lon, zoom = 8) {
  if (mapInstance) {
    mapInstance.setView([lat, lon], zoom, { animate: true, duration: 0.8 });
    setSelectedLocation(lat, lon);
  }
}

function invalidateSize() {
  if (mapInstance) {
    mapInstance.invalidateSize();
  }
}

// Persistent fullscreenchange listener (registered once)
document.addEventListener('fullscreenchange', () => {
  const mapWrapper = document.querySelector('.map-card-wrapper');
  const icon = document.getElementById('mapFullscreenIcon');
  if (!document.fullscreenElement) {
    // Exited via Escape key or any other means
    if (mapWrapper) mapWrapper.classList.remove('map-fullscreen');
    if (icon) { icon.classList.remove('fa-compress'); icon.classList.add('fa-expand'); }
    setTimeout(() => { if (mapInstance) mapInstance.invalidateSize(); }, 300);
  }
});

function toggleFullscreen() {
  const mapWrapper = document.querySelector('.map-card-wrapper');
  const icon = document.getElementById('mapFullscreenIcon');
  if (!mapWrapper) return;

  // State is true if EITHER native fullscreen is active OR the CSS class is present
  const isFullscreen = !!document.fullscreenElement || mapWrapper.classList.contains('map-fullscreen');

  if (!isFullscreen) {
    // ---- Enter fullscreen ----
    if (mapWrapper.requestFullscreen) {
      mapWrapper.requestFullscreen()
        .then(() => {
          mapWrapper.classList.add('map-fullscreen');
          if (icon) { icon.classList.remove('fa-expand'); icon.classList.add('fa-compress'); }
          setTimeout(() => { if (mapInstance) mapInstance.invalidateSize(); }, 300);
        })
        .catch(() => {
          // Native API failed — CSS fallback
          mapWrapper.classList.add('map-fullscreen');
          if (icon) { icon.classList.remove('fa-expand'); icon.classList.add('fa-compress'); }
          setTimeout(() => { if (mapInstance) mapInstance.invalidateSize(); }, 300);
        });
    } else {
      // No Fullscreen API — CSS fallback
      mapWrapper.classList.add('map-fullscreen');
      if (icon) { icon.classList.remove('fa-expand'); icon.classList.add('fa-compress'); }
      setTimeout(() => { if (mapInstance) mapInstance.invalidateSize(); }, 300);
    }
  } else {
    // ---- Exit fullscreen ----
    if (document.fullscreenElement) {
      document.exitFullscreen().then(() => {
        mapWrapper.classList.remove('map-fullscreen');
        if (icon) { icon.classList.remove('fa-compress'); icon.classList.add('fa-expand'); }
        setTimeout(() => { if (mapInstance) mapInstance.invalidateSize(); }, 300);
      });
    } else {
      // CSS-only fallback exit
      mapWrapper.classList.remove('map-fullscreen');
      if (icon) { icon.classList.remove('fa-compress'); icon.classList.add('fa-expand'); }
      setTimeout(() => { if (mapInstance) mapInstance.invalidateSize(); }, 300);
    }
  }
}

window.NWAMap = {
  initMap,
  updateMapTiles,
  updateCitizenMapMarkers,
  updateSocialMapMarkers,
  toggleLayer,
  panToLocation,
  setSelectedLocation,
  isPointInsideIndia,
  invalidateSize,
  toggleFullscreen
};

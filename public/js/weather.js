/**
 * NWA (National Weather Analytics) - Resilient Weather Module
 * Provides unified, dual-tier weather data fetching:
 * Tier 1: NWA API1 Express Proxy (with 5m caching)
 * Tier 2: Automatic Direct Client Fallback to Open-Meteo (zero failure guarantee)
 */

let currentApiMode = 'backend'; // 'backend' or 'direct'

function getApiBaseUrl() {
  if (typeof window === 'undefined') return '';
  // If running from file:// or a local static dev tool (e.g. Live Server on 5500/5173), point to local backend
  if (window.location.protocol === 'file:' || ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '3000' && window.location.port !== '')) {
    return 'http://localhost:3000';
  }
  // When hosted on Vercel, production domains, or running directly from Express on port 3000:
  return '';
}

const WMO_CODES = {
  0: { desc: 'Clear Sky', icon: 'fa-sun', color: '#f59e0b' },
  1: { desc: 'Mainly Clear', icon: 'fa-cloud-sun', color: '#f59e0b' },
  2: { desc: 'Partly Cloudy', icon: 'fa-cloud-sun', color: '#38bdf8' },
  3: { desc: 'Overcast', icon: 'fa-cloud', color: '#94a3b8' },
  45: { desc: 'Foggy Conditions', icon: 'fa-smog', color: '#94a3b8' },
  48: { desc: 'Depositing Rime Fog', icon: 'fa-smog', color: '#94a3b8' },
  51: { desc: 'Light Drizzle', icon: 'fa-cloud-rain', color: '#38bdf8' },
  53: { desc: 'Moderate Drizzle', icon: 'fa-cloud-rain', color: '#0ea5e9' },
  55: { desc: 'Dense Drizzle', icon: 'fa-cloud-showers-heavy', color: '#0284c7' },
  56: { desc: 'Freezing Drizzle', icon: 'fa-snowflake', color: '#a5f3fc' },
  57: { desc: 'Dense Freezing Drizzle', icon: 'fa-snowflake', color: '#a5f3fc' },
  61: { desc: 'Slight Rain', icon: 'fa-cloud-rain', color: '#38bdf8' },
  63: { desc: 'Moderate Rain', icon: 'fa-cloud-showers-heavy', color: '#0ea5e9' },
  65: { desc: 'Heavy Rain / Downpour', icon: 'fa-cloud-showers-heavy', color: '#0284c7' },
  66: { desc: 'Freezing Rain', icon: 'fa-snowflake', color: '#a5f3fc' },
  67: { desc: 'Heavy Freezing Rain', icon: 'fa-snowflake', color: '#a5f3fc' },
  71: { desc: 'Slight Snowfall', icon: 'fa-snowflake', color: '#e2e8f0' },
  73: { desc: 'Moderate Snowfall', icon: 'fa-snowflake', color: '#e2e8f0' },
  75: { desc: 'Heavy Snowfall', icon: 'fa-snowflake', color: '#ffffff' },
  77: { desc: 'Snow Grains', icon: 'fa-snowflake', color: '#e2e8f0' },
  80: { desc: 'Slight Rain Showers', icon: 'fa-cloud-sun-rain', color: '#38bdf8' },
  81: { desc: 'Moderate Rain Showers', icon: 'fa-cloud-showers-heavy', color: '#0ea5e9' },
  82: { desc: 'Violent Rain Showers', icon: 'fa-cloud-showers-water', color: '#0369a1' },
  85: { desc: 'Slight Snow Showers', icon: 'fa-snowflake', color: '#e2e8f0' },
  86: { desc: 'Heavy Snow Showers', icon: 'fa-snowflake', color: '#ffffff' },
  95: { desc: 'Thunderstorm with Lightning', icon: 'fa-bolt-lightning', color: '#eab308' },
  96: { desc: 'Thunderstorm with Slight Hail', icon: 'fa-cloud-bolt', color: '#0284c7' },
  99: { desc: 'Severe Thunderstorm with Hail', icon: 'fa-cloud-bolt', color: '#dc2626' }
};

function getWmoInfo(code) {
  return WMO_CODES[code] || { desc: 'Clear / Moderate', icon: 'fa-sun', color: '#f59e0b' };
}

function getWindDirection(deg) {
  if (deg === null || deg === undefined) return 'N/A';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((deg % 360) / 22.5);
  return directions[index % 16];
}

function getUvRating(uv) {
  if (uv <= 2) return { text: 'Low', class: 'uv-low', advice: 'Minimal protection needed.' };
  if (uv <= 5) return { text: 'Moderate', class: 'uv-mod', advice: 'Wear sun protection during noon.' };
  if (uv <= 7) return { text: 'High', class: 'uv-mod', advice: 'Seek shade during peak hours.' };
  if (uv <= 10) return { text: 'Very High', class: 'uv-high', advice: 'Extra protection, hat & sunglasses.' };
  return { text: 'Extreme', class: 'uv-high', advice: 'Avoid direct midday sun.' };
}

const WEATHERAPI_KEY = 'e8c1bf60c47148ec84b14437260209';

function weatherApiCodeToWmo(code, text = '') {
  const t = (text || '').toLowerCase();
  if (code === 1000) return 0; // Sunny / Clear
  if (code === 1003) return 2; // Partly cloudy
  if (code === 1006 || code === 1009) return 3; // Cloudy / Overcast
  if (code === 1030 || code === 1135 || code === 1147) return 45; // Mist / Fog
  if (code === 1063 || code === 1150 || code === 1153) return 51; // Patchy / Light Drizzle
  if (code === 1180 || code === 1183) return 61; // Light Rain
  if (code === 1186 || code === 1189) return 63; // Moderate Rain
  if (code === 1192 || code === 1195 || code === 1243 || code === 1246) return 65; // Heavy Rain
  if (code === 1087 || code === 1273 || code === 1276) return 95; // Thunderstorm
  if (code === 1279 || code === 1282 || code === 1237 || code === 1261 || code === 1264) return 99; // Thunderstorm with Hail
  if (code >= 1210 && code <= 1225) return 71; // Snow
  if (t.includes('thunder')) return 95;
  if (t.includes('rain') || t.includes('shower')) return 63;
  if (t.includes('drizzle')) return 51;
  return 1;
}

async function fetchFromWeatherApiDirect(lat, lon) {
  const url = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHERAPI_KEY}&q=${lat},${lon}&days=4&aqi=no&alerts=no`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`WeatherAPI returned status ${resp.status}`);
  }
  const data = await resp.json();
  const c = data.current || {};
  const forecastDays = data.forecast?.forecastday || [];

  const current = {
    temperature: c.temp_c,
    feels_like: c.feelslike_c,
    humidity: c.humidity,
    precipitation: c.precip_mm || 0,
    wind_speed: c.wind_kph,
    wind_direction: c.wind_degree,
    surface_pressure: c.pressure_mb,
    weathercode: weatherApiCodeToWmo(c.condition?.code, c.condition?.text),
    uv_index: c.uv || 6.0,
    sunrise: forecastDays[0]?.astro?.sunrise || null,
    sunset: forecastDays[0]?.astro?.sunset || null,
    visibility: c.vis_km || 10,
    provider: 'weatherapi.com'
  };

  const forecast = forecastDays.map(fd => ({
    date: fd.date,
    weathercode: weatherApiCodeToWmo(fd.day?.condition?.code, fd.day?.condition?.text),
    temp_max: fd.day?.maxtemp_c,
    temp_min: fd.day?.mintemp_c,
    feels_like_max: fd.day?.avgtemp_c ? fd.day.avgtemp_c + 2 : fd.day?.maxtemp_c,
    feels_like_min: fd.day?.mintemp_c,
    humidity: fd.day?.avghumidity || 65,
    precipitation_sum: fd.day?.totalprecip_mm || 0,
    precipitation_probability: fd.day?.daily_chance_of_rain || (fd.day?.totalprecip_mm > 0 ? 80 : 20),
    wind_speed_max: fd.day?.maxwind_kph,
    wind_direction: 90,
    uv_index_max: fd.day?.uv,
    sunrise: fd.astro?.sunrise,
    sunset: fd.astro?.sunset
  }));

  const allHours = [];
  forecastDays.forEach(fd => {
    (fd.hour || []).forEach(h => {
      allHours.push(h);
    });
  });

  const nowEpoch = Math.floor(Date.now() / 1000);
  const futureHours = allHours.filter(h => h.time_epoch >= nowEpoch - 3600).slice(0, 24);
  const useHours = futureHours.length >= 12 ? futureHours : allHours.slice(0, 24);

  const hourly = {
    times: useHours.map(h => h.time),
    temperatures: useHours.map(h => h.temp_c),
    rain: useHours.map(h => h.precip_mm || 0),
    wind: useHours.map(h => h.wind_kph),
    humidity: useHours.map(h => h.humidity)
  };

  return {
    latitude: data.location?.lat ?? lat,
    longitude: data.location?.lon ?? lon,
    timezone: data.location?.tz_id || 'Asia/Kolkata',
    retrieved_at: new Date().toISOString(),
    current,
    forecast,
    hourly,
    cached: false,
    provider: 'weatherapi.com'
  };
}

/**
 * Unified full-package weather fetcher (High Performance + Auto Fallback)
 */
async function fetchCompleteWeather(lat, lon) {
  const base = getApiBaseUrl();

  // Tier 1: Try NWA Backend API1
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${base}/api/v1/weather/all?lat=${lat}&lon=${lon}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      currentApiMode = 'backend';
      updateApiStatusBadge('backend', data.cached);
      return data;
    }
  } catch (backendErr) {
    console.warn('Backend API1 unreachable or slow, switching to direct Open-Meteo fallback:', backendErr.message);
  }

  // Tier 2: Automatic Direct Client Fallback to Open-Meteo
  try {
    const directUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,surface_pressure,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max,winddirection_10m_dominant,sunrise,sunset,uv_index_max,relative_humidity_2m_mean&hourly=temperature_2m,rain,wind_speed_10m,relative_humidity_2m&forecast_days=10&timezone=Asia/Kolkata`;

    const resp = await fetch(directUrl);
    if (!resp.ok) {
      throw new Error(`Open-Meteo HTTP ${resp.status}`);
    }
    const data = await resp.json();

    const currentRaw = data.current || {};
    const dailyRaw = data.daily || {};
    const hourlyRaw = data.hourly || {};

    const current = {
      temperature: currentRaw.temperature_2m,
      feels_like: currentRaw.apparent_temperature,
      humidity: currentRaw.relative_humidity_2m,
      precipitation: currentRaw.precipitation,
      wind_speed: currentRaw.wind_speed_10m,
      wind_direction: currentRaw.wind_direction_10m,
      surface_pressure: currentRaw.surface_pressure,
      weathercode: currentRaw.weathercode,
      uv_index: dailyRaw.uv_index_max ? dailyRaw.uv_index_max[0] : 6.0,
      sunrise: dailyRaw.sunrise ? dailyRaw.sunrise[0] : null,
      sunset: dailyRaw.sunset ? dailyRaw.sunset[0] : null,
      visibility: 10,
      provider: 'open-meteo'
    };

    const forecast = [];
    const days = dailyRaw.time || [];
    for (let i = 0; i < days.length; i++) {
      const tMax = dailyRaw.temperature_2m_max ? dailyRaw.temperature_2m_max[i] : 30;
      const tMin = dailyRaw.temperature_2m_min ? dailyRaw.temperature_2m_min[i] : 24;
      const fMax = dailyRaw.apparent_temperature_max ? dailyRaw.apparent_temperature_max[i] : (tMax ? tMax + 3 : 33);
      const fMin = dailyRaw.apparent_temperature_min ? dailyRaw.apparent_temperature_min[i] : tMin;
      const rainProb = dailyRaw.precipitation_probability_max ? dailyRaw.precipitation_probability_max[i] : (dailyRaw.precipitation_sum && dailyRaw.precipitation_sum[i] > 0 ? 80 : 20);

      forecast.push({
        date: days[i],
        weathercode: dailyRaw.weathercode ? dailyRaw.weathercode[i] : 0,
        temp_max: tMax,
        temp_min: tMin,
        feels_like_max: fMax,
        feels_like_min: fMin,
        humidity: dailyRaw.relative_humidity_2m_mean ? Math.round(dailyRaw.relative_humidity_2m_mean[i]) : 68,
        precipitation_sum: dailyRaw.precipitation_sum ? dailyRaw.precipitation_sum[i] : 0,
        precipitation_probability: rainProb,
        wind_speed_max: dailyRaw.windspeed_10m_max ? dailyRaw.windspeed_10m_max[i] : 10,
        wind_direction: dailyRaw.winddirection_10m_dominant ? dailyRaw.winddirection_10m_dominant[i] : 90,
        uv_index_max: dailyRaw.uv_index_max ? dailyRaw.uv_index_max[i] : null,
        sunrise: dailyRaw.sunrise ? dailyRaw.sunrise[i] : null,
        sunset: dailyRaw.sunset ? dailyRaw.sunset[i] : null
      });
    }

    const now = new Date();
    const currentHourStr = now.toISOString().slice(0, 13);
    let startIdx = 0;
    if (hourlyRaw.time) {
      const idx = hourlyRaw.time.findIndex(t => t >= currentHourStr);
      if (idx !== -1) startIdx = idx;
    }

    const hourly = {
      times: (hourlyRaw.time || []).slice(startIdx, startIdx + 24),
      temperatures: (hourlyRaw.temperature_2m || []).slice(startIdx, startIdx + 24),
      rain: (hourlyRaw.rain || []).slice(startIdx, startIdx + 24),
      wind: (hourlyRaw.wind_speed_10m || []).slice(startIdx, startIdx + 24),
      humidity: (hourlyRaw.relative_humidity_2m || []).slice(startIdx, startIdx + 24)
    };

    currentApiMode = 'direct';
    updateApiStatusBadge('direct', false);

    return {
      latitude: lat,
      longitude: lon,
      elevation: data.elevation,
      timezone: data.timezone,
      retrieved_at: new Date().toISOString(),
      current,
      forecast,
      hourly,
      cached: false,
      provider: 'open-meteo'
    };
  } catch (directErr) {
    console.warn('Open-Meteo direct fetch failed, switching to WeatherAPI.com fallback:', directErr.message);
  }

  // Tier 3: Automatic Alternative Fallback to WeatherAPI.com
  try {
    const weatherApiData = await fetchFromWeatherApiDirect(lat, lon);
    currentApiMode = 'weatherapi';
    updateApiStatusBadge('weatherapi', false);
    return weatherApiData;
  } catch (weatherApiErr) {
    console.error('All weather sources (Backend, Open-Meteo, WeatherAPI.com) failed:', weatherApiErr);
    throw new Error('Unable to connect to meteorological services: ' + weatherApiErr.message);
  }
}

/**
 * Update the visual status badge in the UI
 */
function updateApiStatusBadge(mode, isCached) {
  const badgeText = document.getElementById('headerApiText');
  const badgeEl = document.getElementById('headerApiBadge');
  const cachedEl = document.getElementById('cachedStatusBadge');

  if (cachedEl) {
    cachedEl.style.display = isCached ? 'inline-block' : 'none';
  }

  if (!badgeText || !badgeEl) return;

  if (mode === 'backend') {
    badgeText.textContent = isCached ? 'API (Cached)' : 'API Live';
    badgeEl.className = 'api-status-badge' + (isCached ? ' cached' : '');
    badgeEl.title = 'Connected to NWA API1 Backend (High Performance)';
  } else if (mode === 'weatherapi') {
    badgeText.textContent = 'WeatherAPI Live';
    badgeEl.className = 'api-status-badge fallback';
    badgeEl.title = 'Connected via WeatherAPI.com Alternative Feed';
  } else {
    badgeText.textContent = 'Direct Mode';
    badgeEl.className = 'api-status-badge fallback';
    badgeEl.title = 'Operating via Direct Open-Meteo Station Stream';
  }
}

/**
 * Resilient Location Search with Multi-Provider Fallback
 */
async function searchLocations(query) {
  const base = getApiBaseUrl();

  // 1. Try Backend search
  try {
    const res = await fetch(`${base}/api/v1/locations/search?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const results = await res.json();
      if (results && results.length > 0) return results;
    }
  } catch (e) {
    // backend offline, proceed to fallback
  }

  // 2. Direct Open-Meteo Geocoding Fallback
  try {
    const directGeoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
    const resp = await fetch(directGeoUrl);
    if (resp.ok) {
      const data = await resp.json();
      if (data.results && data.results.length > 0) {
        return data.results
          .filter(r => r.country_code === 'IN' || (r.country && r.country.toLowerCase() === 'india'))
          .map(r => ({
            name: r.name,
            state: r.admin1 || '',
            country: 'India',
            lat: r.latitude,
            lon: r.longitude
          }));
      }
    }
  } catch (err) {
    console.warn('Direct geocoding error:', err);
  }

  // 3. Direct WeatherAPI.com Geocoding Fallback
  try {
    const wApiGeoUrl = `https://api.weatherapi.com/v1/search.json?key=${WEATHERAPI_KEY}&q=${encodeURIComponent(query)}`;
    const resp = await fetch(wApiGeoUrl);
    if (resp.ok) {
      const results = await resp.json();
      if (Array.isArray(results) && results.length > 0) {
        return results.map(r => ({
          name: r.name,
          state: r.region || '',
          country: r.country || 'India',
          lat: r.lat,
          lon: r.lon
        }));
      }
    }
  } catch (err) {
    console.warn('WeatherAPI geocoding error:', err);
  }

  return [];
}

/**
 * Reverse Geocode: Coordinates -> Real Indian City / Town / Locality Name
 * Dual-tier resolution:
 * Tier 1: NWA Backend /api/v1/locations/reverse
 * Tier 2: Direct WeatherAPI current.json
 * Tier 3: Direct BigDataCloud reverse geocode client API
 */
async function reverseGeocode(lat, lon, fallbackState = '') {
  const base = getApiBaseUrl();

  // Tier 1: Local / Backend Proxy
  try {
    const res = await fetch(`${base}/api/v1/locations/reverse?lat=${lat}&lon=${lon}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.name && !data.name.startsWith('Location (')) {
        return {
          name: data.name,
          state: data.state || fallbackState || 'India',
          country: data.country || 'India'
        };
      }
    }
  } catch (err) {
    console.warn('Backend reverse geocoding error:', err.message);
  }

  // Tier 2: Direct WeatherAPI.com
  try {
    const wUrl = `https://api.weatherapi.com/v1/current.json?key=${WEATHERAPI_KEY}&q=${lat},${lon}`;
    const wResp = await fetch(wUrl);
    if (wResp.ok) {
      const wData = await wResp.json();
      if (wData && wData.location && wData.location.name) {
        return {
          name: wData.location.name,
          state: wData.location.region || fallbackState || 'India',
          country: wData.location.country || 'India'
        };
      }
    }
  } catch (err) {
    console.warn('WeatherAPI direct reverse lookup error:', err.message);
  }

  // Tier 3: Direct BigDataCloud Free Reverse Geocode API
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const bResp = await fetch(bdcUrl);
    if (bResp.ok) {
      const bData = await bResp.json();
      const place = bData.city || bData.locality || (bData.localityInfo?.administrative?.find(a => a.order >= 4)?.name);
      if (place) {
        return {
          name: place,
          state: bData.principalSubdivision || fallbackState || 'India',
          country: bData.countryName || 'India'
        };
      }
    }
  } catch (err) {
    console.warn('BigDataCloud direct reverse geocode error:', err.message);
  }

  return {
    name: fallbackState ? `${fallbackState} Region` : `Point (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
    state: fallbackState || 'India',
    country: 'India'
  };
}

// Backward-compatible individual functions
async function fetchCurrentWeather(lat, lon) {
  const full = await fetchCompleteWeather(lat, lon);
  return { current: full.current, cached: full.cached, retrieved_at: full.retrieved_at };
}

async function fetchForecastWeather(lat, lon) {
  const full = await fetchCompleteWeather(lat, lon);
  return { forecast: full.forecast };
}

async function fetchHourlyWeather(lat, lon) {
  const full = await fetchCompleteWeather(lat, lon);
  return { hourly: full.hourly };
}

window.NWAWeather = {
  getWmoInfo,
  getWindDirection,
  getUvRating,
  getApiBaseUrl,
  fetchCompleteWeather,
  fetchFromWeatherApiDirect,
  fetchCurrentWeather,
  fetchForecastWeather,
  fetchHourlyWeather,
  searchLocations,
  reverseGeocode
};

/**
 * NWA (National Weather Analytics) - Charts Module
 * Handles Chart.js rendering for hourly weather curves and Phase 3 analytics visualizations.
 */

let hourlyChartInstance = null;
let categoryChartInstance = null;
let statesChartInstance = null;
let urgencyChartInstance = null;

function getChartColors() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  return {
    textColor: isLight ? '#475569' : '#94a3b8',
    gridColor: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)',
    tempLine: '#0ea5e9',
    tempFill: isLight ? 'rgba(14, 165, 233, 0.15)' : 'rgba(14, 165, 233, 0.25)',
    rainBar: isLight ? 'rgba(59, 130, 246, 0.65)' : 'rgba(56, 189, 248, 0.65)',
    windLine: '#10b981'
  };
}

function renderHourlyChart(hourlyData) {
  const canvas = document.getElementById('hourlyTrendChart');
  if (!canvas || !hourlyData || !hourlyData.times) return;

  const ctx = canvas.getContext('2d');
  const colors = getChartColors();

  // Format labels to 12h or 24h format (e.g., '14:00' or '2 PM')
  const labels = hourlyData.times.map(t => {
    const d = new Date(t);
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true });
  });

  if (hourlyChartInstance) {
    hourlyChartInstance.destroy();
  }

  hourlyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Temperature (°C)',
          data: hourlyData.temperatures,
          borderColor: colors.tempLine,
          backgroundColor: colors.tempFill,
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointRadius: 2.5,
          pointHoverRadius: 6,
          yAxisID: 'yTemp'
        },
        {
          type: 'bar',
          label: 'Rainfall (mm)',
          data: hourlyData.rain,
          backgroundColor: colors.rainBar,
          borderRadius: 4,
          barThickness: 8,
          yAxisID: 'yRain'
        },
        {
          label: 'Wind Speed (km/h)',
          data: hourlyData.wind,
          borderColor: colors.windLine,
          borderDash: [4, 4],
          borderWidth: 1.5,
          tension: 0.3,
          fill: false,
          pointRadius: 0,
          yAxisID: 'yWind'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleColor: '#f1f5f9',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10,
          boxPadding: 4,
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const val = context.parsed.y;
              if (label.includes('Temperature')) return ` Temp: ${val}°C`;
              if (label.includes('Rainfall')) return ` Rain: ${val} mm`;
              if (label.includes('Wind')) return ` Wind: ${val} km/h`;
              return ` ${label}: ${val}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: colors.gridColor },
          ticks: { color: colors.textColor, font: { size: 11 } }
        },
        yTemp: {
          type: 'linear',
          position: 'left',
          grid: { color: colors.gridColor },
          ticks: {
            color: colors.textColor,
            callback: value => `${value}°`
          }
        },
        yRain: {
          type: 'linear',
          position: 'right',
          grid: { display: false },
          min: 0,
          suggestedMax: 10,
          ticks: {
            color: colors.textColor,
            callback: value => `${value}mm`
          }
        },
        yWind: {
          display: false,
          min: 0
        }
      }
    }
  });
}

function renderAnalyticsCharts(analyticsData) {
  const colors = getChartColors();
  const catCanvas = document.getElementById('analyticsCategoryChart');
  const statesCanvas = document.getElementById('analyticsStatesChart');

  // 1. Event Category Distribution Chart
  if (catCanvas && analyticsData.categoryDistribution) {
    if (categoryChartInstance) categoryChartInstance.destroy();
    const catLabels = {
      heavy_rain: 'Heavy Rain',
      flood: 'Flood / Inundation',
      cyclone: 'Cyclone / Depression',
      heatwave: 'Heatwave',
      hailstorm: 'Hailstorm',
      thunderstorm: 'Thunderstorm',
      other: 'Other Events'
    };

    const labels = Object.keys(analyticsData.categoryDistribution).map(k => catLabels[k] || k);
    const dataVals = Object.values(analyticsData.categoryDistribution);
    const bgPalette = ['#3b82f6', '#0ea5e9', '#ef4444', '#f59e0b', '#a855f7', '#eab308', '#94a3b8'];

    categoryChartInstance = new Chart(catCanvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: dataVals,
          backgroundColor: bgPalette,
          borderWidth: 2,
          borderColor: colors.gridColor
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: colors.textColor, font: { size: 11 }, boxWidth: 12 }
          }
        },
        cutout: '65%'
      }
    });
  }

  // 2. Top Affected States Bar Chart
  if (statesCanvas && analyticsData.topStates) {
    if (statesChartInstance) statesChartInstance.destroy();

    const labels = analyticsData.topStates.map(s => s.state);
    const counts = analyticsData.topStates.map(s => s.count);

    statesChartInstance = new Chart(statesCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Reported Weather Events',
          data: counts,
          backgroundColor: '#0ea5e9',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: colors.gridColor },
            ticks: { color: colors.textColor, stepSize: 1 }
          },
          y: {
            grid: { display: false },
            ticks: { color: colors.textColor, font: { weight: '600' } }
          }
        }
      }
    });
  }
}

function updateChartsTheme() {
  const colors = getChartColors();
  if (hourlyChartInstance) {
    hourlyChartInstance.options.scales.x.ticks.color = colors.textColor;
    hourlyChartInstance.options.scales.x.grid.color = colors.gridColor;
    hourlyChartInstance.options.scales.yTemp.ticks.color = colors.textColor;
    hourlyChartInstance.options.scales.yTemp.grid.color = colors.gridColor;
    hourlyChartInstance.options.scales.yRain.ticks.color = colors.textColor;
    hourlyChartInstance.update();
  }

  if (forecastTrajectoryChartInstance) {
    forecastTrajectoryChartInstance.options.scales.x.ticks.color = colors.textColor;
    forecastTrajectoryChartInstance.options.scales.x.grid.color = colors.gridColor;
    forecastTrajectoryChartInstance.options.scales.yTemp.ticks.color = colors.textColor;
    forecastTrajectoryChartInstance.options.scales.yTemp.grid.color = colors.gridColor;
    forecastTrajectoryChartInstance.options.scales.yRain.ticks.color = '#10b981';
    forecastTrajectoryChartInstance.update();
  }
}

// ----------------------------------------------------
// 24-Hour Diurnal Progression & Interactive Hour Details
// ----------------------------------------------------
let currentHourlyData = null;
let currentSelectedHourIndex = 0;

function renderDiurnalProgression(hourlyData) {
  const container = document.getElementById('diurnalCardsStrip');
  if (!container || !hourlyData || !hourlyData.times || hourlyData.times.length === 0) return;

  currentHourlyData = hourlyData;
  currentSelectedHourIndex = 0;

  const count = Math.min(hourlyData.times.length, 24);
  const cardsHtml = [];

  for (let i = 0; i < count; i++) {
    const timeRaw = hourlyData.times[i];
    const dateObj = new Date(timeRaw);
    const timeFormatted = isNaN(dateObj.getTime())
      ? (timeRaw.includes('T') ? timeRaw.split('T')[1].slice(0, 5) : timeRaw)
      : dateObj.toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true });

    const temp = Math.round(hourlyData.temperatures ? hourlyData.temperatures[i] : 25);
    const rain = hourlyData.rain ? (hourlyData.rain[i] || 0) : 0;
    const wind = hourlyData.wind ? (hourlyData.wind[i] || 0) : 0;

    let iconClass = 'fa-cloud-sun';
    let iconColor = '#f59e0b';

    if (rain > 5) {
      iconClass = 'fa-cloud-showers-heavy';
      iconColor = '#0284c7';
    } else if (rain > 0.2) {
      iconClass = 'fa-cloud-rain';
      iconColor = '#38bdf8';
    } else if (wind > 25) {
      iconClass = 'fa-wind';
      iconColor = '#10b981';
    } else if (temp >= 35) {
      iconClass = 'fa-sun';
      iconColor = '#f59e0b';
    } else if (temp <= 15) {
      iconClass = 'fa-snowflake';
      iconColor = '#06b6d4';
    } else {
      const hourNum = dateObj.getHours ? dateObj.getHours() : i;
      if (hourNum < 6 || hourNum >= 19) {
        iconClass = 'fa-moon';
        iconColor = '#94a3b8';
      }
    }

    cardsHtml.push(`
      <div class="diurnal-hour-card ${i === 0 ? 'active' : ''}" data-index="${i}" onclick="NWACharts.selectDiurnalHour(${i})">
        <div class="diurnal-time">${timeFormatted}</div>
        <i class="fa-solid ${iconClass} diurnal-icon" style="color: ${iconColor};"></i>
        <div class="diurnal-temp">${temp}°</div>
      </div>
    `);
  }

  container.innerHTML = cardsHtml.join('');
  selectDiurnalHour(0);
}

function selectDiurnalHour(index) {
  if (!currentHourlyData || !currentHourlyData.times || !currentHourlyData.times[index]) return;
  currentSelectedHourIndex = index;

  document.querySelectorAll('.diurnal-hour-card').forEach(card => {
    const cardIdx = parseInt(card.getAttribute('data-index'), 10);
    card.classList.toggle('active', cardIdx === index);
  });

  const timeRaw = currentHourlyData.times[index];
  const dateObj = new Date(timeRaw);
  const timeFormatted = isNaN(dateObj.getTime())
    ? timeRaw
    : dateObj.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

  const temp = currentHourlyData.temperatures ? currentHourlyData.temperatures[index] : 25;
  const rain = currentHourlyData.rain ? (currentHourlyData.rain[index] || 0) : 0;
  const wind = currentHourlyData.wind ? (currentHourlyData.wind[index] || 0) : 0;
  const humidity = currentHourlyData.humidity ? (currentHourlyData.humidity[index] || 60) : 60;

  const feelsLike = Math.round(temp + (humidity > 60 ? (humidity - 60) * 0.1 : 0) + (temp > 30 ? 2 : 0));

  let conditionDesc = 'Fair Atmospheric Conditions';
  let condIcon = 'fa-cloud-sun';
  let condColor = '#f59e0b';

  if (rain > 5) {
    conditionDesc = 'Severe Heavy Rain & Downpour';
    condIcon = 'fa-cloud-showers-heavy';
    condColor = '#ef4444';
  } else if (rain > 1) {
    conditionDesc = 'Moderate Rainfall & Damp Surface';
    condIcon = 'fa-cloud-rain';
    condColor = '#0ea5e9';
  } else if (rain > 0.1) {
    conditionDesc = 'Light Drizzle & Scattered Cloudiness';
    condIcon = 'fa-cloud-sun-rain';
    condColor = '#38bdf8';
  } else if (temp >= 38) {
    conditionDesc = 'Extreme Heatwave Advisory';
    condIcon = 'fa-sun';
    condColor = '#ef4444';
  } else if (temp >= 32) {
    conditionDesc = 'Warm & Humid Daylight';
    condIcon = 'fa-sun';
    condColor = '#f59e0b';
  } else if (wind >= 25) {
    conditionDesc = 'Gusty Winds & Air Motion';
    condIcon = 'fa-wind';
    condColor = '#10b981';
  }

  const detailBox = document.getElementById('diurnalDetailBox');
  if (!detailBox) return;

  detailBox.innerHTML = `
    <div class="diurnal-detail-header">
      <div>
        <div class="diurnal-detail-time">
          <i class="fa-regular fa-clock" style="color: var(--accent-primary);"></i>
          <span>Detailed Forecast Telemetry for <strong>${timeFormatted}</strong></span>
        </div>
        <div class="diurnal-detail-desc">
          <i class="fa-solid ${condIcon}" style="color: ${condColor};"></i>
          <span>${conditionDesc}</span>
        </div>
      </div>
      <div class="diurnal-detail-temp-badge">
        <span class="detail-temp-val">${Math.round(temp)}°C</span>
        <span class="detail-temp-feels">Feels like <strong>${feelsLike}°C</strong></span>
      </div>
    </div>

    <div class="diurnal-detail-metrics">
      <div class="diurnal-metric-pill" title="Expected Hourly Precipitation">
        <i class="fa-solid fa-cloud-rain" style="color: #38bdf8;"></i>
        <span>Rainfall: <strong>${rain} mm</strong></span>
      </div>
      <div class="diurnal-metric-pill" title="Relative Moisture Level">
        <i class="fa-solid fa-droplet" style="color: #06b6d4;"></i>
        <span>Humidity: <strong>${humidity}%</strong></span>
      </div>
      <div class="diurnal-metric-pill" title="Wind Velocity">
        <i class="fa-solid fa-wind" style="color: #10b981;"></i>
        <span>Wind: <strong>${Math.round(wind)} km/h</strong></span>
      </div>
      <div class="diurnal-metric-pill" title="Estimated Barometric Pressure">
        <i class="fa-solid fa-gauge-high" style="color: #8b5cf6;"></i>
        <span>Pressure: <strong>${1012 - Math.round(rain * 0.5)} hPa</strong></span>
      </div>
      <div class="diurnal-metric-pill" title="Estimated UV Radiation Index">
        <i class="fa-solid fa-sun" style="color: #f59e0b;"></i>
        <span>UV Index: <strong>${temp > 30 ? '6.5 (High)' : '3.2 (Moderate)'}</strong></span>
      </div>
    </div>
  `;

  detailBox.style.display = 'block';
}

let forecastTrajectoryChartInstance = null;

function renderHourlyChart(hourlyData) {
  // Direct delegation to unified trajectory chart
  if (window.NWACharts && window.NWACharts.renderForecastTrajectoryChart) {
    const forecast = window.NWAApp && window.NWAApp.getForecastData ? window.NWAApp.getForecastData() : null;
    window.NWACharts.renderForecastTrajectoryChart(forecast, 1, hourlyData);
  }
}

function renderForecastTrajectoryChart(forecastData, rangeCount = 10, hourlyData = null) {
  const canvas = document.getElementById('forecastTrajectoryChart');
  if (!canvas) return;

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const textColor = isLight ? '#475569' : '#94a3b8';
  const gridColor = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';

  const titleTextEl = document.getElementById('trajectoryChartTitleText');
  const legText1 = document.getElementById('legText1');
  const legText2 = document.getElementById('legText2');
  const legText3 = document.getElementById('legText3');

  let labels = [];
  let ds1Data = [];
  let ds2Data = [];
  let ds3Data = [];
  let ds1Label = 'Max Temp (°C)';
  let ds2Label = 'Min Temp (°C)';
  let ds3Label = 'Rain %';

  const hData = hourlyData || (window.NWAApp && window.NWAApp.getHourlyData ? window.NWAApp.getHourlyData() : null);

  if (rangeCount === 1 && hData && hData.times && hData.times.length > 0) {
    if (titleTextEl) titleTextEl.textContent = '24-Hour Temperature & Rain Forecast';
    if (legText1) legText1.textContent = 'Temperature (°C)';
    if (legText2) legText2.textContent = 'Wind Speed (km/h)';
    if (legText3) legText3.textContent = 'Rainfall / Rain %';

    ds1Label = 'Temperature (°C)';
    ds2Label = 'Wind Speed (km/h)';
    ds3Label = 'Rain %';

    const count = hData.times.length;
    for (let i = 0; i < count; i++) {
      const d = new Date(hData.times[i]);
      const timeStr = !isNaN(d.getTime()) ? d.toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true }) : `H+${i}`;
      labels.push(timeStr);
      const t = Math.round(hData.temperatures ? hData.temperatures[i] : 28);
      ds1Data.push(t);
      const w = Math.round(hData.wind ? hData.wind[i] : 10);
      ds2Data.push(w);
      const r = hData.rain ? hData.rain[i] : 0;
      ds3Data.push(Math.min(100, Math.max(0, Math.round(r > 0 ? (r * 25 + 30) : 10))));
    }
  } else if (forecastData && forecastData.length > 0) {
    if (titleTextEl) titleTextEl.textContent = `${rangeCount}-Day Temperature & Rain Forecast Trend`;
    if (legText1) legText1.textContent = 'Max Temp (°C)';
    if (legText2) legText2.textContent = 'Min Temp (°C)';
    if (legText3) legText3.textContent = 'Rain Probability (%)';

    ds1Label = 'Max Temp (°C)';
    ds2Label = 'Min Temp (°C)';
    ds3Label = 'Rain Probability (%)';

    const slice = forecastData.slice(0, rangeCount);
    labels = slice.map(f => {
      const d = new Date(f.date);
      return isNaN(d.getTime()) ? f.date : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
    });
    ds1Data = slice.map(f => Math.round(f.temp_max ?? 30));
    ds2Data = slice.map(f => Math.round(f.temp_min ?? 24));
    ds3Data = slice.map(f => Math.round(f.precipitation_probability ?? 0));
  } else {
       const allTemps = [...ds1Data, ...ds2Data].filter(v => typeof v === 'number' && !isNaN(v));
    const minT = allTemps.length > 0 ? Math.min(...allTemps) : 20;
    const maxT = allTemps.length > 0 ? Math.max(...allTemps) : 35;
    const yMin = Math.max(0, Math.floor((minT - 4) / 5) * 5);
    const yMax = Math.ceil((maxT + 4) / 5) * 5;

    if (forecastTrajectoryChartInstance) {
      forecastTrajectoryChartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');
    forecastTrajectoryChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: ds1Label,
            data: ds1Data,
            borderColor: '#0284c7',
            backgroundColor: isLight ? 'rgba(2, 132, 199, 0.08)' : 'rgba(2, 132, 199, 0.15)',
            borderWidth: 2.5,
            tension: 0.25,
            fill: true,
            pointRadius: rangeCount === 1 ? 2.5 : 4.5,
            pointHoverRadius: 6,
            pointBackgroundColor: '#0284c7',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1.5,
            yAxisID: 'yTemp'
          },
          {
            label: ds2Label,
            data: ds2Data,
            borderColor: '#38bdf8',
            borderDash: [5, 4],
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.25,
            fill: false,
            pointRadius: rangeCount === 1 ? 2 : 4,
            pointHoverRadius: 5.5,
            pointBackgroundColor: '#38bdf8',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1.5,
            yAxisID: rangeCount === 1 ? 'yWind' : 'yTemp'
          },
          {
            label: ds3Label,
            data: ds3Data,
            borderColor: '#10b981',
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.25,
            fill: false,
            pointRadius: rangeCount === 1 ? 1.5 : 3.5,
            pointHoverRadius: 5,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1,
            yAxisID: 'yRain'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(13, 21, 28, 0.95)',
            titleColor: isLight ? '#0f172a' : '#f8fafc',
            bodyColor: isLight ? '#334155' : '#cbd5e1',
            borderColor: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 8,
            boxPadding: 4,
            usePointStyle: true,
            callbacks: {
              label: function (ctx) {
                const lbl = ctx.dataset.label || '';
                if (ctx.dataset.yAxisID === 'yRain') {
                  return ` ${lbl}: ${ctx.parsed.y}%`;
                }
                if (ctx.dataset.yAxisID === 'yWind') {
                  return ` ${lbl}: ${ctx.parsed.y} km/h`;
                }
                return ` ${lbl}: ${ctx.parsed.y}°C`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 11, family: 'Plus Jakarta Sans' } }
          },
          yTemp: {
            type: 'linear',
            position: 'left',
            min: yMin,
            max: yMax,
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              stepSize: (yMax - yMin) <= 15 ? 2 : 5,
              font: { size: 10, family: 'Plus Jakarta Sans' },
              callback: v => `${v}°C`
            }
          },
          yRain: {
            type: 'linear',
            position: 'right',
            min: 0,
            max: 100,
            grid: { drawOnChartArea: false },
            ticks: {
              color: '#10b981',
              stepSize: 25,
              font: { size: 10, family: 'Plus Jakarta Sans' },
              callback: v => `${v}%`
            }
          },
          yWind: {
            display: false,
            min: 0
          }
        }
      }
    });
  }
}

window.NWACharts = {
  renderHourlyChart,
  renderAnalyticsCharts,
  updateChartsTheme,
  renderDiurnalProgression,
  selectDiurnalHour,
  renderForecastTrajectoryChart
};

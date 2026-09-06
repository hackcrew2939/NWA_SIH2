/**
 * NWA (National Weather Analytics) - Export Module (FR-5)
 * Generates downloadable Excel (.xlsx) and PDF reports with current conditions and 4-day forecast.
 */

async function exportToExcel() {
  const current = window.NWAApp.getCurrentData();
  const location = window.NWAApp.getCurrentLocation();
  const forecast = window.NWAApp.getForecastData();

  if (!current || !location) {
    window.NWAApp.showToast('Please wait for weather data to load before exporting.', 'error');
    return;
  }

  try {
    // Check if SheetJS is available
    if (typeof XLSX !== 'undefined') {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Current Conditions
      const currentRows = [
        ['NATIONAL WEATHER ANALYTICS (NWA) - OFFICIAL WEATHER REPORT'],
        ['Report Generated', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'],
        ['Target Location', `${location.name}, ${location.state || 'India'}`],
        ['Coordinates', `Latitude: ${location.lat}, Longitude: ${location.lon}`],
        ['Data Attribution', 'IMD Open Data & Open-Meteo Meteorological Models'],
        [],
        ['Parameter', 'Measurement', 'Unit', 'Remarks'],
        ['Temperature', current.temperature, '°C', 'Ambient surface temperature'],
        ['Feels Like', current.feels_like, '°C', 'Apparent index'],
        ['Relative Humidity', current.humidity, '%', 'Atmospheric saturation'],
        ['Precipitation', current.precipitation, 'mm', 'Current hour accumulation'],
        ['Wind Speed', current.wind_speed, 'km/h', '10m elevation velocity'],
        ['Wind Direction', `${current.wind_direction}° (${window.NWAWeather.getWindDirection(current.wind_direction)})`, 'deg', 'Compass bearing'],
        ['Surface Pressure', current.surface_pressure, 'hPa', 'Barometric reading'],
        ['UV Index', current.uv_index, 'Index (0-11+)', window.NWAWeather.getUvRating(current.uv_index).text],
        ['Sunrise', current.sunrise ? new Date(current.sunrise).toLocaleTimeString('en-IN') : 'N/A', 'IST', 'Astronomical dawn'],
        ['Sunset', current.sunset ? new Date(current.sunset).toLocaleTimeString('en-IN') : 'N/A', 'IST', 'Astronomical dusk']
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(currentRows);
      ws1['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 32 }];
      XLSX.utils.book_append_sheet(wb, ws1, 'Current Weather');

      // Sheet 2: 4-Day Forecast
      if (forecast && forecast.length > 0) {
        const fcRows = [
          ['Date', 'Day', 'Condition', 'Max Temp (°C)', 'Min Temp (°C)', 'Rainfall (mm)', 'Max Wind (km/h)', 'UV Index', 'Sunrise', 'Sunset']
        ];
        forecast.forEach(f => {
          const d = new Date(f.date);
          const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
          const cond = window.NWAWeather.getWmoInfo(f.weathercode).desc;
          fcRows.push([
            f.date,
            dayName,
            cond,
            f.temp_max,
            f.temp_min,
            f.precipitation_sum,
            f.wind_speed_max,
            f.uv_index_max,
            f.sunrise ? new Date(f.sunrise).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
            f.sunset ? new Date(f.sunset).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'
          ]);
        });
        const ws2 = XLSX.utils.aoa_to_sheet(fcRows);
        ws2['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 26 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, ws2, '4-Day Outlook');
      }

      const fileName = `NWA_Weather_Report_${location.name.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
      XLSX.writeFile(wb, fileName);
      window.NWAApp.showToast('Excel report downloaded successfully!', 'success');
    } else {
      // Trigger server endpoint fallback
      window.location.href = `/api/v1/export?lat=${location.lat}&lon=${location.lon}&location=${encodeURIComponent(location.name)}&format=xlsx`;
    }
  } catch (err) {
    console.error('Error generating Excel report:', err);
    window.NWAApp.showToast('Could not generate Excel report: ' + err.message, 'error');
  }
}

async function exportToPDF() {
  const current = window.NWAApp.getCurrentData();
  const location = window.NWAApp.getCurrentLocation();
  const forecast = window.NWAApp.getForecastData();

  if (!current || !location) {
    window.NWAApp.showToast('Please wait for weather data to load before exporting.', 'error');
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
      window.NWAApp.showToast('PDF generator library not loaded.', 'error');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Brand Header
    doc.setFillColor(14, 165, 233);
    doc.rect(0, 0, 210, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('NATIONAL WEATHER ANALYTICS (NWA)', 14, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('OFFICIAL METEOROLOGICAL INTELLIGENCE REPORT', 14, 20);

    // Meta Block
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Location: ${location.name}, ${location.state || 'India'}`, 14, 34);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const dateStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
    doc.text(`Generated on: ${dateStr}`, 14, 40);
    doc.text(`Coordinates: Latitude ${location.lat}, Longitude ${location.lon}`, 14, 45);
    doc.text(`Data Source: IMD Integration & Open-Meteo Global Forecasting Engine`, 14, 50);

    // Table 1: Current Weather Snapshot
    const currentTableData = [
      ['Ambient Temperature', `${current.temperature} °C`, 'Relative Humidity', `${current.humidity} %`],
      ['Feels Like Temperature', `${current.feels_like} °C`, 'Surface Pressure', `${current.surface_pressure} hPa`],
      ['Precipitation / Rain', `${current.precipitation} mm`, 'UV Index', `${current.uv_index} (${window.NWAWeather.getUvRating(current.uv_index).text})`],
      ['Wind Speed', `${current.wind_speed} km/h`, 'Wind Direction', `${current.wind_direction}° (${window.NWAWeather.getWindDirection(current.wind_direction)})`],
      ['Sunrise (IST)', current.sunrise ? new Date(current.sunrise).toLocaleTimeString('en-IN') : 'N/A', 'Sunset (IST)', current.sunset ? new Date(current.sunset).toLocaleTimeString('en-IN') : 'N/A']
    ];

    doc.autoTable({
      startY: 56,
      head: [['Metric', 'Value', 'Metric', 'Value']],
      body: currentTableData,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [15, 23, 42]
      },
      margin: { left: 14, right: 14 }
    });

    // Section 2: 4-Day Outlook Header
    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('4-Day Weather Forecast Outlook', 14, finalY);

    // Table 2: 4-Day Forecast
    if (forecast && forecast.length > 0) {
      const forecastRows = forecast.map(f => {
        const d = new Date(f.date);
        const dayStr = d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
        const cond = window.NWAWeather.getWmoInfo(f.weathercode).desc;
        return [
          dayStr,
          cond,
          `${f.temp_max}°C`,
          `${f.temp_min}°C`,
          `${f.precipitation_sum} mm`,
          `${f.wind_speed_max} km/h`,
          `${f.uv_index_max || 'N/A'}`
        ];
      });

      doc.autoTable({
        startY: finalY + 4,
        head: [['Date', 'Conditions', 'High', 'Low', 'Rain', 'Wind Speed', 'UV Max']],
        body: forecastRows,
        theme: 'striped',
        headStyles: {
          fillColor: [2, 132, 199],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59]
        },
        margin: { left: 14, right: 14 }
      });
    }

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('National Weather Analytics (NWA) • Government & Public Weather Intelligence System • Confidential & Public Report', 14, pageHeight - 10);

    const fileName = `NWA_Report_${location.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    doc.save(fileName);
    window.NWAApp.showToast('PDF report downloaded successfully!', 'success');
  } catch (err) {
    console.error('Error generating PDF report:', err);
    window.NWAApp.showToast('Could not generate PDF report: ' + err.message, 'error');
  }
}

function updateReportPreview() {
  const current = window.NWAApp.getCurrentData();
  const location = window.NWAApp.getCurrentLocation();
  const forecast = window.NWAApp.getForecastData();

  const previewLocEl = document.getElementById('reportPreviewLocation');
  const previewMetaEl = document.getElementById('reportPreviewMeta');
  const currentTableBody = document.getElementById('reportPreviewCurrentBody');
  const forecastTableBody = document.getElementById('reportPreviewForecastBody');

  if (!previewLocEl || !currentTableBody) return;

  if (!location || !current) {
    previewLocEl.textContent = 'Loading latest meteorological observation data...';
    return;
  }

  previewLocEl.textContent = `${location.name}, ${location.state || 'India'}`;
  if (previewMetaEl) {
    const timeStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
    previewMetaEl.textContent = `Coordinates: Lat ${location.lat}, Lon ${location.lon} | Generated: ${timeStr} | Source: IMD Open Data & Open-Meteo Models`;
  }

  const currentMetrics = [
    { param: 'Surface Temperature', val: `${current.temperature} °C`, remark: 'Ambient surface dry-bulb reading' },
    { param: 'Feels Like Temperature', val: `${current.feels_like} °C`, remark: 'Perceived atmospheric index' },
    { param: 'Relative Humidity', val: `${current.humidity} %`, remark: 'Atmospheric moisture saturation' },
    { param: 'Precipitation', val: `${current.precipitation} mm`, remark: 'Current hour measured accumulation' },
    { param: 'Wind Speed', val: `${current.wind_speed} km/h`, remark: '10-meter elevation velocity' },
    { param: 'Wind Direction', val: `${current.wind_direction}° (${window.NWAWeather ? window.NWAWeather.getWindDirection(current.wind_direction) : 'N/A'})`, remark: 'Compass origin bearing' },
    { param: 'Surface Pressure', val: `${current.surface_pressure} hPa`, remark: 'Barometric station pressure' },
    { param: 'UV Index', val: `${current.uv_index}`, remark: window.NWAWeather ? window.NWAWeather.getUvRating(current.uv_index).text : 'Standard scale' },
    { param: 'Sunrise (Dawn)', val: current.sunrise ? new Date(current.sunrise).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST' : 'N/A', remark: 'Astronomical sunrise' },
    { param: 'Sunset (Dusk)', val: current.sunset ? new Date(current.sunset).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST' : 'N/A', remark: 'Astronomical sunset' }
  ];

  currentTableBody.innerHTML = currentMetrics.map(m => `
    <tr>
      <td style="font-weight: 600; color: var(--text-primary);">${m.param}</td>
      <td style="font-weight: 700; color: var(--accent-primary);">${m.val}</td>
      <td style="color: var(--text-secondary); font-size: 0.82rem;">${m.remark}</td>
    </tr>
  `).join('');

  if (forecastTableBody && forecast && forecast.length > 0) {
    forecastTableBody.innerHTML = forecast.map(f => {
      const d = new Date(f.date);
      const dayName = d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
      const wmo = window.NWAWeather ? window.NWAWeather.getWmoInfo(f.weathercode) : { desc: 'Standard', icon: 'fa-cloud' };
      return `
        <tr>
          <td style="font-weight: 600; color: var(--text-primary);">${dayName}</td>
          <td><span style="display: inline-flex; align-items: center; gap: 0.4rem;"><i class="fa-solid ${wmo.icon}" style="color: var(--accent-primary);"></i> ${wmo.desc}</span></td>
          <td style="font-weight: 700; color: var(--text-primary);">${f.temp_max}°C / <span style="color: var(--text-muted); font-weight: 400;">${f.temp_min}°C</span></td>
          <td>${f.precipitation_sum} mm</td>
          <td>${f.wind_speed_max} km/h</td>
          <td>${f.uv_index_max || 'N/A'}</td>
        </tr>
      `;
    }).join('');
  }
}

window.NWAExport = {
  exportToExcel,
  exportToPDF,
  updateReportPreview
};

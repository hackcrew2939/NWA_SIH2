async function testAll() {
  const base = 'http://127.0.0.1:3000';
  
  // 1. Current Weather
  const curr = await fetch(base + '/api/v1/weather/current?lat=28.6139&lon=77.2090').then(r => r.json());
  console.log('1. Current Weather Check:', curr.current?.temperature !== undefined ? 'PASS' : 'FAIL', 'Temp:', curr.current?.temperature);
  
  // 2. 4-day forecast
  const fc = await fetch(base + '/api/v1/weather/forecast?lat=28.6139&lon=77.2090').then(r => r.json());
  console.log('2. 4-Day Forecast Check:', fc.forecast?.length === 4 ? 'PASS' : 'FAIL', 'Days count:', fc.forecast?.length);
  
  // 3. Hourly Weather
  const hr = await fetch(base + '/api/v1/weather/hourly?lat=28.6139&lon=77.2090').then(r => r.json());
  console.log('3. Hourly Weather Check:', hr.hourly?.times?.length > 0 ? 'PASS' : 'FAIL', 'Hours count:', hr.hourly?.times?.length);
  
  // 4. Geocoding search
  const geo = await fetch(base + '/api/v1/locations/search?q=mumbai').then(r => r.json());
  console.log('4. Location Search Check:', geo.length > 0 ? 'PASS' : 'FAIL', 'First match:', geo[0]?.name);

  // 5. Citizen Reports GET
  const reps = await fetch(base + '/api/v1/reports').then(r => r.json());
  console.log('5. Citizen Reports GET Check:', reps.length > 0 ? 'PASS' : 'FAIL', 'Count:', reps.length);

  // 6. Citizen Report POST
  const newRep = await fetch(base + '/api/v1/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'heavy_rain',
      location: 'Connaught Place, Delhi',
      state: 'Delhi',
      lat: 28.6315,
      lon: 77.2167,
      description: 'Heavy sudden thunderstorm downpour, visibility reduced to 500m.',
      reporter_name: 'Test Citizen'
    })
  }).then(r => r.json());
  console.log('6. Citizen Report POST Check:', newRep.report?.id ? 'PASS' : 'FAIL', 'New ID:', newRep.report?.id);

  // 7. Moderate Report
  if (newRep.report?.id) {
    const loginRes = await fetch(base + '/api/v1/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'admin@imd2026' })
    }).then(r => r.json());

    const mod = await fetch(base + '/api/v1/reports/' + newRep.report.id + '/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': loginRes.token },
      body: JSON.stringify({ action: 'verify' })
    }).then(r => r.json());
    console.log('7. Moderate Report Check:', mod.report?.verified_status === 'verified' ? 'PASS' : 'FAIL', 'Status:', mod.report?.verified_status);
  }

  // 8. Social Stream
  const soc = await fetch(base + '/api/v1/social/stream').then(r => r.json());
  console.log('8. Social Stream Check:', soc.length > 0 ? 'PASS' : 'FAIL', 'First Tweet:', soc[0]?.hashtag);

  // 9. Analytics Trends
  const ana = await fetch(base + '/api/v1/analytics/trends').then(r => r.json());
  console.log('9. Analytics Trends Check:', ana.totalEvents > 0 ? 'PASS' : 'FAIL', 'Accuracy:', ana.nlpAccuracyIndex);

  // 10. Frontend index.html served
  const page = await fetch(base + '/').then(r => r.text());
  console.log('10. Frontend HTML Check:', page.includes('National Weather Analytics') ? 'PASS' : 'FAIL');

  // 11. Health Check
  const health = await fetch(base + '/api/v1/health').then(r => r.json());
  console.log('11. Health Endpoint Check:', health.status === 'ok' ? 'PASS' : 'FAIL', 'Service:', health.service);

  // 12. Unified Weather All
  const all = await fetch(base + '/api/v1/weather/all?lat=28.6139&lon=77.2090').then(r => r.json());
  console.log('12. Unified Weather /all Check:', all.current && all.forecast && all.hourly ? 'PASS' : 'FAIL', 'Forecast Days:', all.forecast?.length);
}

testAll().catch(console.error);

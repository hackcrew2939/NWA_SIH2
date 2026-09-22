async function testAll() {
  const base = 'http://127.0.0.1:3000';
  let passed = 0;
  let total = 0;

  function logTest(num, name, condition, details = '') {
    total++;
    if (condition) {
      console.log(`[PASS] ${num}. ${name} - ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] ${num}. ${name} - ${details}`);
    }
  }

  console.log('=== RUNNING NATIONAL WEATHER BIG DATA ANALYTICS PLATFORM API SUITE ===\n');

  // 1. Current Weather
  const curr = await fetch(base + '/api/v1/weather/current?lat=28.6139&lon=77.2090').then(r => r.json());
  logTest(1, 'Current Weather Check', curr.current?.temperature !== undefined, `Temp: ${curr.current?.temperature}°C`);

  // 2. 4-day forecast
  const fc = await fetch(base + '/api/v1/weather/forecast?lat=28.6139&lon=77.2090').then(r => r.json());
  logTest(2, '4-Day Forecast Check', fc.forecast?.length === 4, `Days count: ${fc.forecast?.length}`);

  // 3. Hourly Weather
  const hr = await fetch(base + '/api/v1/weather/hourly?lat=28.6139&lon=77.2090').then(r => r.json());
  logTest(3, 'Hourly Weather Check', hr.hourly?.times?.length > 0, `Hours count: ${hr.hourly?.times?.length}`);

  // 4. Geocoding search
  const geo = await fetch(base + '/api/v1/locations/search?q=mumbai').then(r => r.json());
  logTest(4, 'Location Search Check', geo.length > 0, `First match: ${geo[0]?.name}`);

  // 5. Citizen Reports GET
  const reps = await fetch(base + '/api/v1/reports').then(r => r.json());
  logTest(5, 'Citizen Reports GET Check', reps.length > 0, `Count: ${reps.length}`);

  // 6. Citizen Report POST with AI Trust Breakdown
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
      reporter_name: 'Dr. Vikram Sarabhai',
      photo: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=500&q=80'
    })
  }).then(r => r.json());
  
  const hasTrustBreakdown = Boolean(newRep.report?.ai_trust_breakdown?.authenticity_grade);
  logTest(6, 'Citizen Report POST + AI Multi-Modal Forensics', newRep.report?.id && hasTrustBreakdown, `ID: ${newRep.report?.id}, Grade: ${newRep.report?.ai_trust_breakdown?.authenticity_grade}, Trust: ${newRep.report?.ai_trust_breakdown?.composite_trust}`);

  // 7. Admin Login & Moderation
  let adminToken = '';
  if (newRep.report?.id) {
    const loginRes = await fetch(base + '/api/v1/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'admin@imd2026' })
    }).then(r => r.json());
    adminToken = loginRes.token;

    const mod = await fetch(base + '/api/v1/reports/' + newRep.report.id + '/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': loginRes.token },
      body: JSON.stringify({ action: 'verify' })
    }).then(r => r.json());
    logTest(7, 'Moderate Report Check', mod.report?.verified_status === 'verified', `Status: ${mod.report?.verified_status}`);
  }

  // 8. Social Stream
  const soc = await fetch(base + '/api/v1/social/stream').then(r => r.json());
  logTest(8, 'Social Stream Check', soc.length > 0, `First Item: ${soc[0]?.hashtag || soc[0]?.source}`);

  // 9. Analytics Trends
  const ana = await fetch(base + '/api/v1/analytics/trends').then(r => r.json());
  logTest(9, 'Analytics Trends Check', ana.totalEvents > 0, `Events: ${ana.totalEvents}, Accuracy: ${ana.nlpAccuracyIndex}`);

  // 10. Frontend HTML
  const page = await fetch(base + '/').then(r => r.text());
  logTest(10, 'Frontend HTML Check', page.includes('National Weather Analytics') && page.includes('liveSyncStatusBadge'), 'Live sync badge present in markup');

  // 11. Health Endpoint
  const health = await fetch(base + '/api/v1/health').then(r => r.json());
  logTest(11, 'Health Endpoint Check', health.status === 'ok', `Service: ${health.service}, SSE Clients: ${health.sse_clients_connected}`);

  // 12. Unified Weather
  const all = await fetch(base + '/api/v1/weather/all?lat=28.6139&lon=77.2090').then(r => r.json());
  logTest(12, 'Unified Weather /all Check', all.current && all.forecast && all.hourly, `Forecast Days: ${all.forecast?.length}`);

  // 13. Big Data Pipeline Telemetry
  const telemetry = await fetch(base + '/api/v1/admin/pipeline/telemetry', {
    headers: { 'x-admin-token': adminToken }
  }).then(r => r.json());
  logTest(13, 'Big Data Pipeline Telemetry Check', telemetry.telemetry?.active_connector !== undefined, `Connector: ${telemetry.telemetry?.active_connector}, Partitions: ${telemetry.telemetry?.partitions?.length}`);

  // 14. Big Data Connector Switching
  const switchRes = await fetch(base + '/api/v1/admin/pipeline/connector', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
    body: JSON.stringify({ connector: 'CLICKHOUSE' })
  }).then(r => r.json());
  logTest(14, 'Pipeline Connector Switching Check', switchRes.active_connector === 'CLICKHOUSE', `Switched to: ${switchRes.active_connector}`);

  // Switch back to KAFKA
  await fetch(base + '/api/v1/admin/pipeline/connector', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
    body: JSON.stringify({ connector: 'KAFKA' })
  });

  // 15. High-Volume Stream Batch Ingestion Benchmark (1,000 synthetic records)
  const benchRes = await fetch(base + '/api/v1/admin/benchmark/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
    body: JSON.stringify({ count: 1000 })
  }).then(r => r.json());
  const bm = benchRes.benchmark || {};
  logTest(15, '1,000-Event Stream Benchmark Check', bm.records_ingested === 1000, `Ingested: ${bm.records_ingested} records in ${bm.elapsed_ms}ms (${bm.throughput_eps} eps, Sink: ${bm.sink_mode})`);

  console.log(`\n=== API TEST SUITE SUMMARY: ${passed}/${total} TESTS PASSED ===`);
  if (passed === total) {
    console.log('ALL API ENDPOINTS AND BIG DATA ARCHITECTURE SYSTEMS ARE 100% OPERATIONAL.\n');
  } else {
    process.exit(1);
  }
}

testAll().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

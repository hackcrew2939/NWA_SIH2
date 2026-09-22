const dbModule = require('../database');
const db = dbModule.getDb();
const { analyzeReportML } = require('../ai_classifier');

const rows = db.prepare('SELECT * FROM citizen_reports').all();
let updatedCount = 0;

for (const r of rows) {
  const ml = analyzeReportML({
    description: r.description,
    category: r.category,
    location: r.location,
    state: r.state,
    lat: r.lat,
    lon: r.lon,
    photo: r.photo
  });

  if (ml.ai_fake_probability >= 60 || ml.predicted_category === 'flagged_hoax' || ml.ai_trust_breakdown?.authenticity_grade === 'F') {
    db.prepare("UPDATE citizen_reports SET verified_status = 'flagged_fake', source_trust = ?, ai_analysis = ? WHERE id = ?")
      .run(JSON.stringify({ trust_score: 12, tier: 'Flagged Fake / Untrusted' }), JSON.stringify(ml), r.id);
    updatedCount++;
    console.log('Flagged fake in DB:', r.id, r.description);
  }
}

console.log(`Updated ${updatedCount} fake reports in SQLite DB.`);

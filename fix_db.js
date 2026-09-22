const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('nwa_analytics.sqlite');

const GREEN_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const REAL_IMAGE = 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=500&q=80';

// 1. Replace all green pixels with a real weather image
db.exec(`UPDATE citizen_reports SET photo = '${REAL_IMAGE}' WHERE photo = '${GREEN_PIXEL}'`);
console.log('Replaced green pixel images with realistic placeholders.');

// 2. Find and delete duplicates based on exact same description
// We keep the most recent one (MAX(timestamp))
db.exec(`
  DELETE FROM citizen_reports 
  WHERE id NOT IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY description ORDER BY timestamp DESC) as rn
      FROM citizen_reports
    ) WHERE rn = 1
  )
`);
console.log('Deleted duplicate reports.');


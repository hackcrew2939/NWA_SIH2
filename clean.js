const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('nwa_analytics.sqlite');
db.exec("DELETE FROM citizen_reports WHERE reporter_name='Dr. Vikram Sarabhai'");
console.log('Deleted successfully');



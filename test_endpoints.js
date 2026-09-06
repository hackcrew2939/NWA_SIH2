const http = require('http');
const endpoints = [
  '/api/v1/weather/current',
  '/api/v1/weather/all',
  '/api/v1/reports',
  '/api/v1/social/stream'
];

let done = 0;

endpoints.forEach(ep => {
  http.get('http://localhost:3000' + ep, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      try {
        const j = JSON.parse(d);
        const isArr = Array.isArray(j);
        const info = isArr ? (j.length + ' items') : Object.keys(j).join(', ');
        console.log('[' + res.statusCode + '] ' + ep + ' -> ' + (isArr ? 'Array' : 'Object') + ' (' + info + ')');
      } catch(e) {
        console.log('[' + res.statusCode + '] ' + ep + ' -> parse error');
      }
      done++;
      if (done === endpoints.length) console.log('\nAll endpoints responding!');
    });
  }).on('error', e => {
    console.error('FAIL ' + ep + ': ' + e.message);
    done++;
  });
});

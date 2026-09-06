const fs = require('fs');
const path = require('path');

async function verifyChecklist() {
  console.log('=== RUNNING 17-POINT AUDIT & CONSTRAINTS VERIFICATION ===\n');
  const base = 'http://127.0.0.1:3000';
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
    }
  }

  // 1. Meta descriptions
  const indexHtml = fs.readFileSync('public/index.html', 'utf8');
  const privacyHtml = fs.readFileSync('public/privacy.html', 'utf8');
  const termsHtml = fs.readFileSync('public/terms.html', 'utf8');
  const notFoundHtml = fs.readFileSync('public/404.html', 'utf8');
  const emptyHtml = fs.readFileSync('public/empty.html', 'utf8');

  assert(indexHtml.includes('<meta name="description"'), 'index.html has meta description');
  assert(privacyHtml.includes('<meta name="description"'), 'privacy.html has meta description');
  assert(termsHtml.includes('<meta name="description"'), 'terms.html has meta description');
  assert(notFoundHtml.includes('<meta name="description"'), '404.html has meta description');
  assert(emptyHtml.includes('<meta name="description"'), 'empty.html has meta description');

  // 2. Favicon
  assert(indexHtml.includes('rel="icon"'), 'index.html links favicon.svg');
  assert(privacyHtml.includes('rel="icon"'), 'privacy.html links favicon.svg');
  assert(termsHtml.includes('rel="icon"'), 'terms.html links favicon.svg');
  assert(notFoundHtml.includes('rel="icon"'), '404.html links favicon.svg');
  assert(emptyHtml.includes('rel="icon"'), 'empty.html links favicon.svg');

  // 3. Page titles (no em dashes)
  assert(!indexHtml.includes('—') && indexHtml.includes('<title>National Weather Analytics'), 'index.html title has no em dash');
  assert(!privacyHtml.includes('—') && privacyHtml.includes('<title>Privacy Policy | National Weather Analytics'), 'privacy.html title has no em dash');
  assert(!termsHtml.includes('—') && termsHtml.includes('<title>Terms & Conditions | National Weather Analytics'), 'terms.html title has no em dash');
  assert(!notFoundHtml.includes('—') && notFoundHtml.includes('<title>404 Page Not Found | National Weather Analytics'), '404.html title has no em dash');
  assert(!emptyHtml.includes('—') && emptyHtml.includes('<title>No Data Records Available | National Weather Analytics'), 'empty.html title has no em dash');

  // 4. Clickable emails & phone numbers
  assert(indexHtml.includes('href="mailto:support@weatheranalytics.in"'), 'index.html has clickable email');
  assert(indexHtml.includes('href="tel:+911124611792"'), 'index.html has clickable phone number');
  assert(privacyHtml.includes('href="mailto:privacy@weatheranalytics.in"'), 'privacy.html has clickable email');
  assert(privacyHtml.includes('href="tel:+911124611792"'), 'privacy.html has clickable phone number');
  assert(termsHtml.includes('href="mailto:legal@weatheranalytics.in"'), 'terms.html has clickable email');
  assert(termsHtml.includes('href="tel:+911124611792"'), 'terms.html has clickable phone number');
  assert(notFoundHtml.includes('href="mailto:support@weatheranalytics.in"'), '404.html has clickable email');
  assert(notFoundHtml.includes('href="tel:+911124611792"'), '404.html has clickable phone number');
  assert(emptyHtml.includes('href="mailto:support@weatheranalytics.in"'), 'empty.html has clickable email');
  assert(emptyHtml.includes('href="tel:+911124611792"'), 'empty.html has clickable phone number');

  // 5. Mobile menu in index.html
  assert(indexHtml.includes('id="mobileMenuToggleBtn"'), 'index.html has mobileMenuToggleBtn');
  assert(indexHtml.includes('id="sidebarCloseBtn"'), 'index.html has sidebarCloseBtn');
  assert(indexHtml.includes('id="sidebarBackdrop"'), 'index.html has sidebarBackdrop');

  // 6. Server route checks
  const res404 = await fetch(base + '/does-not-exist-page-test');
  assert(res404.status === 404, 'Unknown route returns HTTP 404 status');
  const res404Text = await res404.text();
  assert(res404Text.includes('Meteorological Resource Not Found'), '404 page content served');

  const resPrivacy = await fetch(base + '/privacy');
  assert(resPrivacy.status === 200, '/privacy route returns HTTP 200');

  const resTerms = await fetch(base + '/terms');
  assert(resTerms.status === 200, '/terms route returns HTTP 200');

  const resEmpty = await fetch(base + '/empty');
  assert(resEmpty.status === 200, '/empty route returns HTTP 200');

  // 7. Negative constraints check
  const css = fs.readFileSync('public/css/styles.css', 'utf8');
  assert(!css.includes('linear-gradient(135deg, #fbbf24, #f59e0b)'), 'No glowing gradient in sidebar brand');
  assert(!css.includes('purple'), 'No purple keyword in CSS');
  assert(!css.includes('pulseGlow'), 'No pulseGlow animation in CSS');
  assert(!css.includes('pulseRing'), 'No pulseRing animation in CSS');

  const allFiles = ['public/index.html', 'public/privacy.html', 'public/terms.html', 'public/404.html', 'public/empty.html', 'public/js/app.js'];
  let foundMadeWithAi = false;
  let foundEmojis = false;
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

  for (const f of allFiles) {
    const content = fs.readFileSync(f, 'utf8');
    if (/made with ai/i.test(content)) foundMadeWithAi = true;
    if (emojiRegex.test(content)) foundEmojis = true;
  }
  assert(!foundMadeWithAi, 'Zero "Made with AI" references found in any page');
  assert(!foundEmojis, 'Zero emojis found in any page');

  // 8. Custom domain referenced
  assert(indexHtml.includes('weatheranalytics.in'), 'index.html references custom domain weatheranalytics.in');
  assert(privacyHtml.includes('weatheranalytics.in'), 'privacy.html references custom domain weatheranalytics.in');
  assert(termsHtml.includes('weatheranalytics.in'), 'terms.html references custom domain weatheranalytics.in');

  console.log(`\n=== RESULTS: ${passed}/${total} TESTS PASSED ===`);
  if (passed !== total) process.exit(1);
}

verifyChecklist().catch(err => {
  console.error('Audit script error:', err);
  process.exit(1);
});

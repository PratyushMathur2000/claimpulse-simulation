/* =====================================================================
   ClaimPulse · regenerate the share QR
   ---------------------------------------------------------------------
   The QR in the app's share sheet is a static PNG, so it has to be
   rebuilt whenever the site moves host. Run this once after the first
   Vercel deploy and commit the result.

     node make-qr.js https://claimpulse.vercel.app

   With no argument it prints the URL currently encoded, so you can check
   whether the one on screen still matches where the site actually lives.
   ===================================================================== */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'www', 'assets', 'qr.png');
const STAMP = path.join(__dirname, 'www', 'assets', 'qr.url.txt');

const url = process.argv[2];

if (!url) {
  const current = fs.existsSync(STAMP) ? fs.readFileSync(STAMP, 'utf8').trim() : '(unknown)';
  console.log(`
  The QR currently encodes:  ${current}

  To point it somewhere else:
    node make-qr.js https://your-app.vercel.app

  Use the bare origin — no ?room=. The share sheet warns on screen if you
  are running on a custom room the printed QR would not reach.
`);
  process.exit(0);
}

if (!/^https?:\/\//.test(url)) {
  console.error('  Give a full URL including https://');
  process.exit(1);
}
// A trailing slash or a query string here would send judges somewhere the
// app then has to correct for, so reject rather than silently trim.
if (url.includes('?') || url.endsWith('/')) {
  console.error('  Use the bare origin — no trailing slash, no query string.');
  process.exit(1);
}

execFileSync('npx', ['--yes', 'qrcode', '-o', OUT, '-t', 'png', '-w', '600', '--margin', '2', url],
  { stdio: 'inherit', shell: process.platform === 'win32' });

fs.writeFileSync(STAMP, url + '\n');
console.log(`\n  QR now points at ${url}\n  ${OUT}\n  Commit both files and redeploy.\n`);

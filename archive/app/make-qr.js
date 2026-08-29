/* =====================================================================
   ClaimPulse · regenerate the share QR
   ---------------------------------------------------------------------
   The QR in the app's share sheet is a static PNG, so it has to be
   rebuilt whenever the site moves host.

     node make-qr.js https://claimpulse-simulation.vercel.app/app

   With no argument it prints the URL the PNG actually encodes.

   THIS SCRIPT DECODES ITS OWN OUTPUT BEFORE IT WILL WRITE THE STAMP.

   That is not defensive dressing. The previous version shelled out to
   `npx qrcode` and then wrote the stamp file unconditionally. When that
   npx call silently did nothing, the stamp claimed one URL while the PNG
   on disk still encoded the previous host — the worst possible outcome
   for this file, because everything downstream trusts the stamp and
   nobody rescans the image. A QR that lies about where it points is
   worse than no QR, so the only thing allowed to write the stamp now is
   a successful round trip through a decoder.
   ===================================================================== */

const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const jsQR = require('jsqr');
const { PNG } = require('pngjs');

const OUT = path.join(__dirname, 'www', 'assets', 'qr.png');
const STAMP = path.join(__dirname, 'www', 'assets', 'qr.url.txt');

/* Read the PNG back off disk and pull the payload out of it. */
function decode(file) {
  const png = PNG.sync.read(fs.readFileSync(file));
  const res = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  return res && res.data;
}

const url = process.argv[2];

if (!url) {
  const stamped = fs.existsSync(STAMP) ? fs.readFileSync(STAMP, 'utf8').trim() : '(none)';
  let actual;
  try { actual = decode(OUT) || '(unreadable)'; }
  catch (e) { actual = '(no readable qr.png: ' + e.message + ')'; }
  const agree = stamped === actual;
  console.log(`
  The stamp file says:      ${stamped}
  The PNG actually encodes: ${actual}
  ${agree ? '✓ they agree' : '✗ MISMATCH — regenerate before you print or present this'}

  To point it somewhere else:
    node make-qr.js https://your-host/app

  Use the bare origin plus path — no trailing slash, no ?room=. The share
  sheet warns on screen if you are running on a custom room the printed QR
  would not reach.
`);
  process.exit(agree ? 0 : 1);
}

if (!/^https?:\/\//.test(url)) {
  console.error('  Give a full URL including https://');
  process.exit(1);
}
// A trailing slash or a query string here sends judges somewhere the app
// then has to correct for, so reject rather than silently trim.
if (url.includes('?') || url.endsWith('/')) {
  console.error('  Use the bare origin and path — no trailing slash, no query string.');
  process.exit(1);
}

(async () => {
  await QRCode.toFile(OUT, url, {
    type: 'png',
    width: 610,                 // on the Fibonacci ladder, like everything else
    margin: 2,
    color: { dark: '#002A48ff', light: '#ffffffff' }
  });

  const readBack = decode(OUT);
  if (readBack !== url) {
    console.error(`
  QR generation FAILED the read-back check.
    wanted:  ${url}
    decoded: ${readBack || '(nothing)'}
  The stamp file has NOT been updated, so it still reflects reality.
`);
    process.exit(1);
  }

  fs.writeFileSync(STAMP, url + '\n');
  console.log(`
  QR regenerated and verified by decoding it back.
    ${OUT}
    encodes ${url}
  Commit qr.png and qr.url.txt, then redeploy.
`);
})();

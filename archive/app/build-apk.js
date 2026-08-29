/* =====================================================================
   ClaimPulse · APK build
   ---------------------------------------------------------------------
   Wraps `cap sync` + `gradlew assembleDebug` and, more usefully, finds a
   JDK that Capacitor's Gradle will actually accept.

   Gradle 8.11 (what Capacitor 7 ships) runs on JDK 17 to 21. A machine
   with only JDK 25 — which is what Android Studio now bundles — fails
   with a confusing toolchain error rather than an obvious one, so the
   version is checked up front and the fix is printed.

   Run:  npm run android:apk
   ===================================================================== */

const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const MIN = 17, MAX = 21;

function javaMajor(home) {
  try {
    const bin = path.join(home, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
    if (!fs.existsSync(bin)) return null;
    const out = execFileSync(bin, ['-version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      + execFileSync(bin, ['-version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const m = out.match(/version "(\d+)/);
    return m ? +m[1] : null;
  } catch (e) {
    // java -version writes to stderr on older builds; read it from there.
    const s = (e.stderr || '').toString();
    const m = s.match(/version "(\d+)/);
    return m ? +m[1] : null;
  }
}

function findJdk() {
  const candidates = [];
  if (process.env.JAVA_HOME) candidates.push(process.env.JAVA_HOME);

  const roots = [
    'C:/Program Files/Eclipse Adoptium',
    'C:/Program Files/Java',
    'C:/Program Files/Microsoft',
    path.join(os.homedir(), '.jdks'),
    '/usr/lib/jvm',
    '/Library/Java/JavaVirtualMachines'
  ];
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    for (const d of fs.readdirSync(r)) {
      candidates.push(path.join(r, d));
      candidates.push(path.join(r, d, 'Contents', 'Home'));   // macOS layout
    }
  }
  candidates.push('C:/Program Files/Android/Android Studio/jbr');

  for (const c of candidates) {
    const v = javaMajor(c);
    if (v && v >= MIN && v <= MAX) return { home: c, version: v };
  }
  return null;
}

const jdk = findJdk();
if (!jdk) {
  console.error(`
  No usable JDK found.

  Capacitor's Gradle needs JDK ${MIN}–${MAX}. Android Studio now bundles JDK 25,
  which Gradle 8.11 will refuse.

  Fix it either way:

    1  Download a JDK 21 and point JAVA_HOME at it —
       https://adoptium.net/temurin/releases/?version=21

    2  Or open the project in Android Studio and set
       Settings → Build Tools → Gradle → Gradle JDK to a 21,
       then Build → Build Bundle(s)/APK(s) → Build APK(s).

  A prebuilt ClaimPulse-demo.apk is already in this folder, so this step is
  only needed if you have changed the app and want a fresh one.
`);
  process.exit(1);
}

console.log(`Using JDK ${jdk.version} at ${jdk.home}`);

const env = Object.assign({}, process.env, { JAVA_HOME: jdk.home });
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
  || path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk');
if (fs.existsSync(sdk)) {
  env.ANDROID_HOME = env.ANDROID_SDK_ROOT = sdk;
  fs.writeFileSync(path.join(__dirname, 'android', 'local.properties'),
    'sdk.dir=' + sdk.replace(/\\/g, '\\\\') + '\n');
}

const run = (cmd, cwd) =>
  execSync(cmd, { cwd: cwd || __dirname, env, stdio: 'inherit', shell: true });

run('npx cap sync android');
run(process.platform === 'win32' ? 'gradlew.bat assembleDebug' : './gradlew assembleDebug',
    path.join(__dirname, 'android'));

const built = path.join(__dirname, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const out = path.join(__dirname, 'www', 'ClaimPulse-demo.apk');
fs.copyFileSync(built, out);
console.log('\n  APK ready:  ' + out +
            '\n  ' + (fs.statSync(out).size / 1048576).toFixed(1) + ' MB · in.nmims.finsighters.claimpulse\n');

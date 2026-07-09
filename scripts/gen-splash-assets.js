const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Teal-branded medical cross-in-circle mark, matching Colors.primary (#0D9488)
// / Colors.accent (#14B8A6) from src/constants/theme.ts — replaces the
// unfinished placeholder template images (icon.png / splash-icon.png).
const TEAL = '#0D9488';
const TEAL_DARK = '#0F766E';
const TEAL_LIGHT = '#2DD4BF';

function markSvg(size) {
  const c = size / 2;
  const r = size * 0.42;
  const armW = size * 0.11;
  const armLen = size * 0.30;
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="35%" cy="30%" r="75%">
      <stop offset="0%" stop-color="${TEAL_LIGHT}"/>
      <stop offset="100%" stop-color="${TEAL}"/>
    </radialGradient>
    <linearGradient id="cross" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#E8FFFC"/>
    </linearGradient>
  </defs>
  <circle cx="${c}" cy="${c}" r="${r}" fill="url(#bg)" stroke="${TEAL_DARK}" stroke-width="${size*0.012}"/>
  <g>
    <rect x="${c - armW/2}" y="${c - armLen}" width="${armW}" height="${armLen*2}" rx="${armW/2}" fill="url(#cross)"/>
    <rect x="${c - armLen}" y="${c - armW/2}" width="${armLen*2}" height="${armW}" rx="${armW/2}" fill="url(#cross)"/>
  </g>
  <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#ffffff" stroke-width="${size*0.006}" opacity="0.5"/>
</svg>`;
}

// Plain monochrome version for Android's adaptive-icon monochrome layer
function monoSvg(size) {
  const c = size / 2;
  const armW = size * 0.16;
  const armLen = size * 0.30;
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${c - armW/2}" y="${c - armLen}" width="${armW}" height="${armLen*2}" rx="${armW/2}" fill="#000000"/>
  <rect x="${c - armLen}" y="${c - armW/2}" width="${armLen*2}" height="${armW}" rx="${armW/2}" fill="#000000"/>
</svg>`;
}

const outDir = path.join(__dirname, '..', '..', '..', '..', '..', '..', '..');
const assetsDir = 'c:/Users/client/.gemini/antigravity/scratch/kine-cabinet-app/assets';

async function main() {
  // Main app icon: 1024x1024, teal circle mark on transparent-safe white bg
  await sharp(Buffer.from(markSvg(1024)))
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));
  console.log('icon.png written');

  // Splash icon: same mark, will be shown on a teal background per app.json
  await sharp(Buffer.from(markSvg(512)))
    .png()
    .toFile(path.join(assetsDir, 'splash-icon.png'));
  console.log('splash-icon.png written');

  // Android adaptive icon foreground (needs padding — Android crops ~33%)
  const fgSize = 1024;
  const markInset = Math.round(fgSize * 0.62);
  const markBuf = await sharp(Buffer.from(markSvg(markInset))).png().toBuffer();
  await sharp({ create: { width: fgSize, height: fgSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: markBuf, gravity: 'center' }])
    .png()
    .toFile(path.join(assetsDir, 'android-icon-foreground.png'));
  console.log('android-icon-foreground.png written');

  // Android adaptive icon background: solid teal
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: TEAL } })
    .png()
    .toFile(path.join(assetsDir, 'android-icon-background.png'));
  console.log('android-icon-background.png written');

  // Android monochrome layer (themed icons on Android 13+)
  const monoBuf = await sharp(Buffer.from(monoSvg(markInset))).png().toBuffer();
  await sharp({ create: { width: fgSize, height: fgSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: monoBuf, gravity: 'center' }])
    .png()
    .toFile(path.join(assetsDir, 'android-icon-monochrome.png'));
  console.log('android-icon-monochrome.png written');

  // Favicon (web)
  await sharp(Buffer.from(markSvg(196))).png().toFile(path.join(assetsDir, 'favicon.png'));
  console.log('favicon.png written');
}

main().catch((e) => { console.error(e); process.exit(1); });

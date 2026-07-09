const sharp = require('sharp');
const path = require('path');

// Teal-branded assets matching Colors.primary (#0D9488) / Colors.accent
// (#14B8A6) from src/constants/theme.ts.
const TEAL = '#0D9488';
const TEAL_DARK = '#0F766E';
const TEAL_LIGHT = '#2DD4BF';

// ─── App icon (simple, legible at tiny sizes — no text/glow scene here) ──
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

// ─── Splash / intro scene: dark bg, glowing glass circle, light beams,
// "Made By Soltan" credit with a faint reflection — recreates the
// reference look in the app's teal palette. Full-bleed, resizeMode cover.
function splashSceneSvg(w, h) {
  const cx = w / 2;
  const cy = h * 0.40;
  const r = w * 0.27;
  const armW = r * 0.34;
  const armLen = r * 0.62;
  const textY = cy + r * 1.9;
  const textSize = w * 0.052;

  return `
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="0%" r="90%">
      <stop offset="0%" stop-color="#0f2f2b"/>
      <stop offset="45%" stop-color="#04120f"/>
      <stop offset="100%" stop-color="#010605"/>
    </radialGradient>
    <linearGradient id="beamTop" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${TEAL_LIGHT}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${TEAL_LIGHT}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="beamBottom" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="${TEAL}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${TEAL}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="orbGrad" cx="35%" cy="28%" r="75%">
      <stop offset="0%" stop-color="#9CFCF0"/>
      <stop offset="35%" stop-color="${TEAL_LIGHT}"/>
      <stop offset="100%" stop-color="${TEAL_DARK}"/>
    </radialGradient>
    <radialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${TEAL_LIGHT}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${TEAL_LIGHT}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="floorGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${TEAL_LIGHT}" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="${TEAL_LIGHT}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="crossGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#EAFFFC"/>
    </linearGradient>
    <filter id="blurSoft" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${w * 0.02}"/>
    </filter>
    <filter id="blurWide" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="${w * 0.05}"/>
    </filter>
  </defs>

  <rect width="${w}" height="${h}" fill="url(#bgGlow)"/>
  <rect x="${cx - w*0.18}" y="0" width="${w*0.36}" height="${h*0.5}" fill="url(#beamTop)"/>
  <rect x="${cx - w*0.22}" y="${h*0.55}" width="${w*0.44}" height="${h*0.45}" fill="url(#beamBottom)"/>

  <!-- ambient bokeh particles -->
  ${[[0.18,0.22,0.012],[0.82,0.30,0.010],[0.12,0.55,0.008],[0.88,0.62,0.009],[0.30,0.14,0.006],[0.70,0.75,0.007]]
    .map(([px,py,pr]) => `<circle cx="${w*px}" cy="${h*py}" r="${w*pr}" fill="${TEAL_LIGHT}" opacity="0.35"/>`).join('')}

  <!-- orb glow + glass circle -->
  <circle cx="${cx}" cy="${cy}" r="${r*1.5}" fill="url(#orbGlow)" filter="url(#blurWide)"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#orbGrad)" stroke="#B5FFF6" stroke-width="${w*0.003}" stroke-opacity="0.7"/>
  <ellipse cx="${cx - r*0.32}" cy="${cy - r*0.38}" rx="${r*0.34}" ry="${r*0.20}" fill="#ffffff" opacity="0.35" filter="url(#blurSoft)"/>

  <!-- cross -->
  <rect x="${cx - armW/2}" y="${cy - armLen}" width="${armW}" height="${armLen*2}" rx="${armW/2}" fill="url(#crossGrad)"/>
  <rect x="${cx - armLen}" y="${cy - armW/2}" width="${armLen*2}" height="${armW}" rx="${armW/2}" fill="url(#crossGrad)"/>

  <!-- floor reflection -->
  <ellipse cx="${cx}" cy="${cy + r*1.35}" rx="${r*1.3}" ry="${r*0.16}" fill="url(#floorGlow)"/>

  <!-- credit text + faint mirrored reflection below it -->
  <text x="${cx}" y="${textY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${textSize}" font-weight="600" fill="#EAF6F4">Made By <tspan fill="${TEAL_LIGHT}">Soltan</tspan></text>
  <g opacity="0.18" transform="translate(0, ${2*textY + textSize*0.32}) scale(1,-1)">
    <text x="${cx}" y="${textY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${textSize}" font-weight="600" fill="#EAF6F4">Made By <tspan fill="${TEAL_LIGHT}">Soltan</tspan></text>
  </g>
</svg>`;
}

const assetsDir = 'c:/Users/client/.gemini/antigravity/scratch/kine-cabinet-app/assets';

async function main() {
  await sharp(Buffer.from(markSvg(1024))).png().toFile(path.join(assetsDir, 'icon.png'));
  console.log('icon.png written');

  await sharp(Buffer.from(markSvg(512))).png().toFile(path.join(assetsDir, 'splash-icon.png'));
  console.log('splash-icon.png written');

  const fgSize = 1024;
  const markInset = Math.round(fgSize * 0.62);
  const markBuf = await sharp(Buffer.from(markSvg(markInset))).png().toBuffer();
  await sharp({ create: { width: fgSize, height: fgSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: markBuf, gravity: 'center' }])
    .png()
    .toFile(path.join(assetsDir, 'android-icon-foreground.png'));
  console.log('android-icon-foreground.png written');

  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: TEAL } })
    .png()
    .toFile(path.join(assetsDir, 'android-icon-background.png'));
  console.log('android-icon-background.png written');

  const monoBuf = await sharp(Buffer.from(monoSvg(markInset))).png().toBuffer();
  await sharp({ create: { width: fgSize, height: fgSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: monoBuf, gravity: 'center' }])
    .png()
    .toFile(path.join(assetsDir, 'android-icon-monochrome.png'));
  console.log('android-icon-monochrome.png written');

  await sharp(Buffer.from(markSvg(196))).png().toFile(path.join(assetsDir, 'favicon.png'));
  console.log('favicon.png written');

  // Full-bleed splash/intro scene (dark + glow + glass orb + credit text)
  const W = 1440, H = 2560;
  await sharp(Buffer.from(splashSceneSvg(W, H))).png().toFile(path.join(assetsDir, 'splash-background.png'));
  console.log('splash-background.png written');
}

main().catch((e) => { console.error(e); process.exit(1); });

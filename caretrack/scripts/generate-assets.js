/**
 * Generates all My Home Support app assets:
 *   icon.png          1024x1024  (App Store / Expo)
 *   adaptive-icon.png 1024x1024  (Android adaptive foreground)
 *   splash.png        1284x2778  (iPhone 14 Pro Max splash)
 *   favicon.png       196x196    (web)
 */

const sharp = require('sharp')
const path = require('path')
const ASSETS = path.join(__dirname, '../apps/mobile/assets')
const WEB_PUBLIC = path.join(__dirname, '../apps/web/public')
const fs = require('fs')

if (!fs.existsSync(WEB_PUBLIC)) fs.mkdirSync(WEB_PUBLIC, { recursive: true })

// ─── SVG building blocks ───────────────────────────────────────────────

// Main icon SVG: sage-green gradient bg + white house + heart
function iconSVG(size) {
  const s = size
  const cx = s / 2
  const cy = s / 2
  const r = s * 0.46  // background circle radius

  // House proportions scaled to icon size
  const houseW = s * 0.52
  const houseH = s * 0.44
  const houseX = cx - houseW / 2
  const houseY = cy - houseH / 2 + s * 0.03

  const roofPeak = houseY - houseH * 0.36
  const roofLeft = houseX - houseW * 0.08
  const roofRight = houseX + houseW + houseW * 0.08

  const doorW = houseW * 0.28
  const doorH = houseH * 0.44
  const doorX = cx - doorW / 2
  const doorY = houseY + houseH - doorH

  // Heart inside the house body (upper area)
  const heartCy = houseY + houseH * 0.28
  const heartSize = houseW * 0.22

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <radialGradient id="bg" cx="40%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#3d8b6b"/>
      <stop offset="100%" stop-color="#163927"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background rounded square -->
  <rect width="${s}" height="${s}" rx="${s * 0.22}" ry="${s * 0.22}" fill="url(#bg)"/>
  <rect width="${s}" height="${s}" rx="${s * 0.22}" ry="${s * 0.22}" fill="url(#glow)"/>

  <!-- Subtle grid texture -->
  <rect width="${s}" height="${s}" rx="${s * 0.22}" ry="${s * 0.22}"
    fill="none" stroke="#ffffff" stroke-width="${s * 0.004}" stroke-opacity="0.08"
    stroke-dasharray="${s * 0.06} ${s * 0.06}"/>

  <!-- House body -->
  <rect x="${houseX}" y="${houseY}" width="${houseW}" height="${houseH}"
    rx="${s * 0.025}" fill="white" fill-opacity="0.95"/>

  <!-- Roof -->
  <polygon
    points="${cx},${roofPeak} ${roofLeft},${houseY + s * 0.02} ${roofRight},${houseY + s * 0.02}"
    fill="white" fill-opacity="1"/>

  <!-- Chimney -->
  <rect x="${cx + houseW * 0.14}" y="${roofPeak + s * 0.01}"
    width="${houseW * 0.1}" height="${houseH * 0.22}"
    rx="${s * 0.01}" fill="white" fill-opacity="0.9"/>

  <!-- Door (rounded top) -->
  <rect x="${doorX}" y="${doorY}" width="${doorW}" height="${doorH}"
    rx="${doorW * 0.5}" fill="#2D6A4F"/>

  <!-- Door knob -->
  <circle cx="${doorX + doorW * 0.75}" cy="${doorY + doorH * 0.55}"
    r="${s * 0.012}" fill="white" fill-opacity="0.8"/>

  <!-- Heart on house front -->
  <path d="
    M ${cx} ${heartCy + heartSize * 0.35}
    C ${cx} ${heartCy + heartSize * 0.35}
      ${cx - heartSize * 1.1} ${heartCy - heartSize * 0.1}
      ${cx - heartSize * 1.1} ${heartCy - heartSize * 0.5}
    C ${cx - heartSize * 1.1} ${heartCy - heartSize * 1.1}
      ${cx - heartSize * 0.3} ${heartCy - heartSize * 1.2}
      ${cx} ${heartCy - heartSize * 0.55}
    C ${cx + heartSize * 0.3} ${heartCy - heartSize * 1.2}
      ${cx + heartSize * 1.1} ${heartCy - heartSize * 1.1}
      ${cx + heartSize * 1.1} ${heartCy - heartSize * 0.5}
    C ${cx + heartSize * 1.1} ${heartCy - heartSize * 0.1}
      ${cx} ${heartCy + heartSize * 0.35}
      ${cx} ${heartCy + heartSize * 0.35}
    Z"
    fill="#C4724A" fill-opacity="0.92"/>

  <!-- Window left -->
  <rect x="${houseX + houseW * 0.1}" y="${houseY + houseH * 0.15}"
    width="${houseW * 0.22}" height="${houseH * 0.24}"
    rx="${s * 0.015}" fill="#2D6A4F" fill-opacity="0.7"/>
  <!-- Window cross -->
  <line x1="${houseX + houseW * 0.21}" y1="${houseY + houseH * 0.15}"
    x2="${houseX + houseW * 0.21}" y2="${houseY + houseH * 0.39}"
    stroke="white" stroke-width="${s * 0.006}" stroke-opacity="0.6"/>
  <line x1="${houseX + houseW * 0.1}" y1="${houseY + houseH * 0.27}"
    x2="${houseX + houseW * 0.32}" y2="${houseY + houseH * 0.27}"
    stroke="white" stroke-width="${s * 0.006}" stroke-opacity="0.6"/>

  <!-- Window right -->
  <rect x="${houseX + houseW * 0.68}" y="${houseY + houseH * 0.15}"
    width="${houseW * 0.22}" height="${houseH * 0.24}"
    rx="${s * 0.015}" fill="#2D6A4F" fill-opacity="0.7"/>
  <line x1="${houseX + houseW * 0.79}" y1="${houseY + houseH * 0.15}"
    x2="${houseX + houseW * 0.79}" y2="${houseY + houseH * 0.39}"
    stroke="white" stroke-width="${s * 0.006}" stroke-opacity="0.6"/>
  <line x1="${houseX + houseW * 0.68}" y1="${houseY + houseH * 0.27}"
    x2="${houseX + houseW * 0.9}" y2="${houseY + houseH * 0.27}"
    stroke="white" stroke-width="${s * 0.006}" stroke-opacity="0.6"/>

  <!-- Ground line -->
  <line x1="${cx - houseW * 0.65}" y1="${houseY + houseH + s * 0.01}"
    x2="${cx + houseW * 0.65}" y2="${houseY + houseH + s * 0.01}"
    stroke="white" stroke-width="${s * 0.008}" stroke-opacity="0.3"
    stroke-linecap="round"/>

  <!-- Grass bumps -->
  <ellipse cx="${cx - houseW * 0.45}" cy="${houseY + houseH + s * 0.012}"
    rx="${houseW * 0.08}" ry="${s * 0.018}" fill="white" fill-opacity="0.2"/>
  <ellipse cx="${cx + houseW * 0.45}" cy="${houseY + houseH + s * 0.012}"
    rx="${houseW * 0.08}" ry="${s * 0.018}" fill="white" fill-opacity="0.2"/>
</svg>`
}

// Adaptive icon: same but on transparent background (safe zone = center 66%)
function adaptiveSVG(size) {
  const s = size
  const cx = s / 2
  const cy = s / 2

  const houseW = s * 0.38
  const houseH = s * 0.32
  const houseX = cx - houseW / 2
  const houseY = cy - houseH / 2 + s * 0.02

  const roofPeak = houseY - houseH * 0.36
  const roofLeft = houseX - houseW * 0.08
  const roofRight = houseX + houseW + houseW * 0.08

  const doorW = houseW * 0.28
  const doorH = houseH * 0.44
  const doorX = cx - doorW / 2
  const doorY = houseY + houseH - doorH

  const heartCy = houseY + houseH * 0.28
  const heartSize = houseW * 0.22

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <radialGradient id="bg" cx="40%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#3d8b6b"/>
      <stop offset="100%" stop-color="#163927"/>
    </radialGradient>
  </defs>
  <rect width="${s}" height="${s}" fill="url(#bg)"/>
  <rect x="${houseX}" y="${houseY}" width="${houseW}" height="${houseH}" rx="${s*0.02}" fill="white" fill-opacity="0.95"/>
  <polygon points="${cx},${roofPeak} ${roofLeft},${houseY+s*0.015} ${roofRight},${houseY+s*0.015}" fill="white"/>
  <rect x="${cx+houseW*0.14}" y="${roofPeak+s*0.008}" width="${houseW*0.1}" height="${houseH*0.22}" rx="${s*0.008}" fill="white" fill-opacity="0.9"/>
  <rect x="${doorX}" y="${doorY}" width="${doorW}" height="${doorH}" rx="${doorW*0.5}" fill="#2D6A4F"/>
  <circle cx="${doorX+doorW*0.75}" cy="${doorY+doorH*0.55}" r="${s*0.009}" fill="white" fill-opacity="0.8"/>
  <path d="M ${cx} ${heartCy+heartSize*0.35} C ${cx} ${heartCy+heartSize*0.35} ${cx-heartSize*1.1} ${heartCy-heartSize*0.1} ${cx-heartSize*1.1} ${heartCy-heartSize*0.5} C ${cx-heartSize*1.1} ${heartCy-heartSize*1.1} ${cx-heartSize*0.3} ${heartCy-heartSize*1.2} ${cx} ${heartCy-heartSize*0.55} C ${cx+heartSize*0.3} ${heartCy-heartSize*1.2} ${cx+heartSize*1.1} ${heartCy-heartSize*1.1} ${cx+heartSize*1.1} ${heartCy-heartSize*0.5} C ${cx+heartSize*1.1} ${heartCy-heartSize*0.1} ${cx} ${heartCy+heartSize*0.35} ${cx} ${heartCy+heartSize*0.35} Z" fill="#C4724A" fill-opacity="0.92"/>
  <rect x="${houseX+houseW*0.1}" y="${houseY+houseH*0.15}" width="${houseW*0.22}" height="${houseH*0.24}" rx="${s*0.012}" fill="#2D6A4F" fill-opacity="0.7"/>
  <line x1="${houseX+houseW*0.21}" y1="${houseY+houseH*0.15}" x2="${houseX+houseW*0.21}" y2="${houseY+houseH*0.39}" stroke="white" stroke-width="${s*0.005}" stroke-opacity="0.6"/>
  <line x1="${houseX+houseW*0.1}" y1="${houseY+houseH*0.27}" x2="${houseX+houseW*0.32}" y2="${houseY+houseH*0.27}" stroke="white" stroke-width="${s*0.005}" stroke-opacity="0.6"/>
  <rect x="${houseX+houseW*0.68}" y="${houseY+houseH*0.15}" width="${houseW*0.22}" height="${houseH*0.24}" rx="${s*0.012}" fill="#2D6A4F" fill-opacity="0.7"/>
  <line x1="${houseX+houseW*0.79}" y1="${houseY+houseH*0.15}" x2="${houseX+houseW*0.79}" y2="${houseY+houseH*0.39}" stroke="white" stroke-width="${s*0.005}" stroke-opacity="0.6"/>
  <line x1="${houseX+houseW*0.68}" y1="${houseY+houseH*0.27}" x2="${houseX+houseW*0.9}" y2="${houseY+houseH*0.27}" stroke="white" stroke-width="${s*0.005}" stroke-opacity="0.6"/>
</svg>`
}

// Splash screen: cream background, logo + brand name
function splashSVG(w, h) {
  const cx = w / 2
  const logoSize = Math.min(w, h) * 0.22
  const logoY = h * 0.34

  // Embed the house icon as a group centered at logoY
  const hs = logoSize
  const hcx = cx
  const hcy = logoY + hs / 2

  const houseW = hs * 0.52
  const houseH = hs * 0.44
  const houseX = hcx - houseW / 2
  const houseY = hcy - houseH / 2 + hs * 0.03

  const roofPeak = houseY - houseH * 0.36
  const roofLeft = houseX - houseW * 0.08
  const roofRight = houseX + houseW + houseW * 0.08

  const doorW = houseW * 0.28
  const doorH = houseH * 0.44
  const doorX = hcx - doorW / 2
  const doorY = houseY + houseH - doorH

  const heartCy = houseY + houseH * 0.28
  const heartSize = houseW * 0.22

  const textY = logoY + hs + h * 0.06
  const subY = textY + h * 0.045

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="iconBg" cx="40%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#3d8b6b"/>
      <stop offset="100%" stop-color="#163927"/>
    </radialGradient>
  </defs>

  <!-- Cream background -->
  <rect width="${w}" height="${h}" fill="#FAFAF8"/>

  <!-- Subtle decorative circles -->
  <circle cx="${w*0.1}" cy="${h*0.1}" r="${w*0.18}" fill="#2D6A4F" fill-opacity="0.04"/>
  <circle cx="${w*0.9}" cy="${h*0.88}" r="${w*0.22}" fill="#C4724A" fill-opacity="0.04"/>
  <circle cx="${w*0.85}" cy="${h*0.12}" r="${w*0.1}" fill="#2D6A4F" fill-opacity="0.03"/>

  <!-- Icon background (rounded square) -->
  <rect x="${cx-hs*0.5}" y="${logoY}" width="${hs}" height="${hs}"
    rx="${hs*0.22}" ry="${hs*0.22}" fill="url(#iconBg)"/>

  <!-- House body -->
  <rect x="${houseX}" y="${houseY}" width="${houseW}" height="${houseH}"
    rx="${hs*0.025}" fill="white" fill-opacity="0.95"/>
  <!-- Roof -->
  <polygon points="${hcx},${roofPeak} ${roofLeft},${houseY+hs*0.02} ${roofRight},${houseY+hs*0.02}" fill="white"/>
  <!-- Chimney -->
  <rect x="${hcx+houseW*0.14}" y="${roofPeak+hs*0.01}" width="${houseW*0.1}" height="${houseH*0.22}"
    rx="${hs*0.01}" fill="white" fill-opacity="0.9"/>
  <!-- Door -->
  <rect x="${doorX}" y="${doorY}" width="${doorW}" height="${doorH}"
    rx="${doorW*0.5}" fill="#2D6A4F"/>
  <!-- Heart -->
  <path d="M ${hcx} ${heartCy+heartSize*0.35} C ${hcx} ${heartCy+heartSize*0.35} ${hcx-heartSize*1.1} ${heartCy-heartSize*0.1} ${hcx-heartSize*1.1} ${heartCy-heartSize*0.5} C ${hcx-heartSize*1.1} ${heartCy-heartSize*1.1} ${hcx-heartSize*0.3} ${heartCy-heartSize*1.2} ${hcx} ${heartCy-heartSize*0.55} C ${hcx+heartSize*0.3} ${heartCy-heartSize*1.2} ${hcx+heartSize*1.1} ${heartCy-heartSize*1.1} ${hcx+heartSize*1.1} ${heartCy-heartSize*0.5} C ${hcx+heartSize*1.1} ${heartCy-heartSize*0.1} ${hcx} ${heartCy+heartSize*0.35} ${hcx} ${heartCy+heartSize*0.35} Z" fill="#C4724A" fill-opacity="0.92"/>
  <!-- Windows -->
  <rect x="${houseX+houseW*0.1}" y="${houseY+houseH*0.15}" width="${houseW*0.22}" height="${houseH*0.24}" rx="${hs*0.015}" fill="#2D6A4F" fill-opacity="0.7"/>
  <rect x="${houseX+houseW*0.68}" y="${houseY+houseH*0.15}" width="${houseW*0.22}" height="${houseH*0.24}" rx="${hs*0.015}" fill="#2D6A4F" fill-opacity="0.7"/>

  <!-- Brand name -->
  <text x="${cx}" y="${textY}"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="${w*0.072}" font-weight="700"
    fill="#1C1917" text-anchor="middle" letter-spacing="-1">My Home Support</text>

  <!-- Tagline -->
  <text x="${cx}" y="${subY}"
    font-family="'Helvetica Neue', Arial, sans-serif"
    font-size="${w*0.032}" font-weight="500"
    fill="#9C9690" text-anchor="middle" letter-spacing="2">PORTAIL AGENT</text>

  <!-- Bottom dot decoration -->
  <circle cx="${cx-w*0.05}" cy="${h*0.85}" r="${w*0.008}" fill="#2D6A4F" fill-opacity="0.3"/>
  <circle cx="${cx}" cy="${h*0.85}" r="${w*0.008}" fill="#C4724A" fill-opacity="0.4"/>
  <circle cx="${cx+w*0.05}" cy="${h*0.85}" r="${w*0.008}" fill="#2D6A4F" fill-opacity="0.3"/>
</svg>`
}

async function generate() {
  console.log('Generating My Home Support assets...\n')

  // 1. App icon (1024x1024)
  await sharp(Buffer.from(iconSVG(1024)))
    .resize(1024, 1024)
    .png()
    .toFile(`${ASSETS}/icon.png`)
  console.log('✓ icon.png (1024x1024)')

  // 2. Adaptive icon foreground (1024x1024)
  await sharp(Buffer.from(adaptiveSVG(1024)))
    .resize(1024, 1024)
    .png()
    .toFile(`${ASSETS}/adaptive-icon.png`)
  console.log('✓ adaptive-icon.png (1024x1024)')

  // 3. Splash screen (1284x2778 — iPhone 14 Pro Max)
  await sharp(Buffer.from(splashSVG(1284, 2778)))
    .resize(1284, 2778)
    .png()
    .toFile(`${ASSETS}/splash.png`)
  console.log('✓ splash.png (1284x2778)')

  // 4. Favicon (196x196)
  await sharp(Buffer.from(iconSVG(196)))
    .resize(196, 196)
    .png()
    .toFile(`${ASSETS}/favicon.png`)
  console.log('✓ favicon.png (196x196)')

  // 5. Web favicon
  await sharp(Buffer.from(iconSVG(512)))
    .resize(512, 512)
    .png()
    .toFile(`${WEB_PUBLIC}/favicon.png`)
  console.log('✓ web/public/favicon.png (512x512)')

  // 6. Web app logo for sidebar (256x256)
  await sharp(Buffer.from(iconSVG(256)))
    .resize(256, 256)
    .png()
    .toFile(`${WEB_PUBLIC}/logo.png`)
  console.log('✓ web/public/logo.png (256x256)')

  console.log('\n✅ All assets generated successfully!')
}

generate().catch(e => { console.error('Error:', e.message); process.exit(1) })

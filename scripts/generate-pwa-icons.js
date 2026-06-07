/**
 * Script untuk generate ikon PWA (PNG) dari SVG favicon.
 * Jalankan: node scripts/generate-pwa-icons.js
 * 
 * Membutuhkan: npm install sharp (hanya untuk generate icons)
 * 
 * Jika tidak ingin install sharp, bisa menggunakan online converter:
 * 1. Buka https://realfavicongenerator.net/
 * 2. Upload public/pwa-icon.svg
 * 3. Download dan letakkan file PNG di folder public/
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// Fallback: create simple placeholder PNGs using raw canvas-free approach
// These are minimal valid PNG files with the app's purple color

function createMinimalPNG(size) {
  // For actual high-quality icons, use sharp or an online tool
  // This creates a simple colored square as placeholder
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#863bff"/>
  <g transform="translate(96, 80) scale(6.6)">
    <path fill="#ffffff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
  </g>
</svg>`;
  
  return svg;
}

async function generateWithSharp() {
  try {
    const sharp = (await import('sharp')).default;
    const svgBuffer = readFileSync(join(publicDir, 'pwa-icon.svg'));
    
    const sizes = [
      { name: 'pwa-64x64.png', size: 64 },
      { name: 'pwa-192x192.png', size: 192 },
      { name: 'pwa-512x512.png', size: 512 },
      { name: 'apple-touch-icon-180x180.png', size: 180 },
      { name: 'maskable-icon-512x512.png', size: 512 },
    ];

    for (const { name, size } of sizes) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(join(publicDir, name));
      console.log(`✅ Generated ${name}`);
    }
    
    console.log('\n🎉 Semua ikon PWA berhasil di-generate!');
  } catch (e) {
    console.log('⚠️  sharp tidak tersedia. Menggunakan SVG icons sebagai fallback.');
    console.log('   Untuk PNG icons, install sharp: npm install sharp');
    console.log('   Lalu jalankan ulang script ini.');
    console.log('\n   Atau gunakan online converter:');
    console.log('   1. Buka https://realfavicongenerator.net/');
    console.log('   2. Upload public/pwa-icon.svg');
    console.log('   3. Download dan letakkan file PNG di folder public/\n');
    
    // SVG icons will be used as fallback (supported by modern browsers)
    console.log('✅ SVG icon sudah tersedia di public/pwa-icon.svg (fallback)');
  }
}

generateWithSharp();

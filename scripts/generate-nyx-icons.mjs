#!/usr/bin/env node
/**
 * Nyx Icon Generator
 * Generates all icon assets for the Nyx AI terminal multiplexer.
 * Pure Node.js — no external image libraries required.
 *
 * Design: A minimalist crescent moon on a dark background with violet (#7c3aed) accent.
 * The crescent evokes "night" (Nyx = Greek goddess of night).
 */

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.argv[2] || ".";

// ── Color palette ──────────────────────────────────────────────────────
const VIOLET = { r: 124, g: 58, b: 237 }; // #7c3aed
const DARK_BG = { r: 15, g: 10, b: 30 };  // very dark indigo/purple background
const DEV_TINT = { r: 59, g: 130, b: 246 }; // #3b82f6 — blue tint for dev icons
const DEV_BG = { r: 10, g: 15, b: 35 };   // dark blue bg for dev

// ── SVG Generation ─────────────────────────────────────────────────────

function generateSvgLogo(size = 128, isDev = false) {
  const accent = isDev ? "#3b82f6" : "#7c3aed";
  const bg = isDev ? "#0a0f23" : "#0f0a1e";
  const accentLight = isDev ? "#60a5fa" : "#a78bfa";
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.32;        // main moon radius
  const cutR = size * 0.26;     // cut circle radius
  const cutOffsetX = size * 0.18; // how far to shift the cut
  const cutOffsetY = -size * 0.05;

  // Star positions (small dots)
  const stars = [
    { x: size * 0.75, y: size * 0.22, r: size * 0.018 },
    { x: size * 0.82, y: size * 0.35, r: size * 0.012 },
    { x: size * 0.68, y: size * 0.15, r: size * 0.010 },
  ];

  const starsSvg = stars
    .map((s) => `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${accentLight}" opacity="0.8"/>`)
    .join("\n    ");

  const cornerR = size * 0.078; // rounded corners

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${cornerR}" fill="${bg}"/>
  <defs>
    <mask id="moon-mask">
      <rect width="${size}" height="${size}" fill="white"/>
      <circle cx="${cx + cutOffsetX}" cy="${cy + cutOffsetY}" r="${cutR}" fill="black"/>
    </mask>
  </defs>
  <circle cx="${cx - size * 0.05}" cy="${cy + size * 0.02}" r="${r}" fill="${accent}" mask="url(#moon-mask)"/>
  ${starsSvg}
</svg>`;
}

// ── Pixel rendering ────────────────────────────────────────────────────

/** Render the Nyx crescent moon icon to raw RGBA pixel buffer */
function renderIcon(size, isDev = false) {
  const accent = isDev ? DEV_TINT : VIOLET;
  const bg = isDev ? DEV_BG : DARK_BG;
  const accentLight = isDev
    ? { r: 96, g: 165, b: 250 }
    : { r: 167, g: 139, b: 250 };

  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const moonR = size * 0.32;
  const moonCx = cx - size * 0.05;
  const moonCy = cy + size * 0.02;
  const cutR = size * 0.26;
  const cutCx = cx + size * 0.18;
  const cutCy = cy - size * 0.05;
  const cornerR = size * 0.078;

  // Stars
  const stars = [
    { x: size * 0.75, y: size * 0.22, r: size * 0.018 },
    { x: size * 0.82, y: size * 0.35, r: size * 0.012 },
    { x: size * 0.68, y: size * 0.15, r: size * 0.010 },
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Rounded rectangle check
      if (!inRoundedRect(x, y, size, size, cornerR)) {
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
        continue;
      }

      // Default: background
      let r = bg.r, g = bg.g, b = bg.b, a = 255;

      // Check if in moon but not in cut
      const dMoon = dist(x, y, moonCx, moonCy);
      const dCut = dist(x, y, cutCx, cutCy);

      if (dMoon <= moonR && dCut > cutR) {
        // Inside crescent — apply anti-aliasing at edges
        const moonAA = clamp01(moonR - dMoon + 0.5);
        const cutAA = clamp01(dCut - cutR + 0.5);
        const alpha = Math.min(moonAA, cutAA);
        r = lerp(bg.r, accent.r, alpha);
        g = lerp(bg.g, accent.g, alpha);
        b = lerp(bg.b, accent.b, alpha);
      } else if (dMoon <= moonR + 1 && dCut > cutR - 1) {
        // Anti-alias edge of moon
        const moonAA = clamp01(moonR - dMoon + 0.5);
        const cutAA = clamp01(dCut - cutR + 0.5);
        const alpha = Math.min(moonAA, cutAA);
        if (alpha > 0) {
          r = lerp(bg.r, accent.r, alpha);
          g = lerp(bg.g, accent.g, alpha);
          b = lerp(bg.b, accent.b, alpha);
        }
      }

      // Stars
      for (const star of stars) {
        const dStar = dist(x, y, star.x, star.y);
        if (dStar <= star.r + 0.5) {
          const starAlpha = clamp01(star.r - dStar + 0.5) * 0.8;
          r = lerp(r, accentLight.r, starAlpha);
          g = lerp(g, accentLight.g, starAlpha);
          b = lerp(b, accentLight.b, starAlpha);
        }
      }

      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = a;
    }
  }
  return buf;
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function inRoundedRect(x, y, w, h, r) {
  // Check if point is inside a rounded rectangle
  if (x >= r && x < w - r) return y >= 0 && y < h;
  if (y >= r && y < h - r) return x >= 0 && x < w;
  // Check corners
  if (x < r && y < r) return dist(x, y, r, r) <= r;
  if (x >= w - r && y < r) return dist(x, y, w - r, r) <= r;
  if (x < r && y >= h - r) return dist(x, y, r, h - r) <= r;
  if (x >= w - r && y >= h - r) return dist(x, y, w - r, h - r) <= r;
  return false;
}

// ── PNG Encoding ───────────────────────────────────────────────────────

function encodePng(rgba, width, height) {
  // Build raw IDAT data: filter byte (0 = None) + row data
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // filter: None
    rgba.copy(rawData, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = deflateSync(rawData, { level: 9 });

  const chunks = [];

  // Signature
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  chunks.push(pngChunk("IHDR", ihdr));

  // IDAT
  chunks.push(pngChunk("IDAT", compressed));

  // IEND
  chunks.push(pngChunk("IEND", Buffer.alloc(0)));

  return Buffer.concat(chunks);
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, "ascii");
  const crcData = Buffer.concat([typeB, data]);
  const crc = crc32(crcData);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([len, typeB, data, crcB]);
}

// CRC-32 for PNG
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ── ICO Encoding ───────────────────────────────────────────────────────

function encodeIco(pngBuffers, sizes) {
  // ICO format: header + directory entries + PNG data
  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * numImages;
  let dataOffset = headerSize + dirSize;

  // Header
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);     // reserved
  header.writeUInt16LE(1, 2);     // type: ICO
  header.writeUInt16LE(numImages, 4);

  const dirEntries = [];
  const dataChunks = [];

  for (let i = 0; i < numImages; i++) {
    const png = pngBuffers[i];
    const s = sizes[i];
    const entry = Buffer.alloc(dirEntrySize);
    entry[0] = s >= 256 ? 0 : s;  // width (0 = 256)
    entry[1] = s >= 256 ? 0 : s;  // height
    entry[2] = 0;                   // color palette
    entry[3] = 0;                   // reserved
    entry.writeUInt16LE(1, 4);     // color planes
    entry.writeUInt16LE(32, 6);    // bits per pixel
    entry.writeUInt32LE(png.length, 8);    // data size
    entry.writeUInt32LE(dataOffset, 12);   // data offset
    dirEntries.push(entry);
    dataChunks.push(png);
    dataOffset += png.length;
  }

  return Buffer.concat([header, ...dirEntries, ...dataChunks]);
}

// ── Main generation ────────────────────────────────────────────────────

function generateAll() {
  const prodDir = join(ROOT, "assets", "prod");
  const devDir = join(ROOT, "assets", "dev");
  const webPublicDir = join(ROOT, "apps", "web", "public");
  const desktopResDir = join(ROOT, "apps", "desktop", "resources");

  // Ensure directories exist
  mkdirSync(prodDir, { recursive: true });
  mkdirSync(devDir, { recursive: true });
  mkdirSync(webPublicDir, { recursive: true });
  mkdirSync(desktopResDir, { recursive: true });

  console.log("Generating Nyx icons...\n");

  // ── Production icons ───────────────────────────────────────────────

  // 1. SVG logo
  const svgContent = generateSvgLogo(128, false);
  const svgPath = join(prodDir, "nyx-logo.svg");
  writeFileSync(svgPath, svgContent);
  console.log("  [prod] nyx-logo.svg");

  // 2. High-res universal PNG (1024x1024)
  const px1024 = renderIcon(1024, false);
  const png1024 = encodePng(px1024, 1024, 1024);
  writeFileSync(join(prodDir, "nyx-universal-1024.png"), png1024);
  console.log("  [prod] nyx-universal-1024.png");

  // 3. macOS icon (1024x1024)
  writeFileSync(join(prodDir, "nyx-macos-1024.png"), png1024);
  console.log("  [prod] nyx-macos-1024.png");

  // 4. Web favicons
  const px16 = renderIcon(16, false);
  const png16 = encodePng(px16, 16, 16);
  writeFileSync(join(prodDir, "nyx-web-favicon-16x16.png"), png16);
  console.log("  [prod] nyx-web-favicon-16x16.png");

  const px32 = renderIcon(32, false);
  const png32 = encodePng(px32, 32, 32);
  writeFileSync(join(prodDir, "nyx-web-favicon-32x32.png"), png32);
  console.log("  [prod] nyx-web-favicon-32x32.png");

  // 5. Apple touch icon (180x180)
  const px180 = renderIcon(180, false);
  const png180 = encodePng(px180, 180, 180);
  writeFileSync(join(prodDir, "nyx-web-apple-touch-180.png"), png180);
  console.log("  [prod] nyx-web-apple-touch-180.png");

  // 6. Web favicon.ico (16 + 32)
  const webFavIco = encodeIco([png16, png32], [16, 32]);
  writeFileSync(join(prodDir, "nyx-web-favicon.ico"), webFavIco);
  console.log("  [prod] nyx-web-favicon.ico");

  // 7. Windows .ico (16, 32, 48, 256)
  const px48 = renderIcon(48, false);
  const png48 = encodePng(px48, 48, 48);
  const px256 = renderIcon(256, false);
  const png256 = encodePng(px256, 256, 256);
  const winIco = encodeIco([png16, png32, png48, png256], [16, 32, 48, 256]);
  writeFileSync(join(prodDir, "nyx-windows.ico"), winIco);
  console.log("  [prod] nyx-windows.ico");

  // ── Development icons (blue tint) ─────────────────────────────────

  const devPx16 = renderIcon(16, true);
  const devPng16 = encodePng(devPx16, 16, 16);
  const devPx32 = renderIcon(32, true);
  const devPng32 = encodePng(devPx32, 32, 32);
  const devPx48 = renderIcon(48, true);
  const devPng48 = encodePng(devPx48, 48, 48);
  const devPx180 = renderIcon(180, true);
  const devPng180 = encodePng(devPx180, 180, 180);
  const devPx256 = renderIcon(256, true);
  const devPng256 = encodePng(devPx256, 256, 256);

  writeFileSync(join(devDir, "nyx-dev-web-favicon-16x16.png"), devPng16);
  console.log("  [dev]  nyx-dev-web-favicon-16x16.png");
  writeFileSync(join(devDir, "nyx-dev-web-favicon-32x32.png"), devPng32);
  console.log("  [dev]  nyx-dev-web-favicon-32x32.png");
  writeFileSync(join(devDir, "nyx-dev-web-apple-touch-180.png"), devPng180);
  console.log("  [dev]  nyx-dev-web-apple-touch-180.png");

  const devWebFavIco = encodeIco([devPng16, devPng32], [16, 32]);
  writeFileSync(join(devDir, "nyx-dev-web-favicon.ico"), devWebFavIco);
  console.log("  [dev]  nyx-dev-web-favicon.ico");

  const devWinIco = encodeIco([devPng16, devPng32, devPng48, devPng256], [16, 32, 48, 256]);
  writeFileSync(join(devDir, "nyx-dev-windows.ico"), devWinIco);
  console.log("  [dev]  nyx-dev-windows.ico");

  // ── Web public directory ───────────────────────────────────────────

  copyFileSync(join(prodDir, "nyx-web-favicon.ico"), join(webPublicDir, "favicon.ico"));
  console.log("  [web]  favicon.ico");
  copyFileSync(join(prodDir, "nyx-web-favicon-16x16.png"), join(webPublicDir, "favicon-16x16.png"));
  console.log("  [web]  favicon-16x16.png");
  copyFileSync(join(prodDir, "nyx-web-favicon-32x32.png"), join(webPublicDir, "favicon-32x32.png"));
  console.log("  [web]  favicon-32x32.png");
  copyFileSync(join(prodDir, "nyx-web-apple-touch-180.png"), join(webPublicDir, "apple-touch-icon.png"));
  console.log("  [web]  apple-touch-icon.png");

  // ── Desktop resources ──────────────────────────────────────────────

  copyFileSync(join(prodDir, "nyx-windows.ico"), join(desktopResDir, "icon.ico"));
  console.log("  [desk] icon.ico");

  // icon.png at 512x512
  const px512 = renderIcon(512, false);
  const png512 = encodePng(px512, 512, 512);
  writeFileSync(join(desktopResDir, "icon.png"), png512);
  console.log("  [desk] icon.png");

  console.log("\nDone! All Nyx icons generated.");
}

generateAll();

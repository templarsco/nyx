#!/usr/bin/env node
/**
 * Nyx Icon Generator
 * Generates all icon assets for the Nyx AI terminal multiplexer.
 * Pure Node.js — no external image libraries required.
 *
 * Design: Bold geometric "NYX" lettermark on dark background with rounded corners.
 * Violet (#7c3aed) letters on dark indigo (#0f0a1e).
 * At 16x16 uses "NX" monogram for legibility.
 */

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.argv[2] || ".";

// ── Color palette ──────────────────────────────────────────────────────
const VIOLET = { r: 124, g: 58, b: 237 }; // #7c3aed
const DARK_BG = { r: 15, g: 10, b: 30 }; // very dark indigo/purple background
const DEV_TINT = { r: 59, g: 130, b: 246 }; // #3b82f6 — blue tint for dev icons
const DEV_BG = { r: 10, g: 15, b: 35 }; // dark blue bg for dev

// ── SVG Generation ─────────────────────────────────────────────────────

function generateSvgLogo(size = 128, isDev = false) {
  const accent = isDev ? "#3b82f6" : "#7c3aed";
  const bg = isDev ? "#0a0f23" : "#0f0a1e";
  const cornerR = (size * 0.078).toFixed(2);

  // Bold geometric NX monogram
  // Two letters split the horizontal space evenly
  const m = size;
  const pad = m * 0.15;
  const letterW = (m - pad * 2) * 0.42;
  const gap = (m - pad * 2) * 0.16;
  const top = m * 0.28;
  const bot = m * 0.72;
  const sw = (m * 0.075).toFixed(2);
  const lx0 = pad;
  const lx1 = lx0 + letterW + gap;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${cornerR}" fill="${bg}"/>
  <g stroke="${accent}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <!-- N -->
    <polyline points="${lx0.toFixed(1)},${bot.toFixed(1)} ${lx0.toFixed(1)},${top.toFixed(1)} ${(lx0 + letterW).toFixed(1)},${bot.toFixed(1)} ${(lx0 + letterW).toFixed(1)},${top.toFixed(1)}"/>
    <!-- X -->
    <line x1="${lx1.toFixed(1)}" y1="${top.toFixed(1)}" x2="${(lx1 + letterW).toFixed(1)}" y2="${bot.toFixed(1)}"/>
    <line x1="${(lx1 + letterW).toFixed(1)}" y1="${top.toFixed(1)}" x2="${lx1.toFixed(1)}" y2="${bot.toFixed(1)}"/>
  </g>
</svg>`;
}

// ── Pixel-based letter definitions ─────────────────────────────────────

/**
 * Draw a thick line segment from (x0,y0) to (x1,y1) with given thickness
 * into the pixel buffer. Uses signed distance for anti-aliasing.
 */
function drawLine(buf, size, x0, y0, x1, y1, thickness, color, bgColor) {
  const halfT = thickness / 2;
  // Bounding box with margin
  const minX = Math.max(0, Math.floor(Math.min(x0, x1) - halfT - 1));
  const maxX = Math.min(size - 1, Math.ceil(Math.max(x0, x1) + halfT + 1));
  const minY = Math.max(0, Math.floor(Math.min(y0, y1) - halfT - 1));
  const maxY = Math.min(size - 1, Math.ceil(Math.max(y0, y1) + halfT + 1));

  const dx = x1 - x0;
  const dy = y1 - y0;
  const lenSq = dx * dx + dy * dy;
  const len = Math.sqrt(lenSq);

  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      // Distance from point to line segment
      let d;
      if (lenSq === 0) {
        d = dist(px, py, x0, y0);
      } else {
        const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / lenSq));
        const projX = x0 + t * dx;
        const projY = y0 + t * dy;
        d = dist(px, py, projX, projY);
      }

      if (d <= halfT + 0.5) {
        const alpha = clamp01(halfT - d + 0.5);
        if (alpha > 0) {
          const idx = (py * size + px) * 4;
          // Read current pixel
          const curR = buf[idx];
          const curG = buf[idx + 1];
          const curB = buf[idx + 2];
          // Blend
          buf[idx] = lerp(curR, color.r, alpha);
          buf[idx + 1] = lerp(curG, color.g, alpha);
          buf[idx + 2] = lerp(curB, color.b, alpha);
        }
      }
    }
  }
}

/**
 * Draw the letter N at position (lx, ty) with given width and height
 */
function drawN(buf, size, lx, ty, w, h, thickness, color, bgColor) {
  const bx = lx + w;
  const by = ty + h;
  // Left vertical
  drawLine(buf, size, lx, by, lx, ty, thickness, color, bgColor);
  // Diagonal
  drawLine(buf, size, lx, ty, bx, by, thickness, color, bgColor);
  // Right vertical
  drawLine(buf, size, bx, by, bx, ty, thickness, color, bgColor);
}

/**
 * Draw the letter Y at position (lx, ty) with given width and height
 */
function drawY(buf, size, lx, ty, w, h, thickness, color, bgColor) {
  const cx = lx + w / 2;
  const midY = ty + h * 0.45;
  const by = ty + h;
  // Left arm
  drawLine(buf, size, lx, ty, cx, midY, thickness, color, bgColor);
  // Right arm
  drawLine(buf, size, lx + w, ty, cx, midY, thickness, color, bgColor);
  // Stem
  drawLine(buf, size, cx, midY, cx, by, thickness, color, bgColor);
}

/**
 * Draw the letter X at position (lx, ty) with given width and height
 */
function drawX(buf, size, lx, ty, w, h, thickness, color, bgColor) {
  const bx = lx + w;
  const by = ty + h;
  // Forward diagonal
  drawLine(buf, size, lx, ty, bx, by, thickness, color, bgColor);
  // Back diagonal
  drawLine(buf, size, bx, ty, lx, by, thickness, color, bgColor);
}

// ── Pixel rendering ────────────────────────────────────────────────────

/** Render the Nyx lettermark icon to raw RGBA pixel buffer */
function renderIcon(size, isDev = false) {
  const accent = isDev ? DEV_TINT : VIOLET;
  const bg = isDev ? DEV_BG : DARK_BG;

  const buf = Buffer.alloc(size * size * 4);
  const cornerR = size * 0.078;

  // Fill background
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      if (!inRoundedRect(x, y, size, size, cornerR)) {
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
      } else {
        buf[idx] = bg.r;
        buf[idx + 1] = bg.g;
        buf[idx + 2] = bg.b;
        buf[idx + 3] = 255;
      }
    }
  }

  // Letter layout parameters
  const pad = size * 0.15;
  const top = size * 0.28;
  const bot = size * 0.72;
  const letterH = bot - top;

  // Always draw "NX" monogram — clean and legible at all sizes
  const totalW = size - pad * 2;
  const letterW = totalW * 0.42;
  const gap = totalW * 0.16;
  const thickness = size <= 16 ? Math.max(1.2, size * 0.1) : Math.max(1.5, size * 0.075);
  const lx0 = pad;
  const lx1 = lx0 + letterW + gap;
  drawN(buf, size, lx0, top, letterW, letterH, thickness, accent, bg);
  drawX(buf, size, lx1, top, letterW, letterH, thickness, accent, bg);

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
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
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
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: ICO
  header.writeUInt16LE(numImages, 4);

  const dirEntries = [];
  const dataChunks = [];

  for (let i = 0; i < numImages; i++) {
    const png = pngBuffers[i];
    const s = sizes[i];
    const entry = Buffer.alloc(dirEntrySize);
    entry[0] = s >= 256 ? 0 : s; // width (0 = 256)
    entry[1] = s >= 256 ? 0 : s; // height
    entry[2] = 0; // color palette
    entry[3] = 0; // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8); // data size
    entry.writeUInt32LE(dataOffset, 12); // data offset
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

  console.log("Generating Nyx lettermark icons...\n");

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
  copyFileSync(
    join(prodDir, "nyx-web-apple-touch-180.png"),
    join(webPublicDir, "apple-touch-icon.png"),
  );
  console.log("  [web]  apple-touch-icon.png");

  // ── Desktop resources ──────────────────────────────────────────────

  copyFileSync(join(prodDir, "nyx-windows.ico"), join(desktopResDir, "icon.ico"));
  console.log("  [desk] icon.ico");

  // icon.png at 512x512
  const px512 = renderIcon(512, false);
  const png512 = encodePng(px512, 512, 512);
  writeFileSync(join(desktopResDir, "icon.png"), png512);
  console.log("  [desk] icon.png");

  console.log("\nDone! All Nyx lettermark icons generated.");
}

generateAll();

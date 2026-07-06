/**
 * pdf-ops.js — all PDF processing, pure Node + pdf-lib (no native deps).
 * Used by the Electron main process (via IPC) and by test/smoke.js.
 * Everything runs 100% locally. No network calls.
 */
const fs = require('fs/promises');
const path = require('path');
const { PDFDocument, degrees, rgb, StandardFonts } = require('pdf-lib');

/** Parse a page-range string like "1-3, 5, 8-10" into a sorted array of 0-based indices. */
function parsePageRanges(rangeStr, pageCount) {
  const indices = new Set();
  const parts = String(rangeStr).split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) throw new Error('No page ranges given');
  for (const part of parts) {
    const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      let a = parseInt(m[1], 10);
      let b = parseInt(m[2], 10);
      if (a > b) [a, b] = [b, a];
      for (let i = a; i <= b; i++) indices.add(i - 1);
    } else if (/^\d+$/.test(part)) {
      indices.add(parseInt(part, 10) - 1);
    } else {
      throw new Error(`Invalid range segment: "${part}"`);
    }
  }
  const out = [...indices].sort((x, y) => x - y);
  for (const i of out) {
    if (i < 0 || i >= pageCount) {
      throw new Error(`Page ${i + 1} is out of bounds (document has ${pageCount} pages)`);
    }
  }
  return out;
}

async function loadPdf(filePath) {
  const bytes = await fs.readFile(filePath);
  return PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
}

async function savePdf(doc, outPath) {
  const bytes = await doc.save();
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, bytes);
  return outPath;
}

/** Basic info for the UI file list. */
async function getPdfInfo(filePath) {
  const doc = await loadPdf(filePath);
  return {
    path: filePath,
    name: path.basename(filePath),
    pageCount: doc.getPageCount(),
    title: doc.getTitle() || '',
    author: doc.getAuthor() || '',
  };
}

/** Merge multiple PDFs, in order, into one output file. */
async function mergePdfs(inputPaths, outPath) {
  if (!inputPaths || inputPaths.length < 2) throw new Error('Merge needs at least 2 PDFs');
  const merged = await PDFDocument.create();
  for (const p of inputPaths) {
    const src = await loadPdf(p);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((pg) => merged.addPage(pg));
  }
  await savePdf(merged, outPath);
  return { outPath, pageCount: merged.getPageCount() };
}

/**
 * Split: extract page ranges into new files.
 * ranges: array of { label, pages } where pages is a range string ("1-2" or "3,5").
 * Returns array of { outPath, pageCount }.
 */
async function splitPdf(inputPath, ranges, outDir) {
  const src = await loadPdf(inputPath);
  const total = src.getPageCount();
  const base = path.basename(inputPath, path.extname(inputPath));
  const results = [];
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    const indices = parsePageRanges(r.pages, total);
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, indices);
    pages.forEach((pg) => out.addPage(pg));
    const label = (r.label && r.label.trim()) || `part-${i + 1}`;
    const safe = label.replace(/[^\w\- ]+/g, '_');
    const outPath = path.join(outDir, `${base}-${safe}.pdf`);
    await savePdf(out, outPath);
    results.push({ outPath, pageCount: out.getPageCount() });
  }
  return results;
}

/**
 * Rotate pages. angle in {90, 180, 270} (clockwise, added to current rotation).
 * pagesStr: range string or "" / "all" for every page.
 */
async function rotatePdf(inputPath, angle, pagesStr, outPath) {
  const a = parseInt(angle, 10);
  if (![90, 180, 270].includes(a)) throw new Error('Angle must be 90, 180 or 270');
  const doc = await loadPdf(inputPath);
  const total = doc.getPageCount();
  const indices =
    !pagesStr || String(pagesStr).trim().toLowerCase() === 'all'
      ? [...Array(total).keys()]
      : parsePageRanges(pagesStr, total);
  for (const i of indices) {
    const page = doc.getPage(i);
    const current = page.getRotation().angle || 0;
    page.setRotation(degrees(((current + a) % 360 + 360) % 360));
  }
  await savePdf(doc, outPath);
  return { outPath, rotated: indices.length };
}

const POSITIONS = ['top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'];

function anchorXY(position, pageW, pageH, itemW, itemH, margin = 36) {
  const [v, h] = (POSITIONS.includes(position) ? position : 'center').split('-').length === 2
    ? position.split('-')
    : ['center', 'center'];
  let x;
  let y;
  if (h === 'left' || (v === 'center' && position === 'center-left')) x = margin;
  else if (h === 'right') x = pageW - itemW - margin;
  else x = (pageW - itemW) / 2;
  if (v === 'top') y = pageH - itemH - margin;
  else if (v === 'bottom') y = margin;
  else y = (pageH - itemH) / 2;
  return { x, y };
}

/**
 * Text watermark on every page.
 * opts: { text, position, opacity (0-1), fontSize, color: {r,g,b} 0-1, diagonal }
 */
async function watermarkText(inputPath, opts, outPath) {
  const { text, position = 'center', opacity = 0.3, fontSize = 48, color, diagonal = false } = opts;
  if (!text || !text.trim()) throw new Error('Watermark text is required');
  const doc = await loadPdf(inputPath);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const c = color || { r: 0.5, g: 0.5, b: 0.5 };
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const textW = font.widthOfTextAtSize(text, fontSize);
    const textH = font.heightAtSize(fontSize);
    const { x, y } = anchorXY(position, width, height, textW, textH);
    page.drawText(text, {
      x: diagonal ? width / 2 - textW / 2 : x,
      y: diagonal ? height / 2 - textH / 2 : y,
      size: fontSize,
      font,
      color: rgb(c.r, c.g, c.b),
      opacity: Math.min(1, Math.max(0, opacity)),
      rotate: diagonal ? degrees(45) : degrees(0),
    });
  }
  await savePdf(doc, outPath);
  return { outPath, pageCount: doc.getPageCount() };
}

async function embedImage(doc, imagePath) {
  const bytes = await fs.readFile(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  if (ext === '.png') return doc.embedPng(bytes);
  if (ext === '.jpg' || ext === '.jpeg') return doc.embedJpg(bytes);
  // Sniff by magic bytes as a fallback
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return doc.embedPng(bytes);
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return doc.embedJpg(bytes);
  throw new Error(`Unsupported image type: ${ext || 'unknown'} (use PNG or JPG)`);
}

/**
 * Image watermark on every page.
 * opts: { imagePath, position, opacity (0-1), scale (fraction of page width, default 0.25) }
 */
async function watermarkImage(inputPath, opts, outPath) {
  const { imagePath, position = 'bottom-right', opacity = 0.5, scale = 0.25 } = opts;
  if (!imagePath) throw new Error('Watermark image is required');
  const doc = await loadPdf(inputPath);
  const img = await embedImage(doc, imagePath);
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const targetW = width * Math.min(1, Math.max(0.02, scale));
    const ratio = targetW / img.width;
    const w = targetW;
    const h = img.height * ratio;
    const { x, y } = anchorXY(position, width, height, w, h);
    page.drawImage(img, { x, y, width: w, height: h, opacity: Math.min(1, Math.max(0, opacity)) });
  }
  await savePdf(doc, outPath);
  return { outPath, pageCount: doc.getPageCount() };
}

/**
 * Convert JPG/PNG images to a single PDF, one image per page,
 * fitted to A4 portrait (or the image's own size if fitToA4 is false).
 */
async function imagesToPdf(imagePaths, outPath, { fitToA4 = true } = {}) {
  if (!imagePaths || imagePaths.length === 0) throw new Error('No images given');
  const doc = await PDFDocument.create();
  const A4 = { w: 595.28, h: 841.89 };
  for (const p of imagePaths) {
    const img = await embedImage(doc, p);
    if (fitToA4) {
      const page = doc.addPage([A4.w, A4.h]);
      const margin = 24;
      const maxW = A4.w - margin * 2;
      const maxH = A4.h - margin * 2;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      page.drawImage(img, { x: (A4.w - w) / 2, y: (A4.h - h) / 2, width: w, height: h });
    } else {
      const page = doc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }
  }
  await savePdf(doc, outPath);
  return { outPath, pageCount: doc.getPageCount() };
}

/** Read metadata for the editor. */
async function readMetadata(inputPath) {
  const doc = await loadPdf(inputPath);
  return {
    title: doc.getTitle() || '',
    author: doc.getAuthor() || '',
    subject: doc.getSubject() || '',
    keywords: '',
    pageCount: doc.getPageCount(),
  };
}

/** Set metadata (title/author/subject) and save a copy. */
async function setMetadata(inputPath, meta, outPath) {
  const doc = await loadPdf(inputPath);
  if (meta.title !== undefined) doc.setTitle(meta.title);
  if (meta.author !== undefined) doc.setAuthor(meta.author);
  if (meta.subject !== undefined) doc.setSubject(meta.subject);
  doc.setModificationDate(new Date());
  await savePdf(doc, outPath);
  return { outPath, title: meta.title, author: meta.author };
}

module.exports = {
  parsePageRanges,
  getPdfInfo,
  mergePdfs,
  splitPdf,
  rotatePdf,
  watermarkText,
  watermarkImage,
  imagesToPdf,
  readMetadata,
  setMetadata,
};

/**
 * Smoke test — exercises the real pdf-ops pipeline with generated fixtures.
 * Run: npm test
 *
 * 1. Generate two 2-page PDFs with pdf-lib
 * 2. Merge them → assert 4 pages
 * 3. Split the merged PDF → assert outputs + page counts
 * 4. Text-watermark one → assert it re-parses with correct page count
 * 5. Rotate → assert page rotation applied
 * 6. Generate a PNG → images-to-PDF → assert 1 page
 * 7. Set metadata → assert title/author round-trip
 */
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const ops = require('../src/pdf-ops');

let passed = 0;
function assert(cond, label) {
  if (!cond) {
    console.error(`  FAIL  ${label}`);
    process.exitCode = 1;
    throw new Error(`Assertion failed: ${label}`);
  }
  passed++;
  console.log(`  ok    ${label}`);
}

async function makeFixturePdf(outPath, label, pages = 2) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawText(`${label} — page ${i}`, { x: 60, y: 760, size: 24, font, color: rgb(0.1, 0.1, 0.1) });
  }
  await fs.writeFile(outPath, await doc.save());
  return outPath;
}

// Minimal valid 1x1 red PNG (pre-encoded, no deps needed)
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

async function main() {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-toolkit-smoke-'));
  console.log(`Smoke test workspace: ${tmp}\n`);

  // 1. Fixtures
  console.log('[1] Generate fixtures');
  const a = await makeFixturePdf(path.join(tmp, 'a.pdf'), 'Document A', 2);
  const b = await makeFixturePdf(path.join(tmp, 'b.pdf'), 'Document B', 2);
  assert((await ops.getPdfInfo(a)).pageCount === 2, 'fixture A has 2 pages');
  assert((await ops.getPdfInfo(b)).pageCount === 2, 'fixture B has 2 pages');

  // 2. Merge
  console.log('[2] Merge');
  const mergedPath = path.join(tmp, 'merged.pdf');
  const merged = await ops.mergePdfs([a, b], mergedPath);
  assert(merged.pageCount === 4, 'merge result reports 4 pages');
  const mergedInfo = await ops.getPdfInfo(mergedPath);
  assert(mergedInfo.pageCount === 4, 'merged file re-parses with 4 pages');

  // 3. Split
  console.log('[3] Split');
  const splitDir = path.join(tmp, 'split');
  const parts = await ops.splitPdf(mergedPath, [
    { label: 'first-half', pages: '1-2' },
    { label: 'last-page', pages: '4' },
  ], splitDir);
  assert(parts.length === 2, 'split produced 2 output files');
  assert(parts[0].pageCount === 2, 'part 1 has 2 pages');
  assert(parts[1].pageCount === 1, 'part 2 has 1 page');
  for (const p of parts) {
    const st = await fs.stat(p.outPath);
    assert(st.size > 0, `${path.basename(p.outPath)} exists and is non-empty`);
    const reparsed = await PDFDocument.load(await fs.readFile(p.outPath));
    assert(reparsed.getPageCount() === p.pageCount, `${path.basename(p.outPath)} re-parses cleanly`);
  }

  // 4. Text watermark
  console.log('[4] Text watermark');
  const wmPath = path.join(tmp, 'watermarked.pdf');
  await ops.watermarkText(a, { text: 'CONFIDENTIAL', position: 'center', opacity: 0.3, fontSize: 48, diagonal: true }, wmPath);
  const wmDoc = await PDFDocument.load(await fs.readFile(wmPath));
  assert(wmDoc.getPageCount() === 2, 'watermarked PDF re-parses with 2 pages');
  const wmSize = (await fs.stat(wmPath)).size;
  const origSize = (await fs.stat(a)).size;
  assert(wmSize > origSize, 'watermarked file grew (content added)');

  // 5. Rotate
  console.log('[5] Rotate');
  const rotPath = path.join(tmp, 'rotated.pdf');
  await ops.rotatePdf(a, 90, 'all', rotPath);
  const rotDoc = await PDFDocument.load(await fs.readFile(rotPath));
  assert(rotDoc.getPage(0).getRotation().angle === 90, 'page 1 rotated to 90 degrees');
  assert(rotDoc.getPage(1).getRotation().angle === 90, 'page 2 rotated to 90 degrees');

  // 6. Images → PDF
  console.log('[6] Images to PDF');
  const pngPath = path.join(tmp, 'pixel.png');
  await fs.writeFile(pngPath, TINY_PNG);
  const imgPdfPath = path.join(tmp, 'from-images.pdf');
  const imgRes = await ops.imagesToPdf([pngPath], imgPdfPath, { fitToA4: true });
  assert(imgRes.pageCount === 1, 'images-to-PDF produced 1 page');
  const imgDoc = await PDFDocument.load(await fs.readFile(imgPdfPath));
  assert(imgDoc.getPageCount() === 1, 'image PDF re-parses');

  // 7. Metadata
  console.log('[7] Metadata');
  const metaPath = path.join(tmp, 'meta.pdf');
  await ops.setMetadata(a, { title: 'Smoke Test Title', author: 'Ben' }, metaPath);
  const meta = await ops.readMetadata(metaPath);
  assert(meta.title === 'Smoke Test Title', 'title round-trips');
  assert(meta.author === 'Ben', 'author round-trips');

  console.log(`\nAll ${passed} assertions passed.`);
  await fs.rm(tmp, { recursive: true, force: true });
}

main().catch((err) => {
  console.error('\nSMOKE TEST FAILED:', err.message);
  process.exit(1);
});

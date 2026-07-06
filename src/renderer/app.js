/* PDF Toolkit renderer — plain JS, talks to main via window.api */

const $ = (sel) => document.querySelector(sel);

const el = {
  nav: $('#toolNav'),
  title: $('#toolTitle'),
  subtitle: $('#toolSubtitle'),
  dropzone: $('#dropzone'),
  dropTitle: $('#dropTitle'),
  browseBtn: $('#browseBtn'),
  filelistWrap: $('#filelistWrap'),
  filelist: $('#filelist'),
  fileCount: $('#fileCount'),
  clearFiles: $('#clearFiles'),
  options: $('#options'),
  outdirBtn: $('#outdirBtn'),
  outdirPath: $('#outdirPath'),
  runBtn: $('#runBtn'),
  status: $('#status'),
  spinner: $('#spinner'),
  statusText: $('#statusText'),
  results: $('#results'),
};

const TOOLS = {
  merge: {
    title: 'Merge PDFs',
    subtitle: 'Drop PDFs below, reorder them, then merge into a single file.',
    drop: 'Drag & drop PDF files here',
    accept: ['pdf'],
    multi: true,
    reorder: true,
    action: 'Merge PDFs',
    minFiles: 2,
  },
  split: {
    title: 'Split PDF',
    subtitle: 'Extract page ranges from one PDF into separate new files.',
    drop: 'Drag & drop one PDF here',
    accept: ['pdf'],
    multi: false,
    action: 'Split PDF',
    minFiles: 1,
  },
  rotate: {
    title: 'Rotate Pages',
    subtitle: 'Rotate all pages or a specific range, in any dropped PDF.',
    drop: 'Drag & drop PDF files here',
    accept: ['pdf'],
    multi: true,
    action: 'Rotate',
    minFiles: 1,
  },
  watermark: {
    title: 'Watermark',
    subtitle: 'Stamp a text or image watermark on every page, with position and opacity control.',
    drop: 'Drag & drop PDF files here',
    accept: ['pdf'],
    multi: true,
    action: 'Apply Watermark',
    minFiles: 1,
  },
  images: {
    title: 'Images → PDF',
    subtitle: 'Convert JPG / PNG images into a single PDF — one image per page, in list order.',
    drop: 'Drag & drop JPG or PNG images here',
    accept: ['jpg', 'jpeg', 'png'],
    multi: true,
    reorder: true,
    action: 'Create PDF',
    minFiles: 1,
  },
  metadata: {
    title: 'Metadata Editor',
    subtitle: 'Edit the title, author and subject of a PDF, saved as a new copy.',
    drop: 'Drag & drop one PDF here',
    accept: ['pdf'],
    multi: false,
    action: 'Save Metadata',
    minFiles: 1,
  },
};

let currentTool = 'merge';
let files = []; // { path, name, pageCount|null }
let outDir = '';
let busy = false;
let wmImagePath = '';

// ---------- init ----------
(async () => {
  const res = await window.api.defaultOutputDir();
  if (res.ok) {
    outDir = res.result;
    el.outdirPath.textContent = outDir;
  }
  renderOptions();
  updateRunState();
})();

// ---------- tool switching ----------
el.nav.addEventListener('click', (e) => {
  const btn = e.target.closest('.tool');
  if (!btn || busy) return;
  currentTool = btn.dataset.tool;
  document.querySelectorAll('.tool').forEach((t) => t.classList.toggle('active', t === btn));
  const cfg = TOOLS[currentTool];
  el.title.textContent = cfg.title;
  el.subtitle.textContent = cfg.subtitle;
  el.dropTitle.textContent = cfg.drop;
  el.runBtn.textContent = cfg.action;
  files = [];
  wmImagePath = '';
  hideStatus();
  renderFiles();
  renderOptions();
  updateRunState();
});

// ---------- file picking / drag-drop ----------
el.browseBtn.addEventListener('click', (e) => { e.stopPropagation(); browse(); });
el.dropzone.addEventListener('click', browse);

async function browse() {
  if (busy) return;
  const cfg = TOOLS[currentTool];
  const res = cfg.accept.includes('pdf')
    ? await window.api.pickPdfs(cfg.multi)
    : await window.api.pickImages();
  if (res.ok && res.result.length) addFiles(res.result);
}

['dragover', 'dragenter'].forEach((ev) =>
  el.dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    el.dropzone.classList.add('dragover');
  })
);
['dragleave', 'drop'].forEach((ev) =>
  el.dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    el.dropzone.classList.remove('dragover');
  })
);

el.dropzone.addEventListener('drop', (e) => {
  if (busy) return;
  const cfg = TOOLS[currentTool];
  const paths = [];
  for (const f of e.dataTransfer.files) {
    const p = window.api.getPathForFile(f);
    const ext = p.split('.').pop().toLowerCase();
    if (cfg.accept.includes(ext)) paths.push(p);
  }
  if (paths.length) addFiles(paths);
});

async function addFiles(paths) {
  const cfg = TOOLS[currentTool];
  if (!cfg.multi) files = [];
  for (const p of paths) {
    if (files.some((f) => f.path === p)) continue;
    const entry = { path: p, name: p.split(/[\\/]/).pop(), pageCount: null };
    files.push(entry);
    if (!cfg.multi) break;
  }
  renderFiles();
  updateRunState();

  // Lazily fetch page counts for PDFs
  for (const f of files) {
    if (f.pageCount === null && f.path.toLowerCase().endsWith('.pdf')) {
      const res = await window.api.pdfInfo(f.path);
      f.pageCount = res.ok ? res.result.pageCount : -1;
    }
  }
  renderFiles();

  // Metadata tool: load current metadata into fields
  if (currentTool === 'metadata' && files[0]) {
    const res = await window.api.readMetadata(files[0].path);
    if (res.ok) {
      const t = $('#metaTitle'); const a = $('#metaAuthor'); const s = $('#metaSubject');
      if (t) t.value = res.result.title;
      if (a) a.value = res.result.author;
      if (s) s.value = res.result.subject;
    }
  }
}

el.clearFiles.addEventListener('click', () => {
  if (busy) return;
  files = [];
  renderFiles();
  updateRunState();
});

// ---------- file list rendering (+ drag reorder) ----------
let dragIndex = -1;

function renderFiles() {
  const cfg = TOOLS[currentTool];
  el.filelistWrap.hidden = files.length === 0;
  el.fileCount.textContent = `${files.length} file${files.length === 1 ? '' : 's'}`;
  el.filelist.innerHTML = '';

  files.forEach((f, i) => {
    const li = document.createElement('li');
    li.className = 'file-item';
    li.draggable = !!cfg.reorder;
    li.dataset.index = i;

    const isPdf = f.path.toLowerCase().endsWith('.pdf');
    const pages =
      f.pageCount === null ? '' :
      f.pageCount === -1 ? 'unreadable' :
      `${f.pageCount} page${f.pageCount === 1 ? '' : 's'}`;

    li.innerHTML = `
      ${cfg.reorder ? '<span class="file-grip" title="Drag to reorder">&#8942;&#8942;</span>' : ''}
      <span class="file-badge">${isPdf ? 'PDF' : 'IMG'}</span>
      <span class="file-name" title="${f.path}">${f.name}</span>
      <span class="file-pages">${pages}</span>
      <span class="file-actions">
        ${cfg.reorder ? `<button class="icon-btn" data-act="up" data-i="${i}" title="Move up">&#9650;</button>
        <button class="icon-btn" data-act="down" data-i="${i}" title="Move down">&#9660;</button>` : ''}
        <button class="icon-btn danger" data-act="remove" data-i="${i}" title="Remove">&#10005;</button>
      </span>`;

    if (cfg.reorder) {
      li.addEventListener('dragstart', () => { dragIndex = i; li.classList.add('dragging'); });
      li.addEventListener('dragend', () => { dragIndex = -1; li.classList.remove('dragging'); });
      li.addEventListener('dragover', (e) => e.preventDefault());
      li.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dragIndex < 0 || dragIndex === i) return;
        const [moved] = files.splice(dragIndex, 1);
        files.splice(i, 0, moved);
        renderFiles();
      });
    }
    el.filelist.appendChild(li);
  });
}

el.filelist.addEventListener('click', (e) => {
  const btn = e.target.closest('.icon-btn');
  if (!btn || busy) return;
  const i = parseInt(btn.dataset.i, 10);
  const act = btn.dataset.act;
  if (act === 'remove') files.splice(i, 1);
  if (act === 'up' && i > 0) [files[i - 1], files[i]] = [files[i], files[i - 1]];
  if (act === 'down' && i < files.length - 1) [files[i + 1], files[i]] = [files[i], files[i + 1]];
  renderFiles();
  updateRunState();
});

// ---------- options panels ----------
const POSITIONS = [
  ['top-left', 'Top left'], ['top-center', 'Top center'], ['top-right', 'Top right'],
  ['center-left', 'Center left'], ['center', 'Center'], ['center-right', 'Center right'],
  ['bottom-left', 'Bottom left'], ['bottom-center', 'Bottom center'], ['bottom-right', 'Bottom right'],
];

function positionSelect(id, def) {
  return `<div class="field"><label for="${id}">Position</label>
    <select id="${id}">${POSITIONS.map(([v, l]) => `<option value="${v}"${v === def ? ' selected' : ''}>${l}</option>`).join('')}</select>
  </div>`;
}

function renderOptions() {
  const t = currentTool;
  if (t === 'merge') {
    el.options.innerHTML = `<div class="hint">Files are merged top-to-bottom. Drag rows or use the arrows to reorder.</div>`;
  } else if (t === 'split') {
    el.options.innerHTML = `
      <div class="opt-row">
        <div class="field grow">
          <label for="splitRanges">Page ranges (one output file per range, comma-separates pages)</label>
          <input type="text" id="splitRanges" placeholder="e.g.  1-2 | 3 | 4-6   (use | between output files)" />
        </div>
      </div>
      <div class="hint">Example: <b>1-2 | 3-4</b> creates two PDFs — pages 1&ndash;2 and pages 3&ndash;4. A single range like <b>2-5</b> extracts just those pages.</div>`;
  } else if (t === 'rotate') {
    el.options.innerHTML = `
      <div class="opt-row">
        <div class="field">
          <label>Angle (clockwise)</label>
          <div class="seg" id="rotSeg">
            <button data-v="90" class="active">90&deg;</button>
            <button data-v="180">180&deg;</button>
            <button data-v="270">270&deg;</button>
          </div>
        </div>
        <div class="field grow">
          <label for="rotPages">Pages</label>
          <input type="text" id="rotPages" value="all" placeholder="all  or  1-3,5" />
        </div>
      </div>`;
    segWire('#rotSeg');
  } else if (t === 'watermark') {
    el.options.innerHTML = `
      <div class="opt-row">
        <div class="field">
          <label>Watermark type</label>
          <div class="seg" id="wmSeg">
            <button data-v="text" class="active">Text</button>
            <button data-v="image">Image</button>
          </div>
        </div>
      </div>
      <div id="wmTextOpts">
        <div class="opt-row">
          <div class="field grow">
            <label for="wmText">Text</label>
            <input type="text" id="wmText" placeholder="CONFIDENTIAL" value="CONFIDENTIAL" />
          </div>
          ${positionSelect('wmTextPos', 'center')}
          <div class="field">
            <label for="wmSize">Font size</label>
            <select id="wmSize">
              <option>24</option><option>36</option><option selected>48</option><option>64</option><option>96</option>
            </select>
          </div>
          <div class="field">
            <label for="wmTextOpacity">Opacity <span class="range-val" id="wmTextOpacityVal">30%</span></label>
            <input type="range" id="wmTextOpacity" min="5" max="100" value="30" />
          </div>
          <div class="field">
            <label for="wmDiagonal">Diagonal</label>
            <select id="wmDiagonal"><option value="no">No</option><option value="yes">Yes (45&deg;)</option></select>
          </div>
        </div>
      </div>
      <div id="wmImageOpts" style="display:none">
        <div class="opt-row">
          <div class="field grow">
            <label>Watermark image (PNG / JPG)</label>
            <button class="btn btn-ghost" id="wmPickImage">Choose image&hellip;</button>
            <span class="hint" id="wmImageName">No image selected</span>
          </div>
          ${positionSelect('wmImgPos', 'bottom-right')}
          <div class="field">
            <label for="wmImgScale">Size (% of page width) <span class="range-val" id="wmImgScaleVal">25%</span></label>
            <input type="range" id="wmImgScale" min="5" max="100" value="25" />
          </div>
          <div class="field">
            <label for="wmImgOpacity">Opacity <span class="range-val" id="wmImgOpacityVal">50%</span></label>
            <input type="range" id="wmImgOpacity" min="5" max="100" value="50" />
          </div>
        </div>
      </div>`;
    segWire('#wmSeg', (v) => {
      $('#wmTextOpts').style.display = v === 'text' ? '' : 'none';
      $('#wmImageOpts').style.display = v === 'image' ? '' : 'none';
      updateRunState();
    });
    rangeWire('#wmTextOpacity', '#wmTextOpacityVal');
    rangeWire('#wmImgScale', '#wmImgScaleVal');
    rangeWire('#wmImgOpacity', '#wmImgOpacityVal');
    $('#wmPickImage').addEventListener('click', async () => {
      const res = await window.api.pickImage();
      if (res.ok && res.result) {
        wmImagePath = res.result;
        $('#wmImageName').textContent = wmImagePath.split(/[\\/]/).pop();
        updateRunState();
      }
    });
  } else if (t === 'images') {
    el.options.innerHTML = `
      <div class="opt-row">
        <div class="field">
          <label for="imgFit">Page size</label>
          <select id="imgFit">
            <option value="a4" selected>Fit to A4 portrait</option>
            <option value="native">Match image size</option>
          </select>
        </div>
      </div>
      <div class="hint">One image per page, in list order. Drag rows to reorder.</div>`;
  } else if (t === 'metadata') {
    el.options.innerHTML = `
      <div class="opt-row">
        <div class="field grow"><label for="metaTitle">Title</label><input type="text" id="metaTitle" placeholder="Document title" /></div>
        <div class="field grow"><label for="metaAuthor">Author</label><input type="text" id="metaAuthor" placeholder="Author name" /></div>
        <div class="field grow"><label for="metaSubject">Subject</label><input type="text" id="metaSubject" placeholder="Subject (optional)" /></div>
      </div>
      <div class="hint">Drop a PDF above — its current metadata loads into these fields. Saving writes a new copy.</div>`;
  }
  el.options.querySelectorAll('input').forEach((inp) => inp.addEventListener('input', updateRunState));
}

function segWire(sel, onChange) {
  const seg = $(sel);
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    seg.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
    if (onChange) onChange(b.dataset.v);
  });
}

function segValue(sel) {
  return $(sel).querySelector('button.active').dataset.v;
}

function rangeWire(inputSel, valSel) {
  const inp = $(inputSel);
  inp.addEventListener('input', () => { $(valSel).textContent = `${inp.value}%`; });
}

// ---------- output dir ----------
el.outdirBtn.addEventListener('click', async () => {
  if (busy) return;
  const res = await window.api.pickOutputDir();
  if (res.ok && res.result) {
    outDir = res.result;
    el.outdirPath.textContent = outDir;
  }
});

// ---------- run ----------
function updateRunState() {
  const cfg = TOOLS[currentTool];
  let ready = files.length >= cfg.minFiles && !!outDir;
  if (currentTool === 'split') {
    const v = $('#splitRanges');
    ready = ready && v && v.value.trim().length > 0;
  }
  if (currentTool === 'watermark') {
    const mode = $('#wmSeg') ? segValue('#wmSeg') : 'text';
    if (mode === 'text') ready = ready && $('#wmText') && $('#wmText').value.trim().length > 0;
    else ready = ready && !!wmImagePath;
  }
  el.runBtn.disabled = !ready || busy;
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function baseName(p) {
  return p.split(/[\\/]/).pop().replace(/\.pdf$/i, '');
}

function setBusy(text) {
  busy = true;
  el.status.hidden = false;
  el.spinner.classList.remove('done');
  el.statusText.className = 'status-text';
  el.statusText.textContent = text;
  el.results.innerHTML = '';
  el.runBtn.disabled = true;
}

function setDone(text, outputs) {
  busy = false;
  el.spinner.classList.add('done');
  el.statusText.className = 'status-text ok';
  el.statusText.textContent = text;
  el.results.innerHTML = '';
  for (const o of outputs) {
    const div = document.createElement('div');
    div.className = 'result-item';
    div.innerHTML = `<span class="result-path" title="${o}">${o}</span>
      <button class="btn-link" data-path="${o}">Show in folder</button>`;
    el.results.appendChild(div);
  }
  updateRunState();
}

function setError(msg) {
  busy = false;
  el.spinner.classList.add('done');
  el.statusText.className = 'status-text err';
  el.statusText.textContent = `Error: ${msg}`;
  updateRunState();
}

function hideStatus() {
  el.status.hidden = true;
  el.results.innerHTML = '';
}

el.results.addEventListener('click', (e) => {
  const b = e.target.closest('[data-path]');
  if (b) window.api.showInFolder(b.dataset.path);
});

el.runBtn.addEventListener('click', async () => {
  if (busy) return;
  const join = (name) => `${outDir}\\${name}`;
  try {
    if (currentTool === 'merge') {
      setBusy(`Merging ${files.length} PDFs…`);
      const out = join(`merged-${stamp()}.pdf`);
      const res = await window.api.merge(files.map((f) => f.path), out);
      if (!res.ok) return setError(res.error);
      setDone(`Merged ${files.length} files → ${res.result.pageCount} pages`, [res.result.outPath]);

    } else if (currentTool === 'split') {
      setBusy('Splitting…');
      const ranges = $('#splitRanges').value.split('|').map((s) => s.trim()).filter(Boolean)
        .map((pages, i) => ({ label: `part-${i + 1}`, pages }));
      const res = await window.api.split(files[0].path, ranges, outDir);
      if (!res.ok) return setError(res.error);
      setDone(`Created ${res.result.length} file${res.result.length === 1 ? '' : 's'}`, res.result.map((r) => r.outPath));

    } else if (currentTool === 'rotate') {
      setBusy('Rotating…');
      const angle = parseInt(segValue('#rotSeg'), 10);
      const pages = $('#rotPages').value.trim() || 'all';
      const outputs = [];
      for (const f of files) {
        const out = join(`${baseName(f.path)}-rotated.pdf`);
        const res = await window.api.rotate(f.path, angle, pages, out);
        if (!res.ok) return setError(`${f.name}: ${res.error}`);
        outputs.push(res.result.outPath);
      }
      setDone(`Rotated ${files.length} file${files.length === 1 ? '' : 's'} by ${angle}°`, outputs);

    } else if (currentTool === 'watermark') {
      setBusy('Applying watermark…');
      const mode = segValue('#wmSeg');
      const outputs = [];
      for (const f of files) {
        const out = join(`${baseName(f.path)}-watermarked.pdf`);
        let res;
        if (mode === 'text') {
          res = await window.api.watermarkText(f.path, {
            text: $('#wmText').value.trim(),
            position: $('#wmTextPos').value,
            opacity: parseInt($('#wmTextOpacity').value, 10) / 100,
            fontSize: parseInt($('#wmSize').value, 10),
            diagonal: $('#wmDiagonal').value === 'yes',
          }, out);
        } else {
          res = await window.api.watermarkImage(f.path, {
            imagePath: wmImagePath,
            position: $('#wmImgPos').value,
            opacity: parseInt($('#wmImgOpacity').value, 10) / 100,
            scale: parseInt($('#wmImgScale').value, 10) / 100,
          }, out);
        }
        if (!res.ok) return setError(`${f.name}: ${res.error}`);
        outputs.push(res.result.outPath);
      }
      setDone(`Watermarked ${files.length} file${files.length === 1 ? '' : 's'}`, outputs);

    } else if (currentTool === 'images') {
      setBusy(`Converting ${files.length} image${files.length === 1 ? '' : 's'}…`);
      const out = join(`images-${stamp()}.pdf`);
      const res = await window.api.imagesToPdf(files.map((f) => f.path), out, {
        fitToA4: $('#imgFit').value === 'a4',
      });
      if (!res.ok) return setError(res.error);
      setDone(`Created PDF with ${res.result.pageCount} page${res.result.pageCount === 1 ? '' : 's'}`, [res.result.outPath]);

    } else if (currentTool === 'metadata') {
      setBusy('Saving metadata…');
      const out = join(`${baseName(files[0].path)}-updated.pdf`);
      const res = await window.api.setMetadata(files[0].path, {
        title: $('#metaTitle').value,
        author: $('#metaAuthor').value,
        subject: $('#metaSubject').value,
      }, out);
      if (!res.ok) return setError(res.error);
      setDone('Metadata saved to new copy', [res.result.outPath]);
    }
  } catch (err) {
    setError(err.message || String(err));
  }
});

const { contextBridge, ipcRenderer, webUtils } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('api', {
  // Drag & drop: resolve a DOM File object to its absolute path
  getPathForFile: (file) => webUtils.getPathForFile(file),

  pickPdfs: (multi) => invoke('dialog:pickPdfs', multi),
  pickImages: () => invoke('dialog:pickImages'),
  pickImage: () => invoke('dialog:pickImage'),
  pickOutputDir: () => invoke('dialog:pickOutputDir'),
  showInFolder: (p) => invoke('shell:showInFolder', p),
  defaultOutputDir: () => invoke('app:defaultOutputDir'),

  pdfInfo: (p) => invoke('pdf:info', p),
  merge: (inputs, outPath) => invoke('pdf:merge', inputs, outPath),
  split: (input, ranges, outDir) => invoke('pdf:split', input, ranges, outDir),
  rotate: (input, angle, pages, outPath) => invoke('pdf:rotate', input, angle, pages, outPath),
  watermarkText: (input, opts, outPath) => invoke('pdf:watermarkText', input, opts, outPath),
  watermarkImage: (input, opts, outPath) => invoke('pdf:watermarkImage', input, opts, outPath),
  imagesToPdf: (images, outPath, opts) => invoke('pdf:imagesToPdf', images, outPath, opts),
  readMetadata: (input) => invoke('pdf:readMetadata', input),
  setMetadata: (input, meta, outPath) => invoke('pdf:setMetadata', input, meta, outPath),
});

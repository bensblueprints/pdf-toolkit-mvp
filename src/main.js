const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const ops = require('./pdf-ops');

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 940,
    minHeight: 620,
    title: 'PDF Toolkit',
    backgroundColor: '#0b0d12',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---------- helpers ----------
const wrap = (fn) => async (_evt, ...args) => {
  try {
    const result = await fn(...args);
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
};

// ---------- dialogs ----------
ipcMain.handle('dialog:pickPdfs', wrap(async (multi = true) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Choose PDF files',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
    properties: multi ? ['openFile', 'multiSelections'] : ['openFile'],
  });
  return canceled ? [] : filePaths;
}));

ipcMain.handle('dialog:pickImages', wrap(async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Choose images',
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }],
    properties: ['openFile', 'multiSelections'],
  });
  return canceled ? [] : filePaths;
}));

ipcMain.handle('dialog:pickImage', wrap(async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Choose watermark image',
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }],
    properties: ['openFile'],
  });
  return canceled ? '' : filePaths[0];
}));

ipcMain.handle('dialog:pickOutputDir', wrap(async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Choose output folder',
    properties: ['openDirectory', 'createDirectory'],
  });
  return canceled ? '' : filePaths[0];
}));

ipcMain.handle('shell:showInFolder', wrap(async (filePath) => {
  shell.showItemInFolder(filePath);
  return true;
}));

ipcMain.handle('app:defaultOutputDir', wrap(async () => {
  return path.join(app.getPath('documents'), 'PDF Toolkit Output');
}));

// ---------- PDF operations ----------
ipcMain.handle('pdf:info', wrap((filePath) => ops.getPdfInfo(filePath)));
ipcMain.handle('pdf:merge', wrap((inputs, outPath) => ops.mergePdfs(inputs, outPath)));
ipcMain.handle('pdf:split', wrap((input, ranges, outDir) => ops.splitPdf(input, ranges, outDir)));
ipcMain.handle('pdf:rotate', wrap((input, angle, pages, outPath) => ops.rotatePdf(input, angle, pages, outPath)));
ipcMain.handle('pdf:watermarkText', wrap((input, opts, outPath) => ops.watermarkText(input, opts, outPath)));
ipcMain.handle('pdf:watermarkImage', wrap((input, opts, outPath) => ops.watermarkImage(input, opts, outPath)));
ipcMain.handle('pdf:imagesToPdf', wrap((images, outPath, opts) => ops.imagesToPdf(images, outPath, opts)));
ipcMain.handle('pdf:readMetadata', wrap((input) => ops.readMetadata(input)));
ipcMain.handle('pdf:setMetadata', wrap((input, meta, outPath) => ops.setMetadata(input, meta, outPath)));

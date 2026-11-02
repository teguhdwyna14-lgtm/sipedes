// =====================================================
// Electron Main Process - SIPEDES Desktop
// Kerangka awal untuk pengembangan tahap lanjutan
// =====================================================
//
// PENTING:
// - Context isolation AKTIF (contextIsolation: true)
// - Node integration pada renderer NONAKTIF (nodeIntegration: false)
// - Backend SIPEDES tetap berjalan di server ( lokal atau remote )
// - Aplikasi desktop hanya membungkus frontend web yang sudah di-build
//
// Cara menjalankan (development):
//   1. Pastikan backend berjalan: npm run dev:api (di root)
//   2. Build frontend: npm run build:web (di root)
//   3. Jalankan desktop: cd apps/desktop && npx electron .
//
// Konfigurasi API URL ada di preload.js (VITE_API_BASE_URL)
// =====================================================

const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

// URL backend - sesuaikan dengan environment
const API_URL = process.env.SIPEDES_API_URL || 'http://localhost:4000';
// Path ke build frontend
const WEB_BUILD_DIR = path.resolve(__dirname, '../web/dist');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'SIPEDES - Sistem Informasi dan Pelayanan Desa',
    backgroundColor: '#fdfbf6',
    webPreferences: {
      // KEAMANAN: context isolation aktif, node integration nonaktif
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Muat frontend yang sudah di-build
  mainWindow.loadFile(path.join(WEB_BUILD_DIR, 'index.html'));

  // Buka link eksternal di browser default
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Menu bar minimal
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'togglefullscreen' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Tentang SIPEDES',
          click: () => shell.openExternal('https://github.com/your-org/sipedes'),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
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

// Catatan: aplikasi desktop TIDAK menjalankan backend secara otomatis.
// Backend harus dijalankan terpisah di server (localhost atau remote).

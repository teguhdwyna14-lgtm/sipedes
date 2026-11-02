// =====================================================
// Electron Preload - jembatan aman antara main & renderer
// =====================================================
//
// contextBridge mengekspos API terbatas ke renderer (window.sipedes)
// sehingga renderer tidak memiliki akses langsung ke Node.js
// =====================================================

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('sipedes', {
  // Versi aplikasi
  version: '1.0.0',
  platform: process.platform,
  // URL backend yang akan digunakan frontend
  apiUrl: process.env.SIPEDES_API_URL || 'http://localhost:4000',
  // Flag bahwa aplikasi berjalan dalam Electron
  isDesktop: true,
});

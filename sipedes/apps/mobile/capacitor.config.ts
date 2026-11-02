// =====================================================
// Capacitor Configuration - SIPEDES Mobile
// Kerangka awal untuk pengembangan tahap lanjutan
// =====================================================
//
// Cara setup (setelah install dependencies):
//   1. Build frontend web: npm run build:web (di root)
//   2. Salin hasil build ke folder mobile:
//      cp -r apps/web/dist apps/mobile/www
//   3. Tambahkan platform Android:
//      cd apps/mobile && npx cap add android
//   4. Sync:
//      npx cap sync
//   5. Buka di Android Studio:
//      npx cap open android
//
// Konfigurasi serverUrl di bawah agar frontend tahu URL backend.
// Untuk production, deploy backend ke server publik (HTTPS).
// =====================================================

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.desa.sipedes',
  appName: 'SIPEDES',
  webDir: 'www',
  server: {
    // Untuk development: gunakan URL backend lokal atau via network IP
    // Untuk production: arahkan ke backend publik HTTPS
    // url: 'http://192.168.1.100:4000', // contoh
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false, // HTTPS only di production
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#245334',
      showSpinner: false,
      androidSplashResourceName: 'splash',
    },
    Preferences: {
      // untuk menyimpan JWT token dengan aman
    },
  },
};

export default config;

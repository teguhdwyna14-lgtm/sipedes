# DESKTOP-MOBILE.md - Panduan Aplikasi Desktop & Mobile SIPEDES

Dokumen ini menjelaskan cara membangun aplikasi SIPEDES untuk platform **Desktop (Electron)** dan **Mobile (Capacitor/Android)**. Frontend React yang sudah dibangun akan digunakan kembali (reuse) untuk kedua platform tersebut, sementara backend tetap berjalan terpisah di server.

> **Status saat ini**: Scaffolding awal. Kode dasar sudah ada di `apps/desktop/` dan `apps/mobile/`, tetapi **belum diklaim selesai**. Build installer penuh dan pengujian pada device fisik masih perlu dilakukan sebelum aplikasi dianggap production-ready untuk platform desktop/mobile.

---

## Daftar Isi

1. [Arsitektur](#1-arsitektur)
2. [Electron Desktop](#2-electron-desktop)
3. [Capacitor Mobile](#3-capacitor-mobile)
4. [Status Implementasi](#4-status-implementasi)
5. [Yang Perlu Dilakukan Sebelum Klaim Selesai](#5-yang-perlu-dilakukan-sebelum-klaim-selesai)
6. [Referensi](#6-referensi)

---

## 1. Arsitektur

### 1.1 Filosofi "Reuse Frontend"

SIPEDES menggunakan strategi **single codebase, multiple platforms**:

```
                    +-------------------+
                    |   Frontend React  |  (apps/web)
                    |   - Vite build    |
                    |   - Tailwind CSS  |
                    +---------+---------+
                              |
                +-------------+-------------+
                |             |             |
        +-------v------+ +---v---+ +-------v--------+
        |   Web SPA    | |Electron| |Capacitor Mobile|
        | (browser)    | |Desktop | | (Android)      |
        +--------------+ +--------+ +----------------+
                |             |             |
                +-------------+-------------+
                              |
                    +---------v---------+
                    |   Backend Express  |  (apps/api)
                    |   - REST API       |
                    |   - MySQL/SQLite   |
                    +-------------------+
```

**Yang sama di semua platform:**
- Kode frontend React (components, pages, hooks, store, lib).
- Logika bisnis (validasi, flow).
- API client (`apps/web/src/lib/api.ts`).

**Yang berbeda:**
- **Web**: dijalankan langsung di browser, akses backend via same-origin atau CORS.
- **Desktop**: dibungkus Electron, frontend di-load dari file lokal (`file://`), akses backend via HTTP ke server lokal/remote.
- **Mobile**: dibungkus Capacitor WebView, frontend di-load dari `capacitor.config.webDir`, akses backend via HTTP/HTTPS.

### 1.2 Backend Tetap Terpisah

Backend **tidak** dibundle ke dalam aplikasi desktop/mobile. Alasannya:
1. Database MySQL tidak bisa dijalankan di dalam APK Android.
2. Sinkronisasi data antar perangkat tetap perlu server pusat.
3. Maintenance server terpisah dari maintenance client.

**Implikasi:**
- Backend harus di-deploy ke server publik (VPS / shared hosting) sebelum aplikasi mobile bisa digunakan di device fisik.
- Untuk desktop, backend bisa dijalankan lokal (di mesin yang sama) atau remote.

### 1.3 Strategi API URL

Setiap platform punya cara sendiri untuk menentukan URL backend:

| Platform | Cara Konfigurasi URL Backend |
|----------|------------------------------|
| Web (dev) | Vite proxy: `/api/*` -> `http://localhost:4000` (di `vite.config.ts`). |
| Web (production) | Variabel lingkungan `VITE_API_BASE_URL` saat build. |
| Electron | Environment variable `SIPEDES_API_URL`, fallback `http://localhost:4000`. Dibaca di `main.js` dan diekspos ke renderer via `preload.js` (`window.sipedes.apiUrl`). |
| Capacitor | `capacitor.config.ts` field `server.url`, atau hardcode di `lib/api.ts`. |

---

## 2. Electron Desktop

Electron memungkinkan aplikasi web dibungkus menjadi aplikasi desktop native (Windows .exe, macOS .dmg, Linux .AppImage).

### 2.1 Prasyarat

| Komponen | Versi | Catatan |
|----------|-------|---------|
| Node.js | v18 LTS+ | Sama dengan backend. |
| NPM | v9+ | |
| Electron | v31+ | Sudah terdaftar di `apps/desktop/package.json`. |
| electron-builder (opsional) | v24+ | Untuk packaging installer. Belum di-install secara default. |
| OS | Windows 10+ / macOS 11+ / Linux | Untuk build installer spesifik OS. |

### 2.2 Struktur File

```
apps/desktop/
├── package.json       # deklarasi paket @sipedes/desktop
├── main.js            # Electron main process
└── preload.js         # Preload script (jembatan aman ke renderer)
```

Frontend yang dipakai adalah hasil build dari `apps/web/` (folder `apps/web/dist/`). **Tidak** ada kode frontend duplikat di `apps/desktop/`.

### 2.3 Main Process (main.js)

File `apps/desktop/main.js` berisi:

1. **Membuat BrowserWindow** dengan ukuran 1280x800, minimum 1024x600.
2. **Konfigurasi keamanan** (penting - lihat 2.5).
3. **Memuat file** `apps/web/dist/index.html` via `mainWindow.loadFile()`.
4. **Membuka link eksternal** di browser default (bukan di Electron window).
5. **Menu bar** minimal (File, View, Help).
6. **Lifecycle handler** (`window-all-closed`, `activate` untuk macOS).

Potongan penting dari `main.js`:

```javascript
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

const API_URL = process.env.SIPEDES_API_URL || 'http://localhost:4000';
const WEB_BUILD_DIR = path.resolve(__dirname, '../web/dist');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'SIPEDES - Sistem Informasi dan Pelayanan Desa',
    backgroundColor: '#fdfbf6',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(WEB_BUILD_DIR, 'index.html'));
  // ... menu, link handler
}

app.whenReady().then(() => {
  createWindow();
  // ...
});
```

### 2.4 Preload Script (preload.js)

File `apps/desktop/preload.js` menggunakan `contextBridge` untuk mengekspos API terbatas ke renderer (window global). Renderer tidak punya akses langsung ke Node.js.

```javascript
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('sipedes', {
  version: '1.0.0',
  platform: process.platform,
  apiUrl: process.env.SIPEDES_API_URL || 'http://localhost:4000',
  isDesktop: true,
});
```

Frontend dapat membaca URL backend dari `window.sipedes.apiUrl` jika tersedia (deteksi environment desktop). Lihat contoh integrasi di bagian 2.7.

### 2.5 Konfigurasi Keamanan

Keamanan adalah prioritas utama di Electron. Konfigurasi yang diterapkan:

| Opsi | Nilai | Alasan |
|------|-------|--------|
| `contextIsolation` | `true` | Memisahkan context renderer dari Node.js. Mencegah renderer akses langsung ke `require`, `process`, dll. |
| `nodeIntegration` | `false` | Renderer tidak bisa pakai API Node.js langsung. |
| `sandbox` | `true` | Sandbox Chromium untuk renderer, isolasi proses lebih ketat. |
| `preload` | `apps/desktop/preload.js` | Bridge aman via `contextBridge`. |
| Link handler | `shell.openExternal` | Link `http(s)://` dibuka di browser default, bukan di Electron window (mencegah phishing). |

**Yang TIDAK boleh dilakukan:**
- `nodeIntegration: true` - bahaya, renderer bisa exec shell command.
- `contextIsolation: false` - renderer bisa modifikasi prototype Node.
- Load URL HTTP di production (harus HTTPS atau file lokal).

### 2.6 Cara Development

#### Langkah-langkah

1. **Jalankan backend** (terminal 1):
   ```bash
   npm run dev:api
   # Backend di http://localhost:4000
   ```

2. **Build frontend** (terminal 2):
   ```bash
   npm run build:web
   # Output: apps/web/dist/
   ```
   > Electron membaca dari `apps/web/dist/`, bukan dari Vite dev server. Jadi perlu build ulang setiap kali ada perubahan frontend.
   >
   > Tips: untuk development cepat, bisa juga arahkan `WEB_BUILD_DIR` ke folder dev server (lihat catatan di bawah).

3. **Jalankan Electron** (terminal 2):
   ```bash
   cd apps/desktop
   npx electron .
   ```

4. **Set API URL** (opsional, jika backend di tempat lain):
   ```bash
   # Linux/Mac
   SIPEDES_API_URL=http://192.168.1.100:4000 npx electron .

   # Windows PowerShell
   $env:SIPEDES_API_URL="http://192.168.1.100:4000"; npx electron .
   ```

#### Catatan: Development dengan Hot Reload

Untuk development dengan HMR (lebih cepat), modifikasi `main.js` agar load dari Vite dev server:

```javascript
// Saat development (NODE_ENV=development)
const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  mainWindow.loadURL('http://localhost:5173');   // Vite dev server
  mainWindow.webContents.openDevTools();
} else {
  mainWindow.loadFile(path.join(WEB_BUILD_DIR, 'index.html'));
}
```

Lalu jalankan dengan:
```bash
NODE_ENV=development npx electron .
```

> Modifikasi ini **belum** ada di `main.js` default - silakan tambah jika ingin pakai hot reload.

### 2.7 Konfigurasi API URL di Frontend

Frontend perlu mendeteksi apakah berjalan di Electron atau browser, dan memilih URL backend yang tepat.

Contoh implementasi di `apps/web/src/lib/api.ts`:

```typescript
const getApiBaseUrl = (): string => {
  // Deteksi Electron (window.sipedes diekspos oleh preload.js)
  if (typeof window !== 'undefined' && (window as any).sipedes?.isDesktop) {
    return (window as any).sipedes.apiUrl;
  }
  // Browser: pakai proxy atau env var
  return import.meta.env.VITE_API_BASE_URL || '';
  // string kosong = pakai same-origin (proxy dev server)
};

const api = axios.create({
  baseURL: `${getApiBaseUrl()}/api/v1`,
  // ...
});
```

> Catatan: implementasi deteksi `window.sipedes` perlu ditambahkan ke `apps/web/src/lib/api.ts` jika belum ada.

### 2.8 Build Installer

Untuk distribusi, perlu package aplikasi menjadi installer (`.exe`, `.dmg`, `.AppImage`).

#### 2.8.1 Install electron-builder

```bash
cd apps/desktop
npm install --save-dev electron-builder
```

#### 2.8.2 Tambah Konfigurasi Build

Buat file `apps/desktop/electron-builder.yml`:

```yaml
appId: id.desa.sipedes
productName: SIPEDES
directories:
  output: dist-electron
  buildResources: build
files:
  - main.js
  - preload.js
  - ../web/dist/**/*    # sertakan hasil build frontend
extraMetadata:
  main: main.js
win:
  target:
    - nsis
  icon: build/icon.ico
mac:
  target:
    - dmg
  icon: build/icon.icns
  category: public.app-category.government
linux:
  target:
    - AppImage
  icon: build/icon.png
  category: Office
nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
```

#### 2.8.3 Tambah Script Build di package.json

Edit `apps/desktop/package.json`:

```json
{
  "scripts": {
    "dev": "electron .",
    "build": "electron-builder",
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux"
  }
}
```

#### 2.8.4 Build

```bash
# Pastikan frontend sudah di-build
npm run build:web

# Build installer
cd apps/desktop
npm run build         # build untuk OS saat ini
# atau spesifik:
npm run build:win     # .exe (di Windows)
npm run build:mac     # .dmg (di Mac)
npm run build:linux   # .AppImage (di Linux)
```

Output ada di `apps/desktop/dist-electron/`.

> **Penting**: Build cross-platform tidak selalu mulus. Untuk .exe perlu Windows (atau CI dengan Wine), untuk .dmg perlu macOS. Gunakan GitHub Actions untuk build multi-OS otomatis.

#### 2.8.5 Code Signing (Opsional, untuk Production)

Installer yang tidak di-sign akan memunculkan warning "Unknown publisher" di Windows. Untuk hapus warning:

1. Beli code signing certificate (OV/EV) dari DigiCert, Sectigo, dll.
2. Konfigurasi di `electron-builder.yml`:
   ```yaml
   win:
     certificateFile: path/to/cert.pfx
     certificatePassword: $env:CSC_KEY_PASSWORD
   ```
3. Build: otomatis di-sign.

> Untuk akademik / internal use, warning "Unknown publisher" bisa diabaikan (user klik "More info" > "Run anyway").

### 2.9 Catatan Khusus Electron

- **Memory usage**: Electron pakai Chromium, jadi RAM yang dipakai 200-400 MB minimum. Pastikan mesin user memenuhi.
- **Auto-update**: belum diimplementasi di scaffolding. Untuk production, perlu `electron-updater` agar user dapat update otomatis.
- **Multiple windows**: saat ini hanya 1 window. Jika perlu multiple (mis. popup print surat), perlu tambah handler di `main.js`.
- **PDF export**: gunakan `BrowserWindow.webContents.print()` atau `printToPDF()` untuk export surat ke PDF langsung dari aplikasi desktop.

---

## 3. Capacitor Mobile

Capacitor (dari Ionic) memungkinkan aplikasi web dibungkus menjadi aplikasi native Android/iOS dengan akses ke API native (kamera, geolokasi, storage, dll).

### 3.1 Prasyarat

| Komponen | Versi | Catatan |
|----------|-------|---------|
| Node.js | v18+ | |
| NPM | v9+ | |
| Capacitor CLI | v6+ | Sudah terdaftar di `apps/mobile/package.json`. |
| Android Studio | Hedgehog (2023.1)+ | Untuk build APK. |
| JDK | v17 | Diperlukan Android Studio. |
| Android SDK | API 24+ (Android 7.0) | Dikelola via Android Studio SDK Manager. |
| (Opsional) Device fisik | Android 7.0+ | Untuk testing di device nyata. |
| (Opsional) Emulator | AVD via Android Studio | Untuk testing tanpa device fisik. |

### 3.2 Struktur File

```
apps/mobile/
├── package.json              # deklarasi paket @sipedes/mobile
├── capacitor.config.ts       # konfigurasi Capacitor
├── tsconfig.json             # TypeScript config
├── www/                      # (akan dibuat) hasil copy dari apps/web/dist/
└── android/                  # (akan dibuat setelah `npx cap add android`)
    ├── app/
    ├── build.gradle
    └── ...
```

### 3.3 Konfigurasi (capacitor.config.ts)

File `apps/mobile/capacitor.config.ts` berisi konfigurasi utama Capacitor:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.desa.sipedes',
  appName: 'SIPEDES',
  webDir: 'www',                    // folder berisi frontend hasil build
  server: {
    androidScheme: 'https',
    // url: 'http://192.168.1.100:4000',   // aktifkan untuk dev via network IP
  },
  android: {
    allowMixedContent: false,       // HTTPS only di production
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
```

### 3.4 Cara Setup Android Platform (Pertama Kali)

#### Langkah 1: Build Frontend

```bash
# Dari root proyek
npm run build:web
# Output: apps/web/dist/
```

#### Langkah 2: Copy Hasil Build ke `apps/mobile/www/`

```bash
mkdir -p apps/mobile/www
cp -r apps/web/dist/* apps/mobile/www/
# Atau gunakan perintah: cp -r apps/web/dist apps/mobile/www
```

> Capacitor akan membaca file dari folder `webDir` (yang sudah di-set ke `www`).

#### Langkah 3: Install Dependencies Mobile

```bash
cd apps/mobile
npm install
```

> Karena SIPEDES pakai NPM Workspaces, dependency sebenarnya sudah terinstall di root. Tapi perintah ini memastikan `@capacitor/cli` tersedia secara lokal.

#### Langkah 4: Tambah Platform Android

```bash
cd apps/mobile
npx cap add android
```

Ini akan:
- Membuat folder `apps/mobile/android/` (project Android native).
- Mengkonfigurasi Gradle, manifest, resource, dll.
- Memerlukan Android SDK terinstall (cek via Android Studio > SDK Manager).

#### Langkah 5: Sync (Salin Web Build + Update Plugin)

```bash
npx cap sync android
```

Jalankan perintah ini **setiap kali** ada perubahan:
- Frontend (setelah build ulang).
- Konfigurasi `capacitor.config.ts`.
- Install plugin Capacitor baru.

### 3.5 Buka di Android Studio

```bash
cd apps/mobile
npx cap open android
```

Android Studio akan terbuka dengan project SIPEDES.

#### Yang bisa dilakukan di Android Studio:

- **Run app**: pilih emulator atau device fisik, klik tombol Run (Shift+F10).
- **Build APK**: Build > Build Bundle(s) / APK(s) > Build APK(s).
- **Build AAB (Play Store)**: Build > Generate Signed Bundle / APK > Android App Bundle.
- **Edit native code** (jika perlu): file Java/Kotlin di `app/src/main/java/`.
- **Edit icon & splash screen**: ganti resource di `app/src/main/res/`.

### 3.6 Konfigurasi API URL untuk Production

Aplikasi mobile yang sudah terinstall di device tidak bisa mengakses `http://localhost:4000` (karena itu adalah device sendiri, bukan server development). Backend harus di-deploy ke server publik dengan **HTTPS**.

#### Opsi A: Hardcode di capacitor.config.ts (Tidak Direkomendasikan untuk Maintenabilitas)

```typescript
server: {
  url: 'https://api.sipedes.desa.id',
  androidScheme: 'https',
},
```

#### Opsi B: Build-time Environment Variable (Direkomendasikan)

Modifikasi `apps/web/src/lib/api.ts` agar membaca env var:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
});
```

Build frontend dengan env var:
```bash
# Linux/Mac
VITE_API_BASE_URL=https://api.sipedes.desa.id npm run build:web

# Windows PowerShell
$env:VITE_API_BASE_URL="https://api.sipedes.desa.id"; npm run build:web
```

Lalu copy ke `apps/mobile/www/` dan `npx cap sync android`.

#### Opsi C: Server URL via Capacitor Config (Development Only)

Untuk development via Wi-Fi (device fisik di jaringan yang sama dengan development server):

```typescript
server: {
  url: 'http://192.168.1.100:5173',   // IP komputer dev + Vite port
  cleartext: true,                     // izinkan HTTP (bukan HTTPS)
},
android: {
  allowMixedContent: true,             // WAJIB untuk HTTP development
},
```

> **PENTING**: `allowMixedContent: true` HANYA untuk development. Di production, wajib HTTPS.

#### Network Security Config untuk HTTP Development

Untuk Android 9+ yang melarang HTTP plain secara default, tambahkan file `apps/mobile/android/app/src/main/res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">192.168.1.100</domain>
    <!-- tambahkan IP server dev lain jika perlu -->
  </domain-config>
</network-security-config>
```

Lalu referensikan di `AndroidManifest.xml`:
```xml
<application
  android:networkSecurityConfig="@xml/network_security_config"
  ...>
```

### 3.7 Pengujian

#### 3.7.1 Pengujian di Emulator

1. Buka Android Studio > **Device Manager** > buat AVD baru (mis. Pixel 7 API 33).
2. Start emulator.
3. Di Android Studio dengan project SIPEDES terbuka: klik **Run** atau Shift+F10.
4. Aplikasi terinstall & terbuka di emulator.

#### 3.7.2 Pengujian di Device Fisik (Android)

1. Aktifkan **Developer Options** di HP: Settings > About phone > tap **Build number** 7x.
2. Aktifkan **USB Debugging**: Settings > Developer options > USB Debugging = ON.
3. Hubungkan HP ke PC via kabel USB.
4. Di Android Studio: device akan muncul di dropdown Run configuration.
5. Klik **Run**. Aplikasi terinstall ke HP.

> Jika device tidak terdeteksi, cek driver USB (Windows) atau jalankan `adb devices` untuk verifikasi.

#### 3.7.3 Pengujian Fungsional

Hal yang perlu diuji di mobile:
- Login & simpan token (gunakan `@capacitor/preferences` agar persist di storage native, bukan localStorage yang bisa terhapus).
- Navigasi antar halaman (back button Android harus kembali ke halaman sebelumnya, bukan keluar aplikasi).
- Upload file (gunakan `@capacitor/camera` atau `@capacitor/filesystem` jika perlu akses kamera/files native).
- Responsivitas UI (test berbagai ukuran layar).
- Performance (emulator lebih lambat dari device fisik - jangan jadikan patokan).

### 3.8 Build APK/AAB

#### 3.8.1 Debug APK

```bash
cd apps/mobile/android
./gradlew assembleDebug
# Output: apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Atau via Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s).

Debug APK bisa di-install langsung ke device (tidak perlu sign).

#### 3.8.2 Release APK (Signed)

1. Generate keystore (sekali seumur hidup):
   ```bash
   keytool -genkey -v -keystore sipedes-release.keystore -alias sipedes -keyalg RSA -keysize 2048 -validity 10000
   ```
   Simpan keystore di tempat AMAN. Jangan hilangkan - tidak bisa update app tanpa keystore yang sama.

2. Konfigurasi signing di `apps/mobile/android/app/build.gradle`:
   ```gradle
   android {
     signingConfigs {
       release {
         storeFile file('/path/to/sipedes-release.keystore')
         storePassword '*****'
         keyAlias 'sipedes'
         keyPassword '*****'
       }
     }
     buildTypes {
       release {
         signingConfig signingConfigs.release
         minifyEnabled true
         proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
       }
     }
   }
   ```

3. Build:
   ```bash
   cd apps/mobile/android
   ./gradlew assembleRelease
   # Output: app/build/outputs/apk/release/app-release.apk
   ```

#### 3.8.3 AAB (Android App Bundle untuk Play Store)

```bash
cd apps/mobile/android
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

Upload AAB ke Google Play Console: https://play.google.com/console.

### 3.9 Capacitor Plugins yang Direkomendasikan

Plugin yang perlu dipertimbangkan untuk ditambah (belum ada di scaffolding):

| Plugin | Fungsi |
|--------|--------|
| `@capacitor/preferences` | Simpan JWT token dengan aman (pengganti localStorage). |
| `@capacitor/filesystem` | Akses file di device (untuk download dokumen ke folder Download). |
| `@capacitor/camera` | Akses kamera untuk foto KTP/lampiran. |
| `@capacitor/geolocation` | Akses GPS (untuk fitur pelaporan lokasi pengaduan). |
| `@capacitor/share` | Share berita/pengumuman ke app lain (WhatsApp, dll). |
| `@capacitor/haptics` | Getaran saat feedback (mis. sukses submit). |
| `@capacitor/splash-screen` | Splash screen saat app dibuka. |
| `@capacitor/status-bar` | Kustomisasi status bar (warna, style). |
| `@capacitor/app` | Listen event lifecycle (pause, resume, back button). |

Install dengan:
```bash
cd apps/mobile
npm install @capacitor/preferences
npx cap sync
```

---

## 4. Status Implementasi

### 4.1 Yang Sudah Ada

| Komponen | Status | Lokasi |
|----------|--------|--------|
| Electron main process | Scaffolding awal | `apps/desktop/main.js` |
| Electron preload script | Scaffolding awal | `apps/desktop/preload.js` |
| Konfigurasi keamanan Electron | Selesai (contextIsolation, no nodeIntegration) | `apps/desktop/main.js` |
| Capacitor config | Scaffolding awal | `apps/mobile/capacitor.config.ts` |
| Konfigurasi Splash Screen | Default | `apps/mobile/capacitor.config.ts` |
| Package.json workspace | Terdaftar di root | `apps/desktop/package.json`, `apps/mobile/package.json` |
| Dependensi dasar | Terpasang (Electron 31, Capacitor 6) | Lihat lockfile |

### 4.2 Yang Belum Ada / Perlu Dikerjakan

| Komponen | Status |
|----------|--------|
| Frontend detection `window.sipedes.isDesktop` | Belum di-implementasi di `apps/web/src/lib/api.ts`. |
| electron-builder config | Belum ada. Perlu `apps/desktop/electron-builder.yml`. |
| Build script desktop | Hanya placeholder `echo`. |
| Android platform folder | Belum di-add (`npx cap add android` belum dijalankan). |
| Network security config | Belum ada (perlu untuk HTTP dev). |
| Signing config Android | Belum di-setup. |
| Capacitor plugins tambahan | Hanya `@capacitor/preferences` di dependency. Yang lain belum di-install. |
| Pengujian di device fisik | Belum dilakukan. |
| Build installer (.exe, .dmg, .apk, .aab) | Belum pernah di-build. |
| Code signing | Belum di-setup. |
| Auto-update (electron-updater) | Belum di-implementasi. |
| Icon & splash asset | Belum dibuat (placeholder). |

---

## 5. Yang Perlu Dilakukan Sebelum Klaim Selesai

Sebelum aplikasi desktop/mobile SIPEDES dianggap production-ready, item-item berikut **wajib** diselesaikan dan diverifikasi:

### 5.1 Desktop (Electron)

- [ ] Implementasi deteksi `window.sipedes.isDesktop` di `apps/web/src/lib/api.ts` agar frontend otomatis pakai URL backend yang benar.
- [ ] Tambah environment variable `VITE_API_BASE_URL` di `.env.example` dan dokumentasikan.
- [ ] Buat icon aplikasi (ICO untuk Windows, ICNS untuk Mac, PNG 512x512 untuk Linux). Letakkan di `apps/desktop/build/`.
- [ ] Buat file `apps/desktop/electron-builder.yml` dengan konfigurasi lengkap.
- [ ] Tambah script `build`, `build:win`, `build:mac`, `build:linux` di `apps/desktop/package.json`.
- [ ] Build installer di masing-masing OS (atau setup GitHub Actions untuk CI build).
- [ ] Test installer di fresh machine (tanpa Node.js terinstall) - pastikan aplikasi bisa dibuka.
- [ ] Test login, navigasi, upload file, dan download dokumen di aplikasi desktop.
- [ ] Verifikasi: link eksternal terbuka di browser default (bukan di jendela Electron).
- [ ] Verifikasi: DevTools bisa di-toggle (Ctrl+Shift+I) untuk debugging.
- [ ] (Opsional) Setup electron-updater untuk auto-update.
- [ ] (Opsional) Code signing untuk hapus warning "Unknown publisher".

### 5.2 Mobile (Capacitor Android)

- [ ] Build frontend dengan `VITE_API_BASE_URL` pointing ke backend production HTTPS.
- [ ] Copy `apps/web/dist/` ke `apps/mobile/www/`.
- [ ] Jalankan `npx cap add android` untuk generate project Android.
- [ ] Buat `network_security_config.xml` jika masih perlu HTTP di development.
- [ ] Buat icon aplikasi (adaptive icon untuk Android, splash screen). Gunakan Image Asset Studio di Android Studio atau tool seperti https://romannurik.github.io/AndroidAssetStudio/.
- [ ] Update `AndroidManifest.xml`: tambah permission `INTERNET`, `CAMERA` (jika perlu kamera), `ACCESS_FINE_LOCATION` (jika perlu GPS).
- [ ] Setup signing config di `app/build.gradle` dengan keystore release.
- [ ] Implementasi back button handler (agar tombol back Android kembali ke halaman sebelumnya, bukan keluar app). Pakai `@capacitor/app`.
- [ ] Implementasi storage JWT yang aman dengan `@capacitor/preferences` (ganti `localStorage`).
- [ ] Test di emulator Android (min API 24, max API 34).
- [ ] Test di minimal 2 device fisik (vendor berbeda: mis. Samsung, Xiaomi) - ada perbedaan WebView implementation.
- [ ] Test skenario: login, ajukan permohonan + upload lampiran, lihat berita, lacak pengaduan, download dokumen.
- [ ] Verifikasi: notifikasi permission (jika pakai plugin notifikasi) muncul dengan teks yang jelas.
- [ ] Build release APK dan install di device testing.
- [ ] (Opsional) Build AAB dan upload ke Google Play Console (internal testing track).
- [ ] Verifikasi: aplikasi tidak crash saat orientation change (portrait <-> landscape).
- [ ] Verifikasi: aplikasi tetap login setelah di-close (token tersimpan di Preferences).

### 5.3 Cross-Platform (Berlaku untuk Keduanya)

- [ ] Audit performa: Lighthouse score > 80 untuk performance, accessibility.
- [ ] Audit ukuran bundle frontend: pastikan tidak ada dependency berat yang tidak terpakai.
- [ ] Test offline behavior: aplikasi harus menampilkan pesan error yang jelas saat tidak ada koneksi, bukan blank screen.
- [ ] Test error handling: server mati, token expired, response 500 - semua harus ditangani dengan UI yang ramah.
- [ ] Audit keamanan: pastikan tidak ada hardcoded secret di frontend, tidak ada API key terbuka.
- [ ] Penetration testing dasar: test IDOR, XSS, CSRF pada endpoint yang dipakai.

---

## 6. Referensi

### 6.1 Dokumentasi Resmi

- Electron: https://www.electronjs.org/docs/latest
- electron-builder: https://www.electron.build/
- Capacitor: https://capacitorjs.com/docs
- Android Studio: https://developer.android.com/studio
- Google Play Console: https://play.google.com/console

### 6.2 Dokumen Terkait di Proyek

- [SETUP.md](./SETUP.md) - panduan instalasi development environment.
- [API.md](./API.md) - endpoint REST API yang dipakai frontend.
- [TESTING.md](./TESTING.md) - hasil pengujian.

### 6.3 File Source

- `apps/desktop/main.js` - main process Electron.
- `apps/desktop/preload.js` - preload script.
- `apps/desktop/package.json` - deklarasi paket desktop.
- `apps/mobile/capacitor.config.ts` - konfigurasi Capacitor.
- `apps/mobile/package.json` - deklarasi paket mobile.

---

**Akhir dokumen DESKTOP-MOBILE.**

> Dokumen ini akan diperbarui seiring penyelesaian implementasi desktop dan mobile. Saat ini status: **scaffolding awal - perlu build & uji penuh sebelum klaim selesai**.

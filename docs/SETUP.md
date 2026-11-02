# SETUP.md - Panduan Instalasi SIPEDES

Dokumen ini menjelaskan secara lengkap tahapan instalasi dan konfigurasi aplikasi **SIPEDES (Sistem Informasi dan Pelayanan Desa)** mulai dari prasyarat hingga deployment. Ditujukan untuk anggota tim pengembang dan evaluator akademik.

---

## Daftar Isi

1. [Prasyarat](#1-prasyarat)
2. [Instalasi Node.js & NPM](#2-instalasi-nodejs--npm)
3. [Instalasi Git & Konfigurasi Awal](#3-instalasi-git--konfigurasi-awal)
4. [Instalasi MySQL / Laragon](#4-instalasi-mysql--laragon)
5. [Instalasi VS Code & Extensions](#5-instalasi-vs-code--extensions)
6. [Clone Repository & Install Dependencies](#6-clone-repository--install-dependencies)
7. [Konfigurasi Environment (.env)](#7-konfigurasi-environment-env)
8. [Membuat Database MySQL Manual](#8-membuat-database-mysql-manual)
9. [Menjalankan Migration & Seed](#9-menjalankan-migration--seed)
10. [Menjalankan Frontend & Backend](#10-menjalankan-frontend--backend)
11. [Build untuk Production](#11-build-untuk-production)
12. [Deployment (Shared Hosting / VPS)](#12-deployment-shared-hosting--vps)
13. [Verifikasi Instalasi](#13-verifikasi-instalasi)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Prasyarat

### 1.1 Prasyarat Hardware

| Komponen | Minimum | Direkomendasikan |
|----------|---------|------------------|
| Prosesor | Dual-core 1.6 GHz | Quad-core 2.0 GHz atau lebih |
| RAM | 4 GB | 8 GB atau lebih |
| Penyimpanan | 5 GB free (SSD/HDD) | 10 GB SSD |
| Koneksi internet | Stabil (untuk download dependency) | Broadband |

### 1.2 Prasyarat Software

| Software | Versi Minimum | Catatan |
|----------|---------------|---------|
| Sistem Operasi | Windows 10 / macOS 11 / Ubuntu 20.04 | 64-bit |
| Node.js | v18.0.0 (LTS) | v20 LTS direkomendasikan |
| NPM | v9.0.0 | Terpasang otomatis dengan Node.js |
| Git | v2.30 | Untuk clone & version control |
| MySQL | v8.0 (atau MariaDB 10.6) | Kompatibel dengan Laragon |
| Browser modern | Chrome 100+ / Firefox 100+ / Edge 100+ | Untuk pengujian frontend |
| Code Editor | VS Code (opsional) | Direkomendasikan untuk pengembangan |

### 1.3 Pengetahuan Dasar

Pembaca diharapkan memahami dasar-dasar:
- Command line (Terminal / CMD / PowerShell)
- JavaScript / TypeScript
- SQL dasar
- Konsep HTTP dan REST API

---

## 2. Instalasi Node.js & NPM

Node.js adalah runtime JavaScript yang dibutuhkan untuk menjalankan backend dan membangun frontend. NPM (Node Package Manager) terpasang otomatis bersama Node.js.

### 2.1 Windows

1. Buka https://nodejs.org di browser.
2. Download **LTS Installer** (versi yang direkomendasikan, mis. v20.x LTS).
3. Jalankan installer (`node-v20.x.x-x64.msi`).
4. Ikuti wizard, centang opsi **"Add to PATH"**.
5. Klik **Install** lalu **Finish**.
6. Verifikasi:
   ```powershell
   node --version
   npm --version
   ```

### 2.2 macOS

**Opsi A - Installer resmi:**
1. Download installer `.pkg` dari https://nodejs.org.
2. Buka file `.pkg` dan ikuti wizard.

**Opsi B - Homebrew (direkomendasikan):**
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install node
```

Verifikasi:
```bash
node --version
npm --version
```

### 2.3 Linux (Debian/Ubuntu)

```bash
# Tambahkan NodeSource repository untuk versi LTS
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verifikasi:
```bash
node --version
npm --version
```

> Catatan: Pada beberapa distro Linux, NPM perlu di-install terpisah: `sudo apt install npm`.

---

## 3. Instalasi Git & Konfigurasi Awal

Git adalah sistem version control yang digunakan untuk mengelola kode sumber SIPEDES.

### 3.1 Instalasi

**Windows:**
1. Download installer dari https://git-scm.com/download/win.
2. Jalankan installer, ikuti opsi default (rekomendasi: pilih "Git from the command line and also from 3rd-party software").
3. Verifikasi: `git --version`.

**macOS:**
```bash
# Xcode Command Line Tools sudah menyertakan Git
xcode-select --install
# atau via Homebrew
brew install git
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt update
sudo apt install git -y
```

### 3.2 Konfigurasi Awal

Setelah terpasang, lakukan konfigurasi sekali untuk seluruh repository:

```bash
# Identitas (wajib)
git config --global user.name "Nama Lengkap Anda"
git config --global user.email "email@anda.com"

# Editor default (opsional - ganti dengan editor favorit)
git config --global core.editor "code --wait"   # VS Code
# atau
git config --global core.editor "nano"

# Pengaturan tambahan (opsional tapi direkomendasikan)
git config --global init.defaultBranch main
git config --global pull.rebase false
git config --global core.autocrlf input   # Windows: true, Mac/Linux: input
```

Verifikasi konfigurasi:
```bash
git config --list
```

---

## 4. Instalasi MySQL / Laragon

SIPEDES menggunakan MySQL sebagai database utama (InnoDB, charset utf8mb4). Untuk lingkungan development, disarankan menggunakan **Laragon** (Windows) atau MySQL Server (Mac/Linux).

### 4.1 Windows - Laragon (Direkomendasikan)

Laragon adalah bundle Apache + Nginx + MySQL + PHP + Redis yang ringan dan kompatibel dengan SIPEDES.

1. Download Laragon dari https://laragon.org/download/ (pilih **Laragon Full**).
2. Jalankan installer `laragon-wamp.exe`.
3. Install di path tanpa spasi (mis. `C:\laragon`).
4. Buka Laragon, klik **Start All**.
5. Pastikan MySQL berjalan (port 3306).
6. Buka **Database** > **phpMyAdmin** atau gunakan HeidiSQL/DBForge untuk membuat database.

**Default credential Laragon:**
- Host: `127.0.0.1`
- Port: `3306`
- User: `root`
- Password: *(kosong)*

### 4.2 macOS - MySQL Server via Homebrew

```bash
brew install mysql
brew services start mysql
# Amankan instalasi
mysql_secure_installation
```

### 4.3 Linux (Debian/Ubuntu) - MySQL Server

```bash
sudo apt update
sudo apt install mysql-server -y
sudo systemctl start mysql
sudo systemctl enable mysql
sudo mysql_secure_installation
```

### 4.4 Verifikasi MySQL Berjalan

```bash
mysql -u root -p
# Setelah masuk ke prompt mysql>:
SELECT VERSION();
EXIT;
```

> Catatan: SIPEDES juga mendukung **SQLite** sebagai fallback untuk pengujian cepat tanpa MySQL. Lihat bagian [Konfigurasi .env](#7-konfigurasi-environment-env).

---

## 5. Instalasi VS Code & Extensions

VS Code (Visual Studio Code) adalah code editor gratis yang direkomendasikan untuk pengembangan SIPEDES.

### 5.1 Instalasi VS Code

1. Download dari https://code.visualstudio.com.
2. Jalankan installer sesuai sistem operasi.
3. Buka VS Code, pastikan berjalan dengan baik.

### 5.2 Extensions Direkomendasikan

Buka panel **Extensions** (Ctrl+Shift+X / Cmd+Shift+X) lalu install:

| Extension | Fungsi |
|-----------|--------|
| **ESLint** | Linter JavaScript/TypeScript |
| **Prettier - Code formatter** | Auto-format kode |
| **Tailwind CSS IntelliSense** | Autocomplete class Tailwind |
| **TypeScript Vue Plugin (Volar)** | Dukungan TypeScript (opsional) |
| **ES7+ React/Redux/React-Native snippets** | Snippets React |
| **GitLens** | Visualisasi history Git |
| **Database Client** (mis. MySQL by Weijan Chen) | Akses database dari VS Code |
| **DotENV** | Syntax highlight untuk `.env` |
| **Path Intellisense** | Autocomplete path file |
| **Thunder Client** atau **REST Client** | Pengujian API dari editor |

### 5.3 Rekomendasi Settings

Buka **File > Preferences > Settings** (JSON), tambahkan:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.tabSize": 2,
  "files.autoSave": "onFocusChange",
  "terminal.integrated.defaultProfile.windows": "PowerShell"
}
```

---

## 6. Clone Repository & Install Dependencies

### 6.1 Clone Repository

```bash
# Pilih lokasi penyimpanan, mis. ~/Projects
cd ~/Projects

# Clone (ganti URL dengan repository tim Anda)
git clone https://github.com/username/sipedes.git
cd sipedes
```

### 6.2 Struktur Monorepo

SIPEDES menggunakan **NPM Workspaces**. Struktur proyek:

```
sipedes/
├── apps/
│   ├── web/           # Frontend React + Vite
│   ├── api/           # Backend Express + TypeScript
│   ├── desktop/       # Electron (scaffolding)
│   └── mobile/        # Capacitor (scaffolding)
├── packages/
│   └── shared/        # Tipe TypeScript bersama
├── database/
│   ├── migrations/    # SQL migrations
│   └── seeds/         # Seed data
├── storage/           # File upload (TIDAK di-commit)
├── docs/              # Dokumentasi
├── tests/             # Test files
├── .env.example
└── package.json       # Root package.json (workspaces)
```

### 6.3 Install Dependencies

Dari root proyek, jalankan satu perintah untuk menginstall seluruh dependency workspace:

```bash
npm install
```

NPM Workspaces otomatis:
- Menginstall dependencies untuk `apps/web`, `apps/api`, `apps/desktop`, `apps/mobile`, `packages/shared`.
- Membuat symlink `node_modules` di setiap workspace.
- Menginstall binary `tsx`, `vite`, `tsc`, dll. secara lokal.

Verifikasi:
```bash
ls node_modules/.bin/ | grep -E "tsx|vite|tsc"
```

> Jika terjadi error `EACCES` (permission denied) di Linux/Mac, gunakan NVM atau atur prefix NPM ke direktori user:
> ```bash
> mkdir ~/.npm-global
> npm config set prefix '~/.npm-global'
> echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
> source ~/.bashrc
> ```

---

## 7. Konfigurasi Environment (.env)

### 7.1 Salin Template

```bash
cp .env.example .env
```

### 7.2 Penjelasan Setiap Variabel

Buka file `.env` di editor dan sesuaikan:

#### Aplikasi

| Variabel | Default | Penjelasan |
|----------|---------|------------|
| `NODE_ENV` | `development` | Mode aplikasi: `development`, `production`, `test`. |
| `APP_NAME` | `SIPEDES` | Nama aplikasi (ditampilkan di log & beberapa halaman). |
| `PORT` | `4000` | Port backend Express. |
| `CLIENT_URL` | `http://localhost:5173` | URL frontend untuk konfigurasi CORS. |

#### Database

| Variabel | Default | Penjelasan |
|----------|---------|------------|
| `DB_CLIENT` | `mysql` | Driver database: `mysql` atau `sqlite`. |
| `DB_HOST` | `127.0.0.1` | Host MySQL (Laragon default). |
| `DB_PORT` | `3306` | Port MySQL. |
| `DB_USER` | `root` | User MySQL. |
| `DB_PASSWORD` | *(kosong)* | Password MySQL. Kosong untuk Laragon default. |
| `DB_NAME` | `sipedes_db` | Nama database. **Harus sudah dibuat manual** sebelum migrate. |
| `DB_CHARSET` | `utf8mb4` | Charset koneksi. |
| `DB_STORAGE` | `./storage/sipedes.sqlite` | Hanya dipakai jika `DB_CLIENT=sqlite`. |

#### Autentikasi

| Variabel | Default | Penjelasan |
|----------|---------|------------|
| `JWT_SECRET` | `ganti_dengan_...` | Secret key JWT. **WAJIB diganti** dengan string acak min. 32 karakter. Generate dengan `openssl rand -hex 32`. |
| `JWT_EXPIRES_IN` | `7d` | Masa berlaku token JWT. |
| `BCRYPT_ROUNDS` | `12` | Cost factor bcrypt. 12 = aman, 14 = lebih aman tapi lebih lambat. |

#### Keamanan

| Variabel | Default | Penjelasan |
|----------|---------|------------|
| `RATE_LIMIT_WINDOW_MS` | `900000` | Window rate limit umum (15 menit dalam ms). |
| `RATE_LIMIT_MAX` | `100` | Maksimum request per window untuk endpoint umum. |
| `LOGIN_RATE_LIMIT_MAX` | `5` | Maksimum percobaan login per window (anti brute-force). |
| `CORS_ORIGIN` | `http://localhost:5173` | Origin yang diizinkan CORS. |

#### Upload File

| Variabel | Default | Penjelasan |
|----------|---------|------------|
| `UPLOAD_DIR` | `./storage/uploads` | Lokasi penyimpanan file upload. |
| `MAX_UPLOAD_MB` | `5` | Ukuran maksimum upload (MB). |
| `ALLOWED_MIME_TYPES` | `image/jpeg,image/png,application/pdf` | Tipe MIME yang diizinkan (comma-separated). |

#### Identitas Desa

| Variabel | Default | Penjelasan |
|----------|---------|------------|
| `VILLAGE_NAME` | `Desa Contoh` | Nama desa default (akan dipakai saat seed). |
| `VILLAGE_DISTRICT` | `Kecamatan Contoh` | Kecamatan. |
| `VILLAGE_REGENCY` | `Kabupaten Contoh` | Kabupaten/Kota. |
| `VILLAGE_PROVINCE` | `Provinsi Contoh` | Provinsi. |
| `VILLAGE_ADDRESS` | `Jl. Contoh No. 1` | Alamat kantor desa. |
| `VILLAGE_PHONE` | `(021) 1234567` | Telepon desa. |
| `VILLAGE_EMAIL` | `info@desacontoh.id` | Email desa. |

### 7.3 Generate JWT_SECRET yang Aman

```bash
# Linux/Mac ( OpenSSL )
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Salin hasilnya ke `JWT_SECRET=` di file `.env`.

### 7.4 Konfigurasi Cepat (SQLite Fallback)

Untuk pengujian cepat tanpa MySQL, ubah di `.env`:
```env
DB_CLIENT=sqlite
DB_STORAGE=./storage/sipedes.sqlite
```
Lewati bagian [8. Membuat Database MySQL Manual](#8-membuat-database-mysql-manual) - SQLite akan otomatis membuat file.

---

## 8. Membuat Database MySQL Manual

Untuk `DB_CLIENT=mysql`, database harus dibuat terlebih dahulu sebelum menjalankan migration. Pilih salah satu cara:

### 8.1 Via MySQL CLI

```bash
mysql -u root -p
```

Pada prompt `mysql>`:
```sql
CREATE DATABASE sipedes_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

SHOW DATABASES LIKE 'sipedes_db';
EXIT;
```

### 8.2 Via phpMyAdmin (Laragon)

1. Buka browser ke http://localhost/phpmyadmin (atau klik tombol Database di Laragon).
2. Login dengan user `root`, password kosong.
3. Klik tab **Databases**.
4. Pada field **Create database**, ketik `sipedes_db`.
5. Pilih collation `utf8mb4_unicode_ci`.
6. Klik **Create**.

### 8.3 Via HeidiSQL / DBeaver / MySQL Workbench

1. Buat koneksi baru: host `127.0.0.1`, port `3306`, user `root`, password kosong.
2. Connect ke server.
3. Right-click pada daftar database > **Create new** > **Database**.
4. Beri nama `sipedes_db`, charset `utf8mb4`, collation `utf8mb4_unicode_ci`.
5. Save.

### 8.4 Verifikasi

```bash
mysql -u root -p -e "USE sipedes_db; SHOW TABLES;"
```
Output yang diharapkan: `Empty set` (belum ada tabel sebelum migration).

---

## 9. Menjalankan Migration & Seed

### 9.1 Migration

Migration membuat seluruh tabel sesuai skema di `database/migrations/mysql/001_initial_schema.sql`.

```bash
npm run db:migrate
```

Tabel yang dibuat: `roles`, `users`, `user_roles`, `resident_profiles`, `village_settings`, `news`, `announcements`, `service_types`, `service_requests`, `service_request_attachments`, `service_request_events`, `complaints`, `complaint_updates`, `documents`, `activity_logs`, `notifications`, `password_reset_tokens`.

Verifikasi:
```bash
mysql -u root -p -e "USE sipedes_db; SHOW TABLES;"
```

### 9.2 Seed Data

Seed mengisi data awal: pengaturan desa, akun demo, berita, pengumuman, jenis layanan, dsb.

```bash
npm run db:seed
```

Akun demo yang dibuat:

| Peran | Email | Password | Status |
|-------|-------|----------|--------|
| Admin | `admin@sipedes.local` | `Admin12345` | active |
| Petugas | `petugas@sipedes.local` | `Petugas123` | active |
| Warga | `budi@sipedes.local` | `Warga1234` | active |
| Warga | `siti@sipedes.local` | `Warga1234` | active |
| Warga | `agus@sipedes.local` | `Warga1234` | active |
| Warga | `deden@sipedes.local` | `Warga1234` | pending |
| Warga | `rina@sipedes.local` | `Warga1234` | rejected |

### 9.3 Reset Database (Jika Perlu)

Untuk menghapus seluruh data dan mengulang dari awal:

```bash
npm run db:reset
```

Perintah ini menjalankan: hapus tabel > migrate > seed.

---

## 10. Menjalankan Frontend & Backend

SIPEDES memerlukan **dua proses terpisah**: backend API dan frontend dev server. Buka **dua terminal**.

### 10.1 Terminal 1 - Backend

```bash
npm run dev:api
```

Output yang diharapkan:
```
> @sipedes/api@1.0.0 dev
> tsx watch src/index.ts

[SIPEDES] Server berjalan di http://localhost:4000
[SIPEDES] Database: mysql @ 127.0.0.1:3306/sipedes_db
[SIPEDES] Health check: http://localhost:4000/health
```

Verifikasi cepat:
```bash
curl http://localhost:4000/health
# Output: {"success":true,"message":"OK","data":{"status":"healthy",...}}
```

### 10.2 Terminal 2 - Frontend

```bash
npm run dev:web
```

Output yang diharapkan:
```
VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 10.3 Akses Aplikasi

Buka browser ke **http://localhost:5173**.

Vite dev server otomatis meneruskan request `/api/*` ke backend di port 4000 (lihat `apps/web/vite.config.ts` untuk konfigurasi proxy).

### 10.4 Login Demo

1. Klik **Login** di kanan atas.
2. Email: `admin@sipedes.local`, Password: `Admin12345`.
3. Anda akan diarahkan ke dashboard admin.

---

## 11. Build untuk Production

Build mengkompilasi TypeScript dan mengoptimalkan frontend untuk production.

### 11.1 Build Semua Workspace

```bash
npm run build
```

### 11.2 Output Build

| Workspace | Lokasi output | Isi |
|-----------|---------------|-----|
| `apps/web` | `apps/web/dist/` | Static files (HTML, JS, CSS teroptimasi) |
| `apps/api` | `apps/api/dist/` | JavaScript hasil kompilasi TypeScript |
| `packages/shared` | `packages/shared/dist/` | Tipe & utilitas bersama |

### 11.3 Menjalankan Backend Hasil Build

```bash
cd apps/api
node dist/index.js
```

> Pastikan `NODE_ENV=production` di `.env` agar optimasi production aktif (CORS lebih ketat, log lebih ringkas, dsb.).

### 11.4 Menyajikan Frontend Hasil Build

Frontend build adalah static files. Bisa disajikan via:
- **Express static middleware** (backend menyajikan `apps/web/dist/`).
- **Nginx** atau **Apache** sebagai reverse proxy.
- **Static hosting** (Vercel, Netlify, GitHub Pages - perlu konfigurasi SPA fallback).

Contoh Nginx config (overview):
```nginx
server {
    listen 80;
    server_name sipedes.example.com;

    root /var/www/sipedes/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;   # SPA fallback
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 12. Deployment (Shared Hosting / VPS)

### 12.1 Shared Hosting (cPanel)

Beberapa shared hosting mendukung Node.js (mis. melalui **Cloud Linux / Passenger**).

**Yang perlu disiapkan:**
1. Akses cPanel dengan fitur **Setup Node.js App**.
2. Database MySQL via **MySQL Database Wizard**.
3. (Opsional) SSL gratis via **Let's Encrypt** dari cPanel.

**Langkah umum:**
1. Buat database & user di cPanel, catat credential.
2. Upload source code via **File Manager** atau **Git version control** (cPanel sering menyediakan integrasi Git).
3. Buat aplikasi Node.js di cPanel:
   - Node version: 18 atau 20.
   - Application mode: `production`.
   - Application root: `/sipedes` (folder aplikasi).
   - Application URL: domain Anda.
   - Application startup file: `apps/api/dist/index.js`.
4. Set environment variables di form yang disediakan cPanel (sama seperti `.env`).
5. Jalankan migration & seed via SSH (jika tersedia) atau Terminal cPanel:
   ```bash
   cd ~/sipedes
   npm install --production
   npm run build:api
   npm run db:migrate
   npm run db:seed
   ```
6. Frontend: build lokal, lalu upload `apps/web/dist/` ke `public_html/` (atau subdomain). Sesuaikan `VITE_API_BASE_URL` agar mengarah ke URL backend.

### 12.2 VPS (Ubuntu/Debian)

**Yang perlu disiapkan:**
- VPS dengan akses root/sudo.
- Domain + DNS yang sudah diarahkan ke IP VPS.
- SSL certificate (Let's Encrypt via Certbot).

**Langkah umum:**
1. Install Node.js (lihat bagian 2.3).
2. Install MySQL Server (lihat bagian 4.3).
3. Install Nginx & PM2:
   ```bash
   sudo apt install nginx -y
   sudo npm install -g pm2
   ```
4. Clone repository & install:
   ```bash
   sudo mkdir -p /var/www/sipedes
   sudo chown $USER:$USER /var/www/sipedes
   git clone https://github.com/username/sipedes.git /var/www/sipedes
   cd /var/www/sipedes
   npm install
   npm run build
   ```
5. Konfigurasi `.env` (gunakan `DB_PASSWORD` yang kuat, `JWT_SECRET` baru, `NODE_ENV=production`).
6. Buat database & migrate:
   ```bash
   sudo mysql -u root -p -e "CREATE DATABASE sipedes_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   npm run db:migrate
   npm run db:seed
   ```
7. Jalankan backend dengan PM2:
   ```bash
   cd apps/api
   pm2 start dist/index.js --name sipedes-api
   pm2 save
   pm2 startup
   ```
8. Konfigurasi Nginx (lihat contoh di bagian 11.4).
9. Install SSL:
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d sipedes.example.com
   ```
10. Test akses via browser ke domain Anda.

### 12.3 Catatan Penting Deployment

- **JANGAN** commit file `.env` ke repository. Gunakan environment variable di server.
- Gunakan `JWT_SECRET` yang baru (berbeda dengan development) di production.
- Pastikan folder `storage/` writable oleh user yang menjalankan Node.js:
  ```bash
  sudo chown -R www-data:www-data /var/www/sipedes/storage
  sudo chmod -R 755 /var/www/sipedes/storage
  ```
- Backup database secara berkala:
  ```bash
  mysqldump -u root -p sipedes_db > backup_$(date +%F).sql
  ```

---

## 13. Verifikasi Instalasi

Lakukan checklist berikut untuk memastikan instalasi sukses:

### 13.1 Backend Health Check

```bash
curl http://localhost:4000/health
```

Respons yang diharapkan (HTTP 200):
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "status": "healthy",
    "uptime": 12.345,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### 13.2 Login Admin

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sipedes.local","password":"Admin12345"}'
```

Respons yang diharapkan (HTTP 200):
```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "token": "eyJhbGciOi...",
    "user": {
      "id": 1,
      "email": "admin@sipedes.local",
      "full_name": "Administrator",
      "role": "admin",
      "status": "active"
    }
  }
}
```

### 13.3 Akses Endpoint Privat dengan Token

```bash
# Ganti <TOKEN> dengan token dari langkah sebelumnya
curl http://localhost:4000/api/v1/dashboard/stats \
  -H "Authorization: Bearer <TOKEN>"
```

Respons yang diharapkan (HTTP 200):
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "totalUsers": 7,
    "totalNews": 5,
    "totalRequests": 0,
    "totalComplaints": 0
  }
}
```

### 13.4 Frontend Berjalan

Buka browser ke http://localhost:5173. Halaman beranda SIPEDES harus tampil dengan:
- Header dengan logo & menu navigasi.
- Hero section dengan judul desa.
- Statistik desa.
- Daftar berita terbaru.
- Footer dengan informasi kontak.

### 13.5 Checklist Akhir

- [ ] `node --version` menampilkan v18 atau lebih.
- [ ] `npm --version` menampilkan v9 atau lebih.
- [ ] `git --version` menampilkan v2.30 atau lebih.
- [ ] MySQL berjalan di port 3306.
- [ ] `npm install` berhasil tanpa error.
- [ ] `.env` sudah dikonfigurasi (terutama `JWT_SECRET`).
- [ ] Database `sipedes_db` sudah dibuat.
- [ ] `npm run db:migrate` berhasil.
- [ ] `npm run db:seed` berhasil.
- [ ] `npm run dev:api` berjalan tanpa error.
- [ ] `npm run dev:web` berjalan tanpa error.
- [ ] `curl http://localhost:4000/health` mengembalikan `{"success":true,...}`.
- [ ] Browser di http://localhost:5173 menampilkan halaman beranda.
- [ ] Login dengan `admin@sipedes.local` berhasil.

---

## 14. Troubleshooting

### 14.1 Port Sudah Digunakan

```bash
# Cek port yang dipakai
# Linux/Mac
lsof -i :4000   # backend
lsof -i :5173   # frontend

# Windows
netstat -ano | findstr :4000
netstat -ano | findstr :5173
```

Solusi:
- Hentikan proses yang memakai port: `kill -9 <PID>` (Linux/Mac) atau `taskkill /PID <PID> /F` (Windows).
- Atau ubah port: edit `PORT` di `.env` (backend) atau `server.port` di `apps/web/vite.config.ts` (frontend).

### 14.2 Database Connection Error (MySQL)

Gejala: error seperti `ECONNREFUSED 127.0.0.1:3306` atau `Access denied for user 'root'`.

Penyebab umum:
1. MySQL tidak berjalan - start service Laragon / `sudo systemctl start mysql`.
2. Credential salah - periksa `DB_USER`, `DB_PASSWORD` di `.env`.
3. Database belum dibuat - lihat [bagian 8](#8-membuat-database-mysql-manual).
4. Port salah - periksa `DB_PORT`.

Solusi alternatif: gunakan SQLite sementara (`DB_CLIENT=sqlite`).

### 14.3 Migration Gagal

```bash
npm run db:reset    # hapus semua tabel
npm run db:migrate
npm run db:seed
```

Jika masih gagal, periksa log error lengkap. Seringkali disebabkan oleh:
- Foreign key constraint (pastikan tabel dibuat sesuai urutan di file migration).
- Charset/collation tidak cocok - pastikan database menggunakan `utf8mb4_unicode_ci`.

### 14.4 Frontend Tidak Bisa Akses API

Gejala: di console browser muncul `Failed to load resource: CORS error` atau `Network Error`.

Solusi:
- Pastikan backend berjalan di port 4000.
- Periksa `CORS_ORIGIN` di `.env` sesuai dengan URL frontend (`http://localhost:5173`).
- Restart backend setelah mengubah `.env`.
- Periksa proxy di `apps/web/vite.config.ts` - harus meneruskan `/api` ke `http://localhost:4000`.

### 14.5 `tsx: command not found`

```bash
npm install         # reinstall dependencies
# atau
npx tsx src/index.ts
```

### 14.6 `Cannot find module '@sipedes/shared'`

```bash
# Pastikan install dari root, bukan dari subfolder
cd /home/user/sipedes   # root proyek
npm install
```

### 14.7 File Upload Tersimpan Tapi Tidak Bisa Diunduh

- Pastikan folder `storage/` ada dan writable:
  ```bash
  mkdir -p storage/uploads storage/documents
  chmod -R 755 storage
  ```
- Periksa `UPLOAD_DIR` di `.env`.

### 14.8 Login Rate Limit

Jika muncul error `Terlalu banyak percobaan login. Coba lagi nanti.`:
- Tunggu 15 menit (default `RATE_LIMIT_WINDOW_MS=900000`).
- Atau restart backend (cache rate limit di-reset).
- Atau ubah `LOGIN_RATE_LIMIT_MAX` di `.env` untuk development.

---

## Referensi

- README.md utama proyek (informasi umum).
- [docs/API.md](./API.md) - dokumentasi REST API.
- [docs/ERD.md](./ERD.md) - diagram basis data.
- [docs/GIT-NPM.md](./GIT-NPM.md) - panduan Git & NPM.
- [docs/ACCESS-MATRIX.md](./ACCESS-MATRIX.md) - matriks hak akses.
- [docs/TESTING.md](./TESTING.md) - hasil pengujian.

---

**Dokumen ini berakhir.** Untuk pertanyaan teknis lebih lanjut, hubungi tim pengembang atau buka issue di repository GitHub.

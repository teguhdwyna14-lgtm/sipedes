# Status revisi SIPEDES (29 Oktober 2026)

Ini revisi parsial berbasis proyek asli, BUKAN klaim bahwa seluruh permintaan sudah selesai atau teruji.

## Perubahan yang sudah dibuat
- Migration 001: nama kolom `notifications.is_read` diperbaiki.
- Migration 002 MySQL dan SQLite: households, household_members, business_categories, resident_businesses, village_locations.
- Endpoint `/api/v1/directory`: kategori, daftar/detail usaha yang published, pengajuan usaha oleh warga terverifikasi, moderasi status oleh petugas/admin, lokasi, pencarian nama warga terverifikasi dan anggota keluarga (tanpa mengembalikan NIK/KK lengkap).
- Halaman direktori usaha, detail usaha, peta lokasi berbasis tautan Google Maps, pencarian warga, moderasi usaha; tautan navigasi.
- Login menerima NIK 16 digit dan password yang SUDAH tersimpan sebagai hash. Password awal DOB **belum diotomatisasi** karena akun lama perlu migrasi kredensial terverifikasi secara aman. Admin/petugas yang belum punya profil warga ber-NIK perlu proses provisioning tersendiri.

## Belum selesai / belum diuji
- Paksaan penggantian password login pertama, provisioning DOB terverifikasi, logout token server-side, manajemen KK CRUD lengkap, peta Leaflet, upload/download peta, CRUD lengkap usaha, integrasi foto, pengujian runtime/build, screenshot aktual. Jangan gunakan untuk data warga nyata sebelum audit keamanan.
- Instalasi dependensi/build tidak dapat dijalankan di lingkungan penyusunan karena cache npm tidak memuat Electron (`ENOTCACHED`). Jalankan `npm install` pada mesin dengan internet dan lakukan build/test.

## Menjalankan di XAMPP
1. Cadangkan database `sipedes_db` di phpMyAdmin. Jangan drop database lama.
2. Ekstrak ZIP; copy `.env.example` menjadi `.env` di root, sesuaikan DB_HOST=127.0.0.1, DB_USER=root, DB_PASSWORD (kosong jika root XAMPP tanpa password), DB_NAME=sipedes_db, dan JWT_SECRET acak.
3. `npm install`
4. `npm run db:migrate` (migration runner mengeksekusi 001 idempotent dan 002; bila migration lama telah tercatat, hanya 002 yang berjalan).
5. `npm run dev:api` dan di terminal kedua `npm run dev:web`.
6. Buka http://localhost:5173/usaha (gunakan `/usaha` dengan huruf a Latin), `/peta`, `/warga/cari-warga`, `/staff/usaha`.
7. Perlu data profil warga aktif, kategori, dan usaha disetujui agar direktori tidak kosong. Data nyata jangan dimasukkan ke seed demo.

## Catatan kompatibilitas
- Bila sebelumnya membuat tabel notifications dengan kolom `read`, migration `CREATE TABLE IF NOT EXISTS` tidak mengubah tabel yang sudah ada. Untuk skema lama, sesuaikan manual `ALTER TABLE notifications CHANGE COLUMN \`read\` is_read TINYINT(1) NOT NULL DEFAULT 0;` setelah backup.
- Proyek mempertahankan frontend/backend lama. Perubahan login NIK mengubah kontrak API lama; registrasi lama masih email/password dan memerlukan desain ulang sebelum penggunaan nyata.

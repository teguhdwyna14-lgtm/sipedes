# CHANGELOG - SIPEDES Revisi

Dokumen ini mencatat perubahan dari versi awal SIPEDES ke versi revisi.

## Versi Revisi (2026-10-29)

### Modul Baru

#### 1. Login NIK + Password Awal (Tanggal Lahir)
**Perubahan**: Sistem login warga diubah dari email+password menjadi NIK+password awal.

**File yang diubah**:
- `apps/api/src/services/authService.ts` - Tambah `loginWithNik()`, `forceChangePassword()`, `birthDateToPassword()`
- `apps/api/src/controllers/authController.ts` - Tambah `loginNik`, `forceChangePassword` handlers
- `apps/api/src/routes/authRoutes.ts` - Tambah `POST /auth/login-nik`, `POST /auth/force-change-password`
- `apps/api/src/repositories/userRepository.ts` - Tambah `findByNik()`, `updateNik()`, update `create()` & `updatePasswordHash()` untuk dukung NIK & password_changed_at
- `apps/web/src/pages/auth/LoginPage.tsx` - Ubah form ke NIK + toggle email untuk staff
- `apps/web/src/pages/auth/ForceChangePasswordPage.tsx` (BARU) - Halaman wajib ganti password
- `apps/web/src/store/authStore.ts` - Tambah `mustChangePassword` state & `clearMustChangePassword()`
- `apps/web/src/components/layout/DashboardLayout.tsx` - Redirect ke force-change-password jika mustChangePassword=true

**Database**:
- Migration 002: Tambah kolom `nik` (UNIQUE) & `password_changed_at` di `users`
- Seed: Set NIK untuk semua user demo, set password awal = tanggal lahir (DDMMYYYY), `password_changed_at = NULL`

**Alur**:
1. Warga input NIK (16 digit) + password awal (DDMMYYYY dari tanggal lahir terverifikasi)
2. Backend validasi, return JWT dengan `mustChangePassword: true`
3. Frontend redirect ke `/force-change-password`
4. Warga buat password baru (min 8, huruf + angka)
5. `password_changed_at` di-set, password awal tidak lagi berfungsi

**Keamanan**:
- Pesan error generik "NIK atau kata sandi salah" (tidak membocorkan NIK terdaftar)
- NIK tidak dicatat di log aktivitas (hanya "Percobaan login NIK gagal")
- Rate limiting pada endpoint login
- Password awal tidak ditampilkan admin atau dikirim log

#### 2. Direktori Jasa & Usaha Warga
**Perubahan**: Modul baru untuk menampilkan usaha milik warga di halaman publik.

**File baru**:
- `apps/api/src/repositories/businessRepository.ts`
- `apps/api/src/repositories/businessCategoryRepository.ts`
- `apps/api/src/controllers/businessController.ts`
- `apps/api/src/controllers/businessCategoryController.ts`
- `apps/api/src/routes/businessRoutes.ts`
- `apps/api/src/routes/businessCategoryRoutes.ts`
- `apps/web/src/pages/public/BusinessDirectoryPage.tsx`
- `apps/web/src/pages/public/BusinessDetailPage.tsx`
- `apps/web/src/pages/warga/WargaBusinessList.tsx`
- `apps/web/src/pages/warga/WargaBusinessForm.tsx`
- `apps/web/src/pages/staff/StaffBusinesses.tsx`

**Database** (Migration 002):
- Tabel `business_categories` (id, name, slug, icon, description, active, sort_order)
- Tabel `resident_businesses` (id, owner_id FK ke resident_profiles, category_id FK, name, description, whatsapp, whatsapp_published, address, rt, rw, photo_url, latitude, longitude, status ENUM, rejection_note, approved_by_id, approved_at, timestamps)

**Fitur**:
- 9 kategori contoh (bengkel motor, warung, servis elektronik, tukang bangunan, jasa pertanian, jahit, makanan, transportasi, bengkel mobil)
- 6 usaha contoh (3 approved, 1 pending, 2 dengan WhatsApp tidak dipublikasi)
- Pencarian by nama/deskripsi + filter kategori
- Kartu usaha menampilkan: nama, pemilik, kategori, deskripsi, alamat, RT/RW
- Tombol "Hubungi" → `https://wa.me/{nomor}?text=...` (hanya jika whatsapp_published=true)
- Tombol "Lihat Lokasi" → `https://www.google.com/maps?q={lat},{lng}` (jika koordinat ada)
- Warga dapat mengajukan usaha (status pending), admin approve/reject
- Horizontal access: warga hanya edit usaha miliknya, hanya jika status pending/rejected

#### 3. Pengelompokan Kartu Keluarga (KK)
**Perubahan**: Warga dikelompokkan berdasarkan KK dengan relasi foreign key.

**File baru**:
- `apps/api/src/repositories/householdRepository.ts`
- `apps/api/src/controllers/householdController.ts`
- `apps/api/src/routes/householdRoutes.ts`
- `apps/web/src/pages/warga/MyHouseholdPage.tsx`
- `apps/web/src/pages/staff/StaffHouseholds.tsx`

**Database** (Migration 002 & 003):
- Tabel `households` (id, kk_number UNIQUE, address, rt, rw, dusun, head_resident_id FK, notes, timestamps)
- Tabel `household_members` (id, household_id FK, resident_id FK, role ENUM, is_head, timestamps, UNIQUE(household_id, resident_id))
- Tabel `resident_profiles` ditambah kolom: `household_id` FK, `household_role` ENUM, `phone_published` TINYINT
- Migration 003: `user_id` di `resident_profiles` jadi NULLable (untuk anggota KK yang belum punya akun)

**Fitur**:
- 3 KK contoh (KK Budi, KK Agus, KK Deden pending)
- Anggota dengan nama sama di KK berbeda (Ahmad Santoso di KK Budi & KK Agus) untuk demonstrasi pencarian
- CRUD KK & anggota oleh admin
- Warga lihat KK sendiri dengan KK number masked (`3201-****-0001`)
- NIK anggota masked untuk warga, full untuk staff
- Set kepala keluarga, tambah/hapus anggota

#### 4. Pencarian Warga (Login-Only)
**Perubahan**: Fitur baru untuk mencari warga by nama, hanya untuk pengguna login.

**File baru**:
- `apps/api/src/controllers/residentSearchController.ts`
- `apps/api/src/routes/residentSearchRoutes.ts`
- `apps/web/src/pages/warga/ResidentSearchPage.tsx`
- `apps/web/src/pages/warga/ResidentProfilePage.tsx`

**Endpoint**:
- `GET /api/v1/residents-search/search?q={query}&page=&limit=` (auth) - Hanya return residents dengan status active
- `GET /api/v1/residents-search/:id` (auth) - Profil publik resident

**Fitur**:
- Pencarian partial nama, case-insensitive, parameterized query
- Hasil: fullName, gender, rt, rw, dusun, householdId, headName (kepala KK), householdRole, phonePublished, phone (jika published)
- **TIDAK mengembalikan NIK atau nomor KK lengkap**
- Pembeda nama sama: headName (kepala keluarga) & RT/RW ditampilkan prominently
- Pagination (max 100 per page)
- Empty state ketika tidak ada hasil

#### 5. Peta Desa Interaktif
**Perubahan**: Halaman baru dengan peta Leaflet/OpenStreetMap.

**File baru**:
- `apps/api/src/repositories/mapRepository.ts`
- `apps/api/src/controllers/mapController.ts`
- `apps/api/src/routes/mapRoutes.ts`
- `apps/web/src/pages/public/VillageMapPage.tsx`
- `apps/web/src/pages/staff/StaffMapLocations.tsx`

**Database** (Migration 002):
- Tabel `map_locations` (id, name, type ENUM, description, latitude, longitude, address, icon, linked_business_id FK, active, timestamps)
- Tabel `map_files` (id, title, description, file_name, file_path, mime_type, file_size, attribution, uploaded_by_id, created_at)

**Fitur**:
- Peta interaktif Leaflet + OpenStreetMap (tidak butuh API key)
- 6 lokasi contoh: kantor desa, balai pertemuan, puskesmas, lapangan, 2 batas desa
- Marker dengan popup info
- Sidebar daftar lokasi (klik → fly to marker)
- Tombol "Buka di Google Maps" → `https://www.google.com/maps?q={lat},{lng}`
- Tombol "Download Peta" → stream file dari server (PNG demo 1x1 pixel)
- Upload file peta oleh admin (multipart form)
- Atribusi: "© OpenStreetMap contributors"
- Catatan: peta indikatif, bukan batas resmi

**Dependencies baru**: `leaflet`, `react-leaflet`, `@types/leaflet`

### Modul yang Dipertahankan (Tanpa Perubahan Berarti)
- Beranda, profil desa, berita, pengumuman, layanan, kontak
- Permohonan surat & pengaduan
- Dokumen & arsip
- Verifikasi warga
- Dashboard statistik
- Audit log
- Scaffolding Electron & Capacitor

### Database Migration
- **Migration 001** (tidak berubah): Skema awal
- **Migration 002** (BARU): NIK login, households, household_members, business_categories, resident_businesses, map_locations, map_files + kolom tambahan di resident_profiles
- **Migration 003** (BARU): Allow NULL user_id di resident_profiles (untuk anggota KK tanpa akun)

### Pengujian
- Test runner diupdate: `tests/api/run-tests.js`
- **34 integration tests, semua PASS** (sebelumnya 21 tests)
- Skenario baru: login NIK, force change, password lama ditolak, resident search, household masking, business approval workflow, map download, horizontal access

### Dokumentasi
- README.md diupdate dengan modul baru & alur login NIK
- CHANGELOG.md (file ini) ditambahkan
- TESTING.md diupdate dengan hasil 34 test
- API.md, ERD.md, ACCESS-MATRIX.md perlu diupdate untuk endpoint baru (TODO)

### Config
- `.env.example` tidak berubah (rate limit default tetap 5, bisa dinaikkan untuk testing)
- `apps/web/package.json` tambah dependencies: leaflet, react-leaflet, @types/leaflet

### Catatan
- File `.env` TIDAK dimasukkan ke ZIP final (hanya `.env.example`)
- File SQLite `storage/sipedes.sqlite*` TIDAK dimasukkan ke ZIP
- File upload `storage/uploads/*` TIDAK dimasukkan ke ZIP (kecuali .gitkeep)
- node_modules TIDAK dimasukkan ke ZIP

# ACCESS-MATRIX.md - Matriks Hak Akses SIPEDES

Dokumen ini menjelaskan secara detail hak akses setiap endpoint berdasarkan peran pengguna. Digunakan sebagai referensi implementasi middleware otorisasi di backend dan validasi client-side di frontend.

---

## Daftar Isi

1. [Penjelasan Peran](#1-penjelasan-peran)
2. [Aturan Umum](#2-aturan-umum)
3. [Matriks Lengkap](#3-matriks-lengkap)
4. [Pembatasan Akses Horizontal](#4-pembatasan-akses-horizontal)
5. [Verifikasi Warga](#5-verifikasi-warga)
6. [Pencegahan Self-Delete Admin Terakhir](#6-pencegahan-self-delete-admin-terakhir)
7. [Implementasi Middleware](#7-implementasi-middleware)

---

## 1. Penjelasan Peran

SIPEDES mengenal **4 peran** pengguna:

| Peran | Sumber | Deskripsi |
|-------|--------|-----------|
| **Visitor** | Tidak terdaftar / tidak login | Pengunjung publik. Hanya bisa akses endpoint publik. |
| **Warga** | `users.role = 'warga'` & `status = 'active'` | Warga desa yang sudah terverifikasi. Bisa ajukan layanan, pengaduan, akses dokumen sendiri. |
| **Petugas** | `users.role = 'petugas'` & `status = 'active'` | Staf pemerintahan desa. Bisa CRUD konten, verifikasi warga, proses permohonan. |
| **Admin** | `users.role = 'admin'` & `status = 'active'` | Administrator sistem. Akses penuh termasuk manajemen user, hapus data, pengaturan desa. |

### Status Akun

Selain peran, akun juga memiliki status yang mempengaruhi akses:

| Status | Bisa Login? | Catatan |
|--------|-------------|---------|
| `pending` | Tidak | Akun baru menunggu verifikasi petugas/admin. |
| `active` | Ya | Akses penuh sesuai peran. |
| `rejected` | Tidak | Verifikasi ditolak. Tidak bisa login. |
| `disabled` | Tidak | Dinonaktifkan oleh admin (mis. pelanggaran). |

Middleware `authenticate` memeriksa `status === 'active'`. Jika tidak, response `403 Forbidden` dengan pesan "Akun belum diverifikasi atau dinonaktifkan".

---

## 2. Aturan Umum

1. **Default deny**: endpoint yang tidak tercantum di tabel dianggap privat (butuh autentikasi).
2. **Vertical access control**: peran yang lebih tinggi **otomatis** mewarisi hak peran lebih rendah (admin > petugas > warga > visitor) untuk endpoint umum, kecuali ada aturan khusus.
3. **Horizontal access control**: warga hanya bisa akses data miliknya sendiri (permohonan, pengaduan, dokumen privat). Implementasi di controller, bukan middleware.
4. **Status check**: setiap request ke endpoint privat diverifikasi `status === 'active'` di middleware `authenticate`.
5. **Self-protection**: admin tidak bisa hapus / disable diri sendiri atau admin terakhir.

---

## 3. Matriks Lengkap

Legenda:
- **Y** = Ya, diizinkan.
- **-** = Tidak diizinkan (akan mendapat 401 atau 403).
- **own** = Hanya data milik sendiri (horizontal check di controller).

### 3.1 Public & Auth

| Endpoint | Visitor | Warga | Petugas | Admin |
|----------|---------|-------|---------|-------|
| GET /health | Y | Y | Y | Y |
| GET /api/v1/public/news | Y | Y | Y | Y |
| GET /api/v1/public/news/:slug | Y | Y | Y | Y |
| GET /api/v1/public/announcements | Y | Y | Y | Y |
| GET /api/v1/public/service-types | Y | Y | Y | Y |
| GET /api/v1/public/village | Y | Y | Y | Y |
| GET /api/v1/public/news-categories | Y | Y | Y | Y |
| GET /api/v1/public/complaints/track | Y | Y | Y | Y |
| POST /api/v1/auth/register | Y | - | - | - |
| POST /api/v1/auth/login | Y | - | - | - |
| GET /api/v1/auth/me | - | Y | Y | Y |
| PATCH /api/v1/auth/me | - | Y | Y | Y |
| POST /api/v1/auth/change-password | - | Y | Y | Y |

### 3.2 Berita

| Endpoint | Visitor | Warga | Petugas | Admin |
|----------|---------|-------|---------|-------|
| GET /api/v1/news | Y | Y | Y | Y |
| GET /api/v1/news/:slug | Y | Y | Y | Y |
| GET /api/v1/news/admin | - | - | Y | Y |
| GET /api/v1/news/admin/:id | - | - | Y | Y |
| POST /api/v1/news | - | - | Y | Y |
| PUT /api/v1/news/:id | - | - | Y | Y |
| DELETE /api/v1/news/:id | - | - | - | Y |

### 3.3 Pengumuman

| Endpoint | Visitor | Warga | Petugas | Admin |
|----------|---------|-------|---------|-------|
| GET /api/v1/announcements | Y | Y | Y | Y |
| GET /api/v1/announcements/:id | Y | Y | Y | Y |
| GET /api/v1/announcements/admin | - | - | Y | Y |
| GET /api/v1/announcements/admin/:id | - | - | Y | Y |
| POST /api/v1/announcements | - | - | Y | Y |
| PUT /api/v1/announcements/:id | - | - | Y | Y |
| DELETE /api/v1/announcements/:id | - | - | - | Y |

### 3.4 Layanan & Permohonan

| Endpoint | Visitor | Warga | Petugas | Admin |
|----------|---------|-------|---------|-------|
| GET /api/v1/services/types | Y | Y | Y | Y |
| GET /api/v1/services/types/:id | Y | Y | Y | Y |
| GET /api/v1/services/types/admin | - | - | Y | Y |
| POST /api/v1/services/types | - | - | - | Y |
| PUT /api/v1/services/types/:id | - | - | - | Y |
| DELETE /api/v1/services/types/:id | - | - | - | Y |
| GET /api/v1/services/requests | - | Y (own) | Y (all) | Y (all) |
| GET /api/v1/services/requests/:id | - | Y (own) | Y (all) | Y (all) |
| POST /api/v1/services/requests | - | Y | Y | Y |
| PATCH /api/v1/services/requests/:id/status | - | - | Y | Y |
| POST /api/v1/services/requests/:id/attachments | - | Y (own) | Y (all) | Y (all) |

### 3.5 Pengaduan

| Endpoint | Visitor | Warga | Petugas | Admin |
|----------|---------|-------|---------|-------|
| GET /api/v1/public/complaints/track | Y | Y | Y | Y |
| GET /api/v1/complaints | - | Y (own) | Y (all) | Y (all) |
| GET /api/v1/complaints/:id | - | Y (own) | Y (all) | Y (all) |
| POST /api/v1/complaints | - | Y | Y | Y |
| POST /api/v1/complaints/:id/updates | - | - | Y | Y |

### 3.6 Dokumen

| Endpoint | Visitor | Warga | Petugas | Admin |
|----------|---------|-------|---------|-------|
| GET /api/v1/documents | - | Y (own+public) | Y (all) | Y (all) |
| GET /api/v1/documents/:id | - | Y (own+public) | Y (all) | Y (all) |
| GET /api/v1/documents/:id/download | - | Y (own+public) | Y (all) | Y (all) |
| POST /api/v1/documents | - | - | Y | Y |
| PUT /api/v1/documents/:id | - | - | Y | Y |
| DELETE /api/v1/documents/:id | - | - | - | Y |

### 3.7 Users (Manajemen Akun)

| Endpoint | Visitor | Warga | Petugas | Admin |
|----------|---------|-------|---------|-------|
| GET /api/v1/users | - | - | Y | Y |
| GET /api/v1/users/:id | - | - | Y | Y |
| PATCH /api/v1/users/:id/status | - | - | - | Y |
| PATCH /api/v1/users/:id/role | - | - | - | Y |
| DELETE /api/v1/users/:id | - | - | - | Y |

### 3.8 Residents (Profil Warga)

| Endpoint | Visitor | Warga | Petugas | Admin |
|----------|---------|-------|---------|-------|
| GET /api/v1/residents | - | - | Y | Y |
| GET /api/v1/residents/:id | - | - | Y | Y |
| PATCH /api/v1/residents/:id/verify | - | - | Y | Y |
| PUT /api/v1/residents/:id | - | - | Y | Y |

### 3.9 Dashboard

| Endpoint | Visitor | Warga | Petugas | Admin |
|----------|---------|-------|---------|-------|
| GET /api/v1/dashboard/stats | - | Y | Y | Y |

> Catatan: response dashboard berbeda per peran. Warga mendapat statistik milik sendiri, petugas/admin mendapat statistik global.

### 3.10 Village Settings

| Endpoint | Visitor | Warga | Petugas | Admin |
|----------|---------|-------|---------|-------|
| GET /api/v1/village | Y | Y | Y | Y |
| PUT /api/v1/village | - | - | Y | Y |

---

## 4. Pembatasan Akses Horizontal

Pembatasan horizontal (data-level) berbeda dengan vertical (peran-level). Pada vertical, middleware `requireRole()` menolak peran yang tidak diizinkan. Pada horizontal, middleware mengizinkan peran tersebut masuk, tetapi controller memfilter data berdasarkan `req.user.id`.

### 4.1 Implementasi di Controller

Contoh: `serviceController.listRequests` (warga lihat permohonan sendiri, staff lihat semua):

```typescript
// Pseudocode dari apps/api/src/controllers/serviceController.ts
async listRequests(req, res) {
  const userId = req.user.id;
  const role = req.user.role;

  let filter: { userId?: number } = {};
  if (role === 'warga') {
    filter.userId = userId;  // HANYA milik sendiri
  }
  // petugas & admin: filter.userId tidak di-set, ambil semua

  const { rows, total } = await serviceRequestRepository.list({
    ...filter,
    page, limit, status, ...
  });
  return paginated(res, rows, page, limit, total);
}
```

### 4.2 Cek Kepemilikan pada GET /:id

Ketika warga mengakses `GET /api/v1/services/requests/123`, controller memeriksa:

```typescript
async getRequest(req, res) {
  const id = parseInt(req.params.id);
  const request = await serviceRequestRepository.findById(id);
  if (!request) return notFound(res);

  // Horizontal check: warga hanya bisa akses miliknya
  if (req.user.role === 'warga' && request.user_id !== req.user.id) {
    return forbidden(res, 'Tidak dapat mengakses permohonan milik warga lain');
  }

  return ok(res, request);
}
```

### 4.3 Endpoint dengan Pembatasan Horizontal

| Endpoint | Aturan |
|----------|--------|
| `GET /api/v1/services/requests` | Warga: filter `user_id = req.user.id`. Petugas/Admin: semua. |
| `GET /api/v1/services/requests/:id` | Warga: 403 jika `request.user_id !== req.user.id`. |
| `POST /api/v1/services/requests/:id/attachments` | Warga: hanya jika `request.user_id === req.user.id`. |
| `GET /api/v1/complaints` | Warga: filter `user_id = req.user.id`. |
| `GET /api/v1/complaints/:id` | Warga: 403 jika `complaint.user_id !== req.user.id`. |
| `GET /api/v1/documents` | Warga: hanya dokumen `is_public=1` atau `owner_id = req.user.id`. |
| `GET /api/v1/documents/:id` | Warga: 403 jika dokumen privat dan `owner_id !== req.user.id`. |
| `GET /api/v1/documents/:id/download` | Warga: 403 jika dokumen privat dan `owner_id !== req.user.id`. |
| `GET /api/v1/dashboard/stats` | Warga: return statistik milik sendiri. Petugas/Admin: return statistik global. |

### 4.4 Anti-Pattern yang Dicegah

- Warga menyebut ID pengaduan orang lain di URL -> 403 Forbidden.
- Warga menyebut ID permohonan orang lain -> 403 Forbidden.
- Warga menebak ID dokumen privat -> 403 Forbidden.
- Token warga dipakai untuk akses endpoint admin -> 403 Forbidden (di-block middleware).

---

## 5. Verifikasi Warga

### 5.1 Alur Status Warga

```
[Registrasi]
    ↓
users.status = 'pending'
resident_profiles.status = 'pending'
    ↓
[Tidak bisa login]
    ↓
[Petugas/Admin buka halaman verifikasi]
    ↓
[Pilih: Approve / Reject]
    ↓
Approve:                          Reject:
users.status = 'active'           users.status = 'rejected'
resident_profiles.status = 'active'
resident_profiles.verified_by_id = req.user.id
resident_profiles.verified_at = NOW()
    ↓
[Warga bisa login & menggunakan sistem]
```

### 5.2 Endpoint Verifikasi

`PATCH /api/v1/residents/:id/verify` - Petugas atau Admin.

Body:
```json
{ "status": "active" }
```
atau
```json
{ "status": "rejected", "rejection_note": "NIK tidak valid." }
```

### 5.3 Implikasi di Sistem

| Aksi | Bisa Login? | Bisa Ajukan Layanan? | Bisa Lihat Dashboard? |
|------|-------------|----------------------|------------------------|
| Registrasi baru (pending) | Tidak | - | - |
| Diverifikasi (active) | Ya | Ya | Ya |
| Ditolak (rejected) | Tidak | - | - |
| Dinonaktifkan (disabled) | Tidak | - | - |

### 5.4 Re-Verifikasi

Jika warga yang sudah `active` perlu diturunkan status (mis. karena pindah desa):
1. Petugas/Admin: `PATCH /api/v1/users/:id/status` dengan `status: 'disabled'`.
2. Warga tidak bisa login lagi.

Jika warga `rejected` ingin banding:
1. Petugas periksa kembali dokumen.
2. `PATCH /api/v1/residents/:id/verify` dengan `status: 'active'`.
3. `users.status` otomatis ter-update ke `active`.

---

## 6. Pencegahan Self-Delete Admin Terakhir

Untuk mencegah sistem kehilangan akses admin (lock-out), backend menerapkan aturan:

### 6.1 Aturan

1. Admin **tidak boleh** menghapus akun sendiri via `DELETE /api/v1/users/:id`.
2. Admin **tidak boleh** menurunkan peran sendiri dari `admin` ke peran lain via `PATCH /api/v1/users/:id/role`.
3. Admin **tidak boleh** menonaktifkan akun sendiri via `PATCH /api/v1/users/:id/status`.
4. Admin terakhir (jika hanya tersisa 1 admin active) **tidak boleh** dihapus/diturunkan/dinonaktifkan oleh siapapun, termasuk dirinya sendiri.

### 6.2 Implementasi (Pseudocode)

Pada `userController.remove`:

```typescript
async remove(req, res) {
  const targetId = parseInt(req.params.id);
  const currentUserId = req.user.id;

  // Aturan 1: tidak boleh hapus diri sendiri
  if (targetId === currentUserId) {
    return fail(res, 'Tidak dapat menghapus akun sendiri', 409);
  }

  // Aturan 4: tidak boleh hapus admin terakhir
  const targetUser = await userRepository.findById(targetId);
  if (targetUser.role === 'admin' && targetUser.status === 'active') {
    const activeAdminCount = await userRepository.countActiveAdmins();
    if (activeAdminCount <= 1) {
      return fail(res, 'Tidak dapat menghapus admin terakhir', 409);
    }
  }

  await userRepository.delete(targetId);
  return ok(res, null, 'User dihapus');
}
```

Pola serupa diterapkan di `updateStatus` (cek `status === 'disabled'`) dan `updateRole` (cek dari `admin` ke peran lain).

### 6.3 Skenario Uji

| Skenario | Hasil |
|----------|-------|
| Admin hapus akun warga biasa | 200 OK |
| Admin hapus akun petugas | 200 OK |
| Admin hapus akun admin lain (jika masih ada >= 2 admin) | 200 OK |
| Admin hapus akun admin lain (jika hanya tersisa 1 admin = dirinya) | 409 Conflict |
| Admin hapus diri sendiri | 409 Conflict |
| Admin ubah role diri sendiri dari admin ke warga | 409 Conflict |
| Admin disable diri sendiri | 409 Conflict |

---

## 7. Implementasi Middleware

### 7.1 authenticate

Memeriksa JWT dan memastikan `status === 'active'`. Diterapkan di router level untuk endpoint privat.

```typescript
// apps/api/src/middleware/auth.ts
export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return unauthorized(res, 'Token autentikasi tidak ditemukan');
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyToken(token);
    if (payload.status !== 'active') {
      return forbidden(res, 'Akun belum diverifikasi atau dinonaktifkan');
    }
    req.user = payload;
    next();
  } catch {
    return unauthorized(res, 'Token tidak valid atau kedaluwarsa');
  }
}
```

### 7.2 requireRole

Memeriksa peran pengguna. Diterapkan setelah `authenticate` untuk kontrol vertikal.

```typescript
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return unauthorized(res);
    if (!roles.includes(req.user.role)) {
      return forbidden(res, 'Peran tidak memiliki akses ke sumber daya ini');
    }
    next();
  };
}

// Shortcut
export const requireStaff = requireRole('petugas', 'admin');
export const requireAdmin = requireRole('admin');
```

### 7.3 Pemakaian di Routes

Contoh di `apps/api/src/routes/newsRoutes.ts`:

```typescript
newsRouter.get('/admin', authenticate, requireStaff, newsController.list);
newsRouter.post('/', authenticate, requireStaff, newsController.create);
newsRouter.delete('/:id', authenticate, requireRole('admin'), newsController.remove);
```

Contoh di `apps/api/src/routes/index.ts` (auth di level router):

```typescript
router.use('/complaints', authenticate, complaintRouter);
router.use('/documents', authenticate, documentRouter);
router.use('/dashboard', authenticate, dashboardRouter);
router.use('/users', authenticate, userRouter);
router.use('/residents', authenticate, residentRouter);
```

### 7.4 Urutan Middleware Penting

Urutan middleware **harus**:

```
authenticate -> requireRole -> controller
```

Jika terbalik, `req.user` belum ada saat `requireRole` berjalan, dan akan selalu return 401.

### 7.5 Best Practice untuk Controller dengan Horizontal Check

```typescript
async getRequest(req, res) {
  // 1. Ambil data
  const request = await repository.findById(req.params.id);
  if (!request) return notFound(res, 'Permohonan tidak ditemukan');

  // 2. Horizontal check untuk warga
  if (req.user.role === 'warga' && request.user_id !== req.user.id) {
    return forbidden(res, 'Tidak dapat mengakses data milik warga lain');
  }

  // 3. Return data
  return ok(res, request);
}
```

Pattern ini penting untuk mencegah **IDOR (Insecure Direct Object Reference)** - vulnerability di mana user A bisa akses data user B hanya dengan menebak ID.

---

## 8. Ringkasan Hak Akses Visual

```
Visitor ─┐
         ├──> GET /public/*, POST /auth/register, POST /auth/login
         │
Warga ───┤──> [Semua yang Visitor dapat] +
         │    GET/PATCH /auth/me, POST /auth/change-password
         │    GET /api/v1/dashboard/stats (statistik sendiri)
         │    GET /api/v1/services/requests (milik sendiri)
         │    GET /api/v1/services/requests/:id (milik sendiri)
         │    POST /api/v1/services/requests
         │    POST /api/v1/services/requests/:id/attachments (milik sendiri)
         │    GET /api/v1/complaints (milik sendiri)
         │    GET /api/v1/complaints/:id (milik sendiri)
         │    POST /api/v1/complaints
         │    GET /api/v1/documents (publik + milik sendiri)
         │    GET /api/v1/documents/:id (publik + milik sendiri)
         │    GET /api/v1/documents/:id/download (publik + milik sendiri)
         │
Petugas ─┤──> [Semua yang Warga dapat, tanpa batasan horizontal] +
         │    GET /news/admin, GET /news/admin/:id
         │    POST /news, PUT /news/:id
         │    GET /announcements/admin, GET /announcements/admin/:id
         │    POST /announcements, PUT /announcements/:id
         │    GET /services/types/admin
         │    PATCH /services/requests/:id/status
         │    POST /complaints/:id/updates
         │    POST /documents, PUT /documents/:id
         │    GET /users, GET /users/:id
         │    GET /residents, GET /residents/:id
         │    PATCH /residents/:id/verify
         │    PUT /residents/:id
         │    PUT /village
         │
Admin ───┘──> [Semua yang Petugas dapat] +
              DELETE /news/:id
              DELETE /announcements/:id
              POST /services/types
              PUT /services/types/:id
              DELETE /services/types/:id
              DELETE /documents/:id
              PATCH /users/:id/status
              PATCH /users/:id/role
              DELETE /users/:id (kecuali self & admin terakhir)
```

---

## Referensi

- Implementasi middleware: `apps/api/src/middleware/auth.ts`.
- Penggunaan middleware di routes: `apps/api/src/routes/*.ts`.
- [API.md](./API.md) - dokumentasi endpoint dengan keterangan peran per endpoint.
- [SETUP.md](./SETUP.md) - akun demo untuk uji coba per peran.

---

**Akhir dokumen ACCESS-MATRIX.**

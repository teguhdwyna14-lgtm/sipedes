# API.md - Dokumentasi REST API SIPEDES

Dokumen ini menjelaskan seluruh endpoint REST API yang disediakan oleh backend SIPEDES. Endpoint dirancang mengikuti prinsip RESTful dan mengembalikan respons dalam format JSON konsisten.

---

## Daftar Isi

1. [Informasi Umum](#1-informasi-umum)
2. [Autentikasi](#2-autentikasi)
3. [Format Respons](#3-format-respons)
4. [Status Code](#4-status-code)
5. [Auth & Profil](#5-auth--profil)
6. [Public](#6-public)
7. [Berita](#7-berita)
8. [Pengumuman](#8-pengumuman)
9. [Layanan & Permohonan](#9-layanan--permohonan)
10. [Pengaduan](#10-pengaduan)
11. [Dokumen](#11-dokumen)
12. [Users](#12-users)
13. [Residents](#13-residents)
14. [Dashboard](#14-dashboard)
15. [Village Settings](#15-village-settings)

---

## 1. Informasi Umum

| Atribut | Nilai |
|---------|-------|
| Base URL | `http://localhost:4000/api/v1` |
| Format request body | `application/json` (untuk upload: `multipart/form-data`) |
| Format response | `application/json` |
| Encoding | UTF-8 |
| Health check | `GET http://localhost:4000/health` |

### Konvensi Nama Field

- Field bersifat `snake_case` (contoh: `created_at`, `user_id`).
- Timestamp menggunakan format ISO 8601 UTC (contoh: `2024-01-15T08:30:00.000Z`).
- Boolean direpresentasikan sebagai `0`/`1` di database MySQL, namun dikonversi ke `true`/`false` di respons API.

---

## 2. Autentikasi

Endpoint privat memerlukan **JWT Bearer Token** pada header:

```
Authorization: Bearer <token>
```

### Cara Mendapatkan Token

1. Lakukan request `POST /api/v1/auth/login` dengan email & password.
2. Server mengembalikan `data.token` (JWT).
3. Sertakan token pada setiap request privat di header `Authorization`.

### Masa Berlaku Token

- Default: **7 hari** (sesuai `JWT_EXPIRES_IN` di `.env`).
- Token kedaluwarsa akan mengembalikan `401 Unauthorized`.
- Klien harus melakukan login ulang untuk mendapatkan token baru.

### Rate Limiting

- Endpoint `POST /auth/login` dibatasi **5 percobaan per 15 menit** per IP (anti brute-force).
- Endpoint umum dibatasi **100 request per 15 menit** per IP.
- Jika terlampaui, response `429 Too Many Requests` akan dikembalikan.

---

## 3. Format Respons

### 3.1 Respons Sukses (single object)

```json
{
  "success": true,
  "message": "OK",
  "data": { /* payload */ }
}
```

### 3.2 Respons Paginated

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [ /* array of items */ ]
  },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### 3.3 Respons Error

```json
{
  "success": false,
  "message": "Deskripsi error umum",
  "errors": [
    { "field": "email", "message": "Email tidak valid" }
  ]
}
```

Field `errors` opsional, hanya ada pada error validasi (422).

### 3.4 Wrapper

Setiap respons mengikuti tipe `ApiResponse<T>` dari `@sipedes/shared`:

```typescript
interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ field?: string; message: string }>;
  meta?: { page: number; limit: number; total: number; totalPages: number };
}
```

---

## 4. Status Code

| Code | Nama | Penggunaan |
|------|------|------------|
| 200 | OK | Request sukses (GET, PUT, PATCH, DELETE). |
| 201 | Created | Resource baru berhasil dibuat (POST). |
| 400 | Bad Request | Body/parameter tidak valid secara umum. |
| 401 | Unauthorized | Token tidak ada, tidak valid, atau kedaluwarsa. |
| 403 | Forbidden | Terotentikasi tapi peran tidak diizinkan. |
| 404 | Not Found | Resource tidak ditemukan. |
| 409 | Conflict | Resource sudah ada (mis. email duplikat). |
| 422 | Unprocessable Entity | Validasi gagal (zod), `errors` diisi detail per field. |
| 429 | Too Many Requests | Rate limit terlampaui. |
| 500 | Internal Server Error | Error tak terduga di server. |

---

## 5. Auth & Profil

Endpoint autentikasi dan manajemen profil sendiri. Prefix: `/api/v1/auth`.

### 5.1 POST /auth/register

Registrasi warga baru. Akun berstatus `pending` hingga diverifikasi petugas/admin.

**Autentikasi:** Tidak diperlukan.

**Body:**
```json
{
  "email": "warga@desa.id",
  "password": "Warga1234",
  "full_name": "Nama Lengkap",
  "phone": "081234567890"
}
```

**Validasi (zod):**
- `email`: valid email, unik.
- `password`: min 8 karakter, kombinasi huruf & angka.
- `full_name`: 3-150 karakter.
- `phone`: opsional, 8-30 karakter.

**Contoh Request:**
```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"warga@desa.id",
    "password":"Warga1234",
    "full_name":"Budi Santoso",
    "phone":"081234567890"
  }'
```

**Contoh Response (201):**
```json
{
  "success": true,
  "message": "Registrasi berhasil. Akun menunggu verifikasi petugas.",
  "data": {
    "user": {
      "id": 8,
      "email": "warga@desa.id",
      "full_name": "Budi Santoso",
      "role": "warga",
      "status": "pending"
    }
  }
}
```

**Error umum:**
- `409 Conflict` - email sudah terdaftar.
- `422 Unprocessable Entity` - validasi gagal.

---

### 5.2 POST /auth/login

Login dengan email & password. Mengembalikan JWT token.

**Autentikasi:** Tidak diperlukan.

**Rate limit:** 5 request per 15 menit per IP.

**Body:**
```json
{
  "email": "admin@sipedes.local",
  "password": "Admin12345"
}
```

**Contoh Request:**
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sipedes.local","password":"Admin12345"}'
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "admin@sipedes.local",
      "full_name": "Administrator",
      "role": "admin",
      "status": "active",
      "last_login_at": "2024-01-15T08:30:00.000Z"
    }
  }
}
```

**Error umum:**
- `401 Unauthorized` - email/password salah.
- `403 Forbidden` - akun belum diverifikasi (`status=pending`) atau dinonaktifkan (`status=disabled`/`rejected`).
- `429 Too Many Requests` - rate limit terlampaui.

---

### 5.3 GET /auth/me

Mengambil profil pengguna yang sedang login.

**Autentikasi:** Wajib (Bearer token).

**Contoh Request:**
```bash
curl http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": 1,
    "email": "admin@sipedes.local",
    "full_name": "Administrator",
    "role": "admin",
    "status": "active",
    "phone": "(021) 1234567",
    "avatar_url": null,
    "last_login_at": "2024-01-15T08:30:00.000Z",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 5.4 PATCH /auth/me

Memperbarui profil sendiri (nama, telepon, avatar).

**Autentikasi:** Wajib (Bearer token).

**Body (semua field opsional):**
```json
{
  "full_name": "Nama Baru",
  "phone": "081234567890",
  "avatar_url": "https://example.com/avatar.png"
}
```

**Contoh Request:**
```bash
curl -X PATCH http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Budi Santoso","phone":"081298765432"}'
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "Profil diperbarui",
  "data": {
    "id": 8,
    "email": "budi@sipedes.local",
    "full_name": "Budi Santoso",
    "phone": "081298765432"
  }
}
```

---

### 5.5 POST /auth/change-password

Mengubah kata sandi pengguna yang sedang login.

**Autentikasi:** Wajib (Bearer token).

**Body:**
```json
{
  "current_password": "Warga1234",
  "new_password": "WargaBaru123"
}
```

**Validasi:**
- `current_password`: harus cocok dengan password tersimpan.
- `new_password`: min 8 karakter, kombinasi huruf & angka, berbeda dari current.

**Contoh Request:**
```bash
curl -X POST http://localhost:4000/api/v1/auth/change-password \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"current_password":"Warga1234","new_password":"WargaBaru123"}'
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "Kata sandi berhasil diubah"
}
```

**Error umum:**
- `401 Unauthorized` - `current_password` salah.
- `422 Unprocessable Entity` - `new_password` tidak memenuhi policy.

---

## 6. Public

Endpoint publik tanpa autentikasi. Prefix: `/api/v1/public`.

### 6.1 GET /public/news

Daftar berita yang sudah dipublikasi (status `published`).

**Autentikasi:** Tidak diperlukan.

**Query parameter:**
| Param | Tipe | Default | Deskripsi |
|-------|------|---------|-----------|
| `page` | int | 1 | Nomor halaman. |
| `limit` | int | 10 | Item per halaman (max 100). |
| `search` | string | - | Kata kunci pencarian pada judul/excerpt. |
| `category` | string | - | Filter kategori. |

**Contoh Request:**
```bash
curl "http://localhost:4000/api/v1/public/news?page=1&limit=5&category=pembangunan"
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [
      {
        "id": 1,
        "title": "Pembangunan Jalan Desa Selesai",
        "slug": "pembangunan-jalan-desa-selesai",
        "excerpt": "Jalan sepanjang 2 km...",
        "category": "pembangunan",
        "image_url": "/uploads/news/jalan.jpg",
        "published_at": "2024-01-10T10:00:00.000Z",
        "author_name": "Administrator"
      }
    ]
  },
  "meta": { "page": 1, "limit": 5, "total": 12, "totalPages": 3 }
}
```

---

### 6.2 GET /public/news/:slug

Detail berita berdasarkan slug. Hanya mengembalikan berita `published`.

**Autentikasi:** Tidak diperlukan.

**Path parameter:**
| Param | Deskripsi |
|-------|-----------|
| `slug` | Slug berita (unique). |

**Contoh Request:**
```bash
curl http://localhost:4000/api/v1/public/news/pembangunan-jalan-desa-selesai
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": 1,
    "title": "Pembangunan Jalan Desa Selesai",
    "slug": "pembangunan-jalan-desa-selesai",
    "excerpt": "Jalan sepanjang 2 km...",
    "content": "<p>Isi lengkap berita...</p>",
    "category": "pembangunan",
    "image_url": "/uploads/news/jalan.jpg",
    "status": "published",
    "author_id": 1,
    "author_name": "Administrator",
    "published_at": "2024-01-10T10:00:00.000Z",
    "created_at": "2024-01-10T09:00:00.000Z"
  }
}
```

**Error:** `404 Not Found` - slug tidak ditemukan atau berita belum dipublikasi.

---

### 6.3 GET /public/announcements

Daftar pengumuman yang sudah dipublikasi, diurutkan pinned dahulu.

**Autentikasi:** Tidak diperlukan.

**Query parameter:** `page`, `limit`, `search` (sama seperti berita).

**Contoh Request:**
```bash
curl "http://localhost:4000/api/v1/public/announcements?page=1&limit=10"
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [
      {
        "id": 1,
        "title": "Libur Hari Raya",
        "content": "Kantor desa libur...",
        "pinned": 1,
        "published_at": "2024-01-05T00:00:00.000Z",
        "expires_at": null
      }
    ]
  },
  "meta": { "page": 1, "limit": 10, "total": 3, "totalPages": 1 }
}
```

---

### 6.4 GET /public/service-types

Daftar jenis layanan surat yang aktif (`active=1`).

**Autentikasi:** Tidak diperlukan.

**Query parameter:** `page`, `limit`, `search`.

**Contoh Request:**
```bash
curl http://localhost:4000/api/v1/public/service-types
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [
      {
        "id": 1,
        "code": "SURAT_DOMISILI",
        "name": "Surat Keterangan Domisili",
        "description": "Surat keterangan tempat tinggal...",
        "requirements": "1. KTP\r\n2. KK",
        "processing_days": 2,
        "active": 1
      }
    ]
  },
  "meta": { "page": 1, "limit": 10, "total": 5, "totalPages": 1 }
}
```

---

### 6.5 GET /public/village

Mengambil pengaturan identitas desa (nama, alamat, sejarah, visi-misi, dll).

**Autentikasi:** Tidak diperlukan.

**Contoh Request:**
```bash
curl http://localhost:4000/api/v1/public/village
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": 1,
    "village_name": "Desa Sukamaju",
    "district": "Kec. Sukamaju",
    "regency": "Kab. Contoh",
    "province": "Jawa Barat",
    "address": "Jl. Raya Sukamaju No. 1",
    "postal_code": "12345",
    "phone": "(021) 1234567",
    "email": "info@sukamaju.id",
    "website": "https://sukamaju.id",
    "logo_url": null,
    "history": "Pada tahun 1850...",
    "vision": "Menjadi desa mandiri...",
    "mission": "1. Meningkatkan pelayanan...",
    "geography": "Luas wilayah 12 km persegi...",
    "potential": "Pertanian padi, palawija...",
    "working_hours": "Senin-Jumat: 08.00-15.00"
  }
}
```

---

### 6.6 GET /public/news-categories

Daftar kategori berita yang dipakai (untuk filter UI).

**Autentikasi:** Tidak diperlukan.

**Contoh Request:**
```bash
curl http://localhost:4000/api/v1/public/news-categories
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "OK",
  "data": ["pembangunan", "kegiatan", "pengumuman", "olahraga"]
}
```

---

### 6.7 GET /public/complaints/track

Pelacakan pengaduan publik berdasarkan tracking code. Tidak memerlukan login.

**Autentikasi:** Tidak diperlukan.

**Query parameter:**
| Param | Wajib | Deskripsi |
|-------|-------|-----------|
| `code` | Ya | Tracking code pengaduan (mis. `CMP-2024-0001`). |

**Contoh Request:**
```bash
curl "http://localhost:4000/api/v1/public/complaints/track?code=CMP-2024-0001"
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "complaint": {
      "id": 1,
      "tracking_code": "CMP-2024-0001",
      "title": "Jalan berlubang di RT 03",
      "description": "Jalan rusak...",
      "category": "infrastruktur",
      "status": "diproses",
      "is_anonymous": 0,
      "user_full_name": "Budi Santoso",
      "created_at": "2024-01-10T00:00:00.000Z"
    },
    "updates": [
      {
        "id": 1,
        "status": "diterima",
        "note": "Pengaduan diterima, akan ditindaklanjuti.",
        "created_at": "2024-01-10T01:00:00.000Z"
      },
      {
        "id": 2,
        "status": "diproses",
        "note": "Tim sedang survey lokasi.",
        "created_at": "2024-01-11T03:00:00.000Z"
      }
    ]
  }
}
```

> Jika `is_anonymous=1`, field `user_full_name` dan `user_id` disembunyikan.

**Error:** `400 Bad Request` (code kosong), `404 Not Found` (code tidak terdaftar).

---

## 7. Berita

Manajemen berita. Prefix: `/api/v1/news`.

> Catatan: Route `GET /`, `GET /:slug` bersifat publik. Route `/admin/*`, `POST /`, `PUT /:id` butuh peran **petugas/admin**. `DELETE /:id` butuh peran **admin**.

### 7.1 GET /news

Daftar berita yang sudah dipublikasi. Sama seperti `GET /public/news` tetapi path berbeda.

**Autentikasi:** Tidak diperlukan.

**Query parameter:** `page`, `limit`, `search`, `category`.

**Contoh Request:**
```bash
curl "http://localhost:4000/api/v1/news?page=1"
```

**Response:** Sama dengan `GET /public/news`.

---

### 7.2 GET /news/:slug

Detail berita by slug (hanya yang published).

**Autentikasi:** Tidak diperlukan.

**Contoh:** sama dengan `GET /public/news/:slug`.

---

### 7.3 GET /news/admin

Daftar semua berita (termasuk draft & archived), dengan filter.

**Autentikasi:** Petugas atau Admin.

**Query parameter:**
| Param | Deskripsi |
|-------|-----------|
| `page`, `limit` | Pagination. |
| `search` | Kata kunci. |
| `category` | Filter kategori. |
| `status` | `draft` / `published` / `archived`. |

**Contoh Request:**
```bash
curl http://localhost:4000/api/v1/news/admin?status=draft \
  -H "Authorization: Bearer <TOKEN>"
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [
      {
        "id": 5,
        "title": "Draft Berita Belum Publish",
        "slug": "draft-berita-belum-publish",
        "excerpt": null,
        "content": "...",
        "category": null,
        "status": "draft",
        "author_id": 1,
        "author_name": "Administrator",
        "published_at": null,
        "created_at": "2024-01-15T00:00:00.000Z"
      }
    ]
  },
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

---

### 7.4 GET /news/admin/:id

Detail berita by id (semua status).

**Autentikasi:** Petugas atau Admin.

**Contoh Request:**
```bash
curl http://localhost:4000/api/v1/news/admin/5 \
  -H "Authorization: Bearer <TOKEN>"
```

**Error:** `404 Not Found` - id tidak terdaftar.

---

### 7.5 POST /news

Membuat berita baru. Status default `draft` jika `published_at` tidak diisi.

**Autentikasi:** Petugas atau Admin.

**Body:**
```json
{
  "title": "Judul Berita",
  "excerpt": "Ringkasan singkat",
  "content": "<p>Isi lengkap berita (HTML diperbolehkan).</p>",
  "category": "kegiatan",
  "image_url": "/uploads/news/gambar.jpg",
  "status": "published"
}
```

**Validasi:**
- `title`: 5-255 karakter.
- `content`: min 10 karakter.
- `status`: `draft` / `published` / `archived`.

**Contoh Request:**
```bash
curl -X POST http://localhost:4000/api/v1/news \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Festival Panen Raya 2024",
    "excerpt":"Perayaan tahunan warga desa...",
    "content":"<p>Festival diadakan...</p>",
    "category":"kegiatan",
    "status":"published"
  }'
```

**Contoh Response (201):**
```json
{
  "success": true,
  "message": "Berita dibuat",
  "data": {
    "id": 6,
    "title": "Festival Panen Raya 2024",
    "slug": "festival-panen-raya-2024",
    "excerpt": "Perayaan tahunan warga desa...",
    "content": "<p>Festival diadakan...</p>",
    "category": "kegiatan",
    "status": "published",
    "author_id": 1,
    "published_at": "2024-01-15T08:30:00.000Z"
  }
}
```

---

### 7.6 PUT /news/:id

Memperbarui berita (semua field). Slug tidak boleh diubah manual (di-generate dari title).

**Autentikasi:** Petugas atau Admin.

**Body:** sama seperti POST, semua field opsional kecuali `title` & `content`.

**Contoh Request:**
```bash
curl -X PUT http://localhost:4000/api/v1/news/6 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Festival Panen Raya 2024 (Update)","status":"published"}'
```

**Contoh Response (200):** sama format dengan POST, data terupdate.

---

### 7.7 DELETE /news/:id

Menghapus berita. Tidak dapat di-undo.

**Autentikasi:** Admin saja.

**Contoh Request:**
```bash
curl -X DELETE http://localhost:4000/api/v1/news/6 \
  -H "Authorization: Bearer <TOKEN>"
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "Berita dihapus"
}
```

**Error:** `403 Forbidden` - bukan admin. `404 Not Found` - id tidak ada.

---

## 8. Pengumuman

Manajemen pengumuman. Prefix: `/api/v1/announcements`.

> Catatan: `GET /`, `GET /:id` publik. `/admin/*`, `POST /`, `PUT /:id` butuh petugas/admin. `DELETE /:id` butuh admin.

### 8.1 GET /announcements

Daftar pengumuman published.

**Autentikasi:** Tidak diperlukan.

**Query:** `page`, `limit`, `search`.

Sama dengan `GET /public/announcements`.

---

### 8.2 GET /announcements/:id

Detail pengumuman published by id.

**Autentikasi:** Tidak diperlukan.

**Contoh Request:**
```bash
curl http://localhost:4000/api/v1/announcements/1
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": 1,
    "title": "Libur Hari Raya",
    "content": "Kantor desa libur...",
    "status": "published",
    "pinned": 1,
    "author_id": 1,
    "published_at": "2024-01-05T00:00:00.000Z",
    "expires_at": null
  }
}
```

---

### 8.3 GET /announcements/admin

Daftar semua pengumuman (semua status).

**Autentikasi:** Petugas atau Admin.

**Query:** `page`, `limit`, `search`, `status`.

**Contoh Request:**
```bash
curl http://localhost:4000/api/v1/announcements/admin \
  -H "Authorization: Bearer <TOKEN>"
```

---

### 8.4 POST /announcements

Membuat pengumuman baru.

**Autentikasi:** Petugas atau Admin.

**Body:**
```json
{
  "title": "Pengumuman Baru",
  "content": "Isi pengumuman...",
  "status": "published",
  "pinned": true,
  "expires_at": "2024-12-31T23:59:59.000Z"
}
```

**Contoh Request:**
```bash
curl -X POST http://localhost:4000/api/v1/announcements \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Jadwal Posyandu","content":"Posyandu setiap Selasa pagi.","status":"published","pinned":true}'
```

**Contoh Response (201):**
```json
{
  "success": true,
  "message": "Pengumuman dibuat",
  "data": { "id": 4, "title": "Jadwal Posyandu", "status": "published", "pinned": 1 }
}
```

---

### 8.5 PUT /announcements/:id

Memperbarui pengumuman.

**Autentikasi:** Petugas atau Admin.

**Body:** sama dengan POST, semua field opsional.

**Contoh Request:**
```bash
curl -X PUT http://localhost:4000/api/v1/announcements/4 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"content":"Posyandu setiap Rabu pagi."}'
```

---

### 8.6 DELETE /announcements/:id

Menghapus pengumuman.

**Autentikasi:** Admin saja.

**Contoh Request:**
```bash
curl -X DELETE http://localhost:4000/api/v1/announcements/4 \
  -H "Authorization: Bearer <TOKEN>"
```

**Contoh Response (200):**
```json
{ "success": true, "message": "Pengumuman dihapus" }
```

---

## 9. Layanan & Permohonan

Manajemen jenis layanan surat dan permohonan dari warga. Prefix: `/api/v1/services`.

### 9.1 GET /services/types

Daftar jenis layanan aktif (publik).

**Autentikasi:** Tidak diperlukan.

**Query:** `page`, `limit`, `search`.

Sama dengan `GET /public/service-types`.

---

### 9.2 GET /services/types/admin

Daftar semua jenis layanan (aktif & non-aktif).

**Autentikasi:** Petugas atau Admin.

**Contoh Request:**
```bash
curl http://localhost:4000/api/v1/services/types/admin \
  -H "Authorization: Bearer <TOKEN>"
```

---

### 9.3 POST /services/types

Membuat jenis layanan baru.

**Autentikasi:** Admin saja.

**Body:**
```json
{
  "code": "SURAT_NIKAH",
  "name": "Surat Pengantar Nikah",
  "description": "Untuk mengurus persyaratan pernikahan.",
  "requirements": "1. KTP\r\n2. KK\r\n3. Pas foto",
  "processing_days": 3,
  "active": true
}
```

**Contoh Request:**
```bash
curl -X POST http://localhost:4000/api/v1/services/types \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "code":"SURAT_NIKAH",
    "name":"Surat Pengantar Nikah",
    "description":"Untuk pernikahan.",
    "requirements":"1. KTP\r\n2. KK",
    "processing_days":3,
    "active":true
  }'
```

**Contoh Response (201):**
```json
{
  "success": true,
  "message": "Jenis layanan dibuat",
  "data": { "id": 6, "code": "SURAT_NIKAH", "name": "Surat Pengantar Nikah", "active": 1 }
}
```

---

### 9.4 PUT /services/types/:id

Memperbarui jenis layanan.

**Autentikasi:** Admin saja.

**Contoh Request:**
```bash
curl -X PUT http://localhost:4000/api/v1/services/types/6 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"processing_days":5,"active":false}'
```

---

### 9.5 DELETE /services/types/:id

Menghapus jenis layanan. Gagal jika masih ada permohonan terkait.

**Autentikasi:** Admin saja.

**Contoh Request:**
```bash
curl -X DELETE http://localhost:4000/api/v1/services/types/6 \
  -H "Authorization: Bearer <TOKEN>"
```

**Error:** `409 Conflict` - masih ada service request yang memakai tipe ini.

---

### 9.6 GET /services/requests

Daftar permohonan layanan. Warga hanya melihat milik sendiri, staff melihat semua.

**Autentikasi:** Wajib (semua peran).

**Query parameter:**
| Param | Deskripsi |
|-------|-----------|
| `page`, `limit` | Pagination. |
| `status` | `diajukan` / `dalam_pemeriksaan` / `perlu_perbaikan` / `disetujui` / `ditolak` / `selesai`. |
| `service_type_id` | Filter jenis layanan. |

**Contoh Request:**
```bash
curl http://localhost:4000/api/v1/services/requests?status=diajukan \
  -H "Authorization: Bearer <TOKEN>"
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [
      {
        "id": 1,
        "request_number": "REQ-2024-0001",
        "service_type_id": 1,
        "service_type_name": "Surat Keterangan Domisili",
        "user_id": 3,
        "user_name": "Budi Santoso",
        "purpose": "Untuk persyaratan kerja.",
        "status": "diajukan",
        "created_at": "2024-01-15T08:00:00.000Z"
      }
    ]
  },
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

---

### 9.7 GET /services/requests/:id

Detail permohonan by id. Warga hanya bisa akses milik sendiri.

**Autentikasi:** Wajib. Warga - cek kepemilikan, Petugas/Admin - bebas.

**Contoh Request:**
```bash
curl http://localhost:4000/api/v1/services/requests/1 \
  -H "Authorization: Bearer <TOKEN>"
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": 1,
    "request_number": "REQ-2024-0001",
    "service_type_id": 1,
    "service_type_name": "Surat Keterangan Domisili",
    "user_id": 3,
    "user_name": "Budi Santoso",
    "purpose": "Untuk persyaratan kerja.",
    "notes": null,
    "status": "dalam_pemeriksaan",
    "rejection_reason": null,
    "processed_by_id": 2,
    "processed_at": "2024-01-15T10:00:00.000Z",
    "completed_at": null,
    "attachments": [
      { "id": 1, "file_name": "ktp.jpg", "file_size": 245678, "mime_type": "image/jpeg" }
    ],
    "events": [
      { "id": 1, "from_status": null, "to_status": "diajukan", "note": null, "created_at": "2024-01-15T08:00:00.000Z" },
      { "id": 2, "from_status": "diajukan", "to_status": "dalam_pemeriksaan", "note": "Sedang diperiksa", "created_at": "2024-01-15T10:00:00.000Z" }
    ]
  }
}
```

**Error:** `403 Forbidden` - warga mencoba akses permohonan milik user lain.

---

### 9.8 POST /services/requests

Membuat permohonan baru. Nomor permohonan auto-generated.

**Autentikasi:** Wajib (semua peran).

**Body:**
```json
{
  "service_type_id": 1,
  "purpose": "Untuk persyaratan kerja di PT ABC.",
  "notes": "Mohon diproses secepatnya."
}
```

**Contoh Request:**
```bash
curl -X POST http://localhost:4000/api/v1/services/requests \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"service_type_id":1,"purpose":"Untuk persyaratan kerja di PT ABC."}'
```

**Contoh Response (201):**
```json
{
  "success": true,
  "message": "Permohonan dibuat",
  "data": {
    "id": 2,
    "request_number": "REQ-2024-0002",
    "service_type_id": 1,
    "status": "diajukan",
    "created_at": "2024-01-15T09:00:00.000Z"
  }
}
```

---

### 9.9 PATCH /services/requests/:id/status

Memperbarui status permohonan. Mencatat event di `service_request_events`.

**Autentikasi:** Petugas atau Admin.

**Body:**
```json
{
  "status": "disetujui",
  "note": "Dokumen lengkap, disetujui.",
  "rejection_reason": null
}
```

**Validasi:** status harus salah satu dari enum.

**Contoh Request:**
```bash
curl -X PATCH http://localhost:4000/api/v1/services/requests/2/status \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"disetujui","note":"Disetujui, surat dapat diambil."}'
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "Status permohonan diperbarui",
  "data": {
    "id": 2,
    "status": "disetujui",
    "processed_by_id": 2,
    "processed_at": "2024-01-15T11:00:00.000Z"
  }
}
```

---

### 9.10 POST /services/requests/:id/attachments

Mengunggah lampiran ke permohonan. Form-data dengan field `file`.

**Autentikasi:** Wajib. Warga - hanya untuk permohonan sendiri, Petugas/Admin - bebas.

**Content-Type:** `multipart/form-data`.

**Form field:**
| Field | Tipe | Wajib | Deskripsi |
|-------|------|-------|-----------|
| `file` | file | Ya | File lampiran. Max 5MB. Allowed: JPEG, PNG, PDF. |

**Contoh Request:**
```bash
curl -X POST http://localhost:4000/api/v1/services/requests/2/attachments \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@/path/to/ktp.jpg"
```

**Contoh Response (201):**
```json
{
  "success": true,
  "message": "Lampiran ditambahkan",
  "data": {
    "id": 5,
    "request_id": 2,
    "file_name": "ktp.jpg",
    "file_path": "/uploads/requests/ktp-1234.jpg",
    "mime_type": "image/jpeg",
    "file_size": 245678,
    "uploaded_at": "2024-01-15T09:30:00.000Z"
  }
}
```

**Error:** `413 Payload Too Large` - file melebihi `MAX_UPLOAD_MB`. `415 Unsupported Media Type` - tipe MIME tidak diizinkan.

---

## 10. Pengaduan

Pengaduan dari warga. Prefix: `/api/v1/complaints`.

> Catatan: `authenticate` sudah diterapkan di level router `/complaints`. Route publik untuk tracking ada di `/public/complaints/track`.

### 10.1 GET /complaints

Daftar pengaduan. Warga melihat milik sendiri, staff melihat semua.

**Autentikasi:** Wajib.

**Query:** `page`, `limit`, `status`, `category`.

**Contoh Request:**
```bash
curl http://localhost:4000/api/v1/complaints \
  -H "Authorization: Bearer <TOKEN>"
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [
      {
        "id": 1,
        "tracking_code": "CMP-2024-0001",
        "title": "Jalan berlubang di RT 03",
        "category": "infrastruktur",
        "status": "diproses",
        "is_anonymous": 0,
        "created_at": "2024-01-10T00:00:00.000Z"
      }
    ]
  },
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

---

### 10.2 GET /complaints/:id

Detail pengaduan by id. Warga hanya bisa akses milik sendiri.

**Autentikasi:** Wajib (cek kepemilikan untuk warga).

**Contoh Request:**
```bash
curl http://localhost:4000/api/v1/complaints/1 \
  -H "Authorization: Bearer <TOKEN>"
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": 1,
    "tracking_code": "CMP-2024-0001",
    "user_id": 3,
    "user_name": "Budi Santoso",
    "title": "Jalan berlubang di RT 03",
    "description": "Jalan rusak parah...",
    "category": "infrastruktur",
    "status": "diproses",
    "is_anonymous": 0,
    "created_at": "2024-01-10T00:00:00.000Z",
    "updates": [
      { "id": 1, "status": "diterima", "note": "Diterima", "created_at": "2024-01-10T01:00:00.000Z" }
    ]
  }
}
```

---

### 10.3 POST /complaints

Membuat pengaduan baru. Tracking code auto-generated.

**Autentikasi:** Wajib (warga, petugas, admin).

**Body:**
```json
{
  "title": "Jalan berlubang di RT 03",
  "description": "Jalan rusak parah sepanjang 200m di RT 03 RW 02, sangat membahayakan pengendara.",
  "category": "infrastruktur",
  "is_anonymous": false
}
```

**Contoh Request:**
```bash
curl -X POST http://localhost:4000/api/v1/complaints \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Jalan berlubang di RT 03",
    "description":"Jalan rusak parah...",
    "category":"infrastruktur",
    "is_anonymous":false
  }'
```

**Contoh Response (201):**
```json
{
  "success": true,
  "message": "Pengaduan dibuat",
  "data": {
    "id": 2,
    "tracking_code": "CMP-2024-0002",
    "title": "Jalan berlubang di RT 03",
    "status": "baru",
    "created_at": "2024-01-15T08:00:00.000Z"
  }
}
```

---

### 10.4 POST /complaints/:id/updates

Menambah update/tanggapan terhadap pengaduan. Mencatat di `complaint_updates`.

**Autentikasi:** Petugas atau Admin.

**Body:**
```json
{
  "status": "selesai",
  "note": "Jalan sudah diperbaiki oleh tim PUPR."
}
```

**Status yang valid:** `baru`, `diterima`, `diproses`, `selesai`, `ditutup`.

**Contoh Request:**
```bash
curl -X POST http://localhost:4000/api/v1/complaints/2/updates \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"selesai","note":"Sudah diperbaiki."}'
```

**Contoh Response (201):**
```json
{
  "success": true,
  "message": "Update pengaduan ditambahkan",
  "data": {
    "id": 5,
    "complaint_id": 2,
    "status": "selesai",
    "note": "Sudah diperbaiki.",
    "created_by_id": 2,
    "created_at": "2024-01-16T08:00:00.000Z"
  }
}
```

---

## 11. Dokumen

Arsip dokumen. Prefix: `/api/v1/documents`.

> Catatan: `authenticate` sudah diterapkan di level router.

### 11.1 GET /documents

Daftar dokumen. Warga: dokumen publik + milik sendiri. Staff: semua.

**Autentikasi:** Wajib.

**Query:** `page`, `limit`, `category`, `search`.

**Contoh Request:**
```bash
curl http://localhost:4000/api/v1/documents \
  -H "Authorization: Bearer <TOKEN>"
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [
      {
        "id": 1,
        "title": "Peraturan Desa 01/2024",
        "category": "peraturan",
        "file_name": "perdes-01-2024.pdf",
        "file_size": 1234567,
        "is_public": 1,
        "owner_id": null,
        "uploaded_by_id": 1,
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ]
  },
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

---

### 11.2 GET /documents/:id

Metadata dokumen by id. Warga hanya bisa akses dokumen publik atau milik sendiri.

**Autentikasi:** Wajib (cek akses).

**Contoh Request:**
```bash
curl http://localhost:4000/api/v1/documents/1 \
  -H "Authorization: Bearer <TOKEN>"
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": 1,
    "title": "Peraturan Desa 01/2024",
    "description": "Peraturan tentang tata tertib warga.",
    "category": "peraturan",
    "file_name": "perdes-01-2024.pdf",
    "file_path": "/uploads/documents/perdes-01-2024.pdf",
    "mime_type": "application/pdf",
    "file_size": 1234567,
    "is_public": 1,
    "owner_id": null,
    "request_id": null,
    "uploaded_by_id": 1,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 11.3 GET /documents/:id/download

Mengunduh file dokumen (binary stream). Warga hanya bisa download dokumen publik/milik sendiri.

**Autentikasi:** Wajib (cek akses).

**Response:** binary file (`Content-Type: application/octet-stream` atau MIME sesuai file).

**Contoh Request:**
```bash
curl -o perdes.pdf http://localhost:4000/api/v1/documents/1/download \
  -H "Authorization: Bearer <TOKEN>"
```

**Response:** file binary. Status 200 jika sukses.

**Error:** `403 Forbidden` - tidak punya akses. `404 Not Found` - id tidak ada atau file hilang dari disk.

---

### 11.4 POST /documents

Upload dokumen baru. Form-data.

**Autentikasi:** Petugas atau Admin.

**Content-Type:** `multipart/form-data`.

**Form field:**
| Field | Tipe | Wajib | Deskripsi |
|-------|------|-------|-----------|
| `file` | file | Ya | File. Max 5MB. |
| `title` | string | Ya | Judul dokumen. |
| `description` | string | Tidak | Deskripsi. |
| `category` | string | Tidak | Kategori. |
| `is_public` | boolean | Tidak | Default `false`. |
| `owner_id` | int | Tidak | ID warga pemilik (jika privat). |
| `request_id` | int | Tidak | ID permohonan terkait (jika ada). |

**Contoh Request:**
```bash
curl -X POST http://localhost:4000/api/v1/documents \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@/path/to/perdes.pdf" \
  -F "title=Peraturan Desa 02/2024" \
  -F "category=peraturan" \
  -F "is_public=true"
```

**Contoh Response (201):**
```json
{
  "success": true,
  "message": "Dokumen diunggah",
  "data": {
    "id": 2,
    "title": "Peraturan Desa 02/2024",
    "file_name": "perdes-02-2024.pdf",
    "file_path": "/uploads/documents/perdes-02-2024-abc123.pdf",
    "mime_type": "application/pdf",
    "file_size": 2345678,
    "is_public": 1,
    "uploaded_by_id": 1
  }
}
```

---

### 11.5 PUT /documents/:id

Memperbarui metadata dokumen (bukan file-nya).

**Autentikasi:** Petugas atau Admin.

**Body:**
```json
{
  "title": "Judul Baru",
  "description": "Deskripsi baru",
  "category": "formulir",
  "is_public": true
}
```

**Contoh Request:**
```bash
curl -X PUT http://localhost:4000/api/v1/documents/2 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Peraturan Desa 02/2024 (Revisi)","is_public":true}'
```

---

### 11.6 DELETE /documents/:id

Menghapus dokumen (file fisik juga dihapus dari disk).

**Autentikasi:** Admin saja.

**Contoh Request:**
```bash
curl -X DELETE http://localhost:4000/api/v1/documents/2 \
  -H "Authorization: Bearer <TOKEN>"
```

**Contoh Response (200):**
```json
{ "success": true, "message": "Dokumen dihapus" }
```

---

## 12. Users

Manajemen pengguna oleh staff/admin. Prefix: `/api/v1/users`.

> Catatan: `authenticate` sudah diterapkan di level router. Endpoint `/users` seluruhnya butuh staff/admin.

### 12.1 GET /users

Daftar semua user dengan pagination & filter.

**Autentikasi:** Petugas atau Admin.

**Query:** `page`, `limit`, `role`, `status`, `search`.

**Contoh Request:**
```bash
curl http://localhost:4000/api/v1/users?role=warga&status=active \
  -H "Authorization: Bearer <TOKEN>"
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [
      {
        "id": 3,
        "email": "budi@sipedes.local",
        "full_name": "Budi Santoso",
        "role": "warga",
        "status": "active",
        "phone": "081234567890",
        "last_login_at": "2024-01-15T08:00:00.000Z",
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ]
  },
  "meta": { "page": 1, "limit": 10, "total": 5, "totalPages": 1 }
}
```

---

### 12.2 GET /users/:id

Detail user by id.

**Autentikasi:** Petugas atau Admin.

**Contoh Request:**
```bash
curl http://localhost:4000/api/v1/users/3 \
  -H "Authorization: Bearer <TOKEN>"
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": 3,
    "email": "budi@sipedes.local",
    "full_name": "Budi Santoso",
    "role": "warga",
    "status": "active",
    "phone": "081234567890",
    "avatar_url": null,
    "last_login_at": "2024-01-15T08:00:00.000Z",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 12.3 PATCH /users/:id/status

Memperbarui status user.

**Autentikasi:** Admin saja.

**Body:**
```json
{ "status": "disabled" }
```

**Status valid:** `pending`, `active`, `rejected`, `disabled`.

**Contoh Request:**
```bash
curl -X PATCH http://localhost:4000/api/v1/users/3/status \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"disabled"}'
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "Status user diperbarui",
  "data": { "id": 3, "status": "disabled" }
}
```

> Pencegahan: admin terakhir tidak boleh dinonaktifkan/dihapus.

---

### 12.4 PATCH /users/:id/role

Memperbarui peran user.

**Autentikasi:** Admin saja.

**Body:**
```json
{ "role": "petugas" }
```

**Role valid:** `warga`, `petugas`, `admin`.

**Contoh Request:**
```bash
curl -X PATCH http://localhost:4000/api/v1/users/3/role \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"role":"petugas"}'
```

---

### 12.5 DELETE /users/:id

Menghapus user beserta data terkait (resident_profile, service_requests, complaints). Cascade delete.

**Autentikasi:** Admin saja.

**Contoh Request:**
```bash
curl -X DELETE http://localhost:4000/api/v1/users/3 \
  -H "Authorization: Bearer <TOKEN>"
```

**Contoh Response (200):**
```json
{ "success": true, "message": "User dihapus" }
```

**Error:**
- `403 Forbidden` - bukan admin, atau mencoba menghapus admin terakhir.
- `409 Conflict` - tidak boleh hapus diri sendiri.

---

## 13. Residents

Manajemen profil warga. Prefix: `/api/v1/residents`.

> Catatan: `authenticate` sudah diterapkan di level router. Semua endpoint butuh staff/admin.

### 13.1 GET /residents

Daftar profil warga (data sensitif seperti NIK di-mask sebagian).

**Autentikasi:** Petugas atau Admin.

**Query:** `page`, `limit`, `status`, `rt`, `rw`, `search`.

**Contoh Request:**
```bash
curl http://localhost:4000/api/v1/residents?status=pending \
  -H "Authorization: Bearer <TOKEN>"
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [
      {
        "id": 7,
        "user_id": 8,
        "nik_masked": "32**********1234",
        "full_name": "Deden Sudarsono",
        "gender": "L",
        "rt": "03",
        "rw": "02",
        "status": "pending",
        "verified_by_id": null,
        "verified_at": null,
        "created_at": "2024-01-15T00:00:00.000Z"
      }
    ]
  },
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

---

### 13.2 GET /residents/:id

Detail profil warga (data lengkap, termasuk NIK).

**Autentikasi:** Petugas atau Admin.

**Contoh Request:**
```bash
curl http://localhost:4000/api/v1/residents/7 \
  -H "Authorization: Bearer <TOKEN>"
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": 7,
    "user_id": 8,
    "nik": "3210010101900001",
    "kk_number": "3210010101900001",
    "full_name": "Deden Sudarsono",
    "birth_date": "1990-01-01",
    "gender": "L",
    "address": "Jl. Mawar No. 5",
    "rt": "03",
    "rw": "02",
    "phone": "081234567890",
    "occupation": "Petani",
    "status": "pending",
    "verified_by_id": null,
    "verified_at": null,
    "rejection_note": null,
    "created_at": "2024-01-15T00:00:00.000Z"
  }
}
```

---

### 13.3 PATCH /residents/:id/verify

Verifikasi atau tolak warga. Setelah verifikasi sukses, `users.status` juga di-update ke `active`.

**Autentikasi:** Petugas atau Admin.

**Body:**
```json
{
  "status": "active"
}
```

Untuk menolak:
```json
{
  "status": "rejected",
  "rejection_note": "NIK tidak terdaftar di dukuh setempat."
}
```

**Status valid:** `active`, `rejected`. (Untuk re-verify setelah ditolak, bisa kembali ke `active`.)

**Contoh Request:**
```bash
curl -X PATCH http://localhost:4000/api/v1/residents/7/verify \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"active"}'
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "Warga diverifikasi",
  "data": {
    "id": 7,
    "status": "active",
    "verified_by_id": 2,
    "verified_at": "2024-01-15T10:00:00.000Z"
  }
}
```

---

### 13.4 PUT /residents/:id

Memperbarui data profil warga.

**Autentikasi:** Petugas atau Admin.

**Body:**
```json
{
  "nik": "3210010101900001",
  "kk_number": "3210010101900001",
  "full_name": "Deden Sudarsono",
  "birth_date": "1990-01-01",
  "gender": "L",
  "address": "Jl. Mawar No. 5",
  "rt": "03",
  "rw": "02",
  "phone": "081234567890",
  "occupation": "Petani"
}
```

**Contoh Request:**
```bash
curl -X PUT http://localhost:4000/api/v1/residents/7 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"occupation":"Wiraswasta","phone":"081299988877"}'
```

---

## 14. Dashboard

Statistik dashboard berbasis peran. Prefix: `/api/v1/dashboard`.

> Catatan: `authenticate` sudah diterapkan di level router.

### 14.1 GET /dashboard/stats

Statistik ringkasan berbasis peran pengguna yang login.

**Autentikasi:** Wajib (semua peran).

**Perilaku berbasis peran:**
- **Warga**: statistik milik sendiri (jumlah permohonan, pengaduan, dokumen).
- **Petugas/Admin**: statistik global (total warga pending, total permohonan baru, total pengaduan baru, total berita, dll).

**Contoh Request:**
```bash
curl http://localhost:4000/api/v1/dashboard/stats \
  -H "Authorization: Bearer <TOKEN>"
```

**Contoh Response (200) - Admin:**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "totalUsers": 7,
    "totalResidents": 7,
    "pendingResidents": 1,
    "totalNews": 5,
    "totalAnnouncements": 3,
    "totalServiceTypes": 5,
    "totalServiceRequests": 0,
    "pendingServiceRequests": 0,
    "totalComplaints": 0,
    "newComplaints": 0,
    "totalDocuments": 1
  }
}
```

**Contoh Response (200) - Warga:**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "myServiceRequests": 0,
    "myActiveRequests": 0,
    "myComplaints": 0,
    "myDocuments": 0,
    "verificationStatus": "active"
  }
}
```

---

## 15. Village Settings

Pengaturan identitas desa. Prefix: `/api/v1/village`.

> Route ini terdaftar di router campuran (publik untuk GET, privat untuk PUT).

### 15.1 GET /village

Mengambil pengaturan desa. Jika belum ada, akan dibuat default.

**Autentikasi:** Tidak diperlukan.

**Contoh Request:**
```bash
curl http://localhost:4000/api/v1/village
```

**Contoh Response (200):** sama dengan `GET /public/village`.

---

### 15.2 PUT /village

Memperbarui pengaturan desa. Mencatat activity log.

**Autentikasi:** Petugas atau Admin.

**Body:** salah satu / beberapa field berikut:
```json
{
  "village_name": "Desa Sukamaju",
  "district": "Kec. Sukamaju",
  "regency": "Kab. Sukamaju",
  "province": "Jawa Barat",
  "address": "Jl. Raya No. 1",
  "postal_code": "12345",
  "phone": "(021) 1234567",
  "email": "info@sukamaju.id",
  "website": "https://sukamaju.id",
  "logo_url": "/uploads/logo.png",
  "history": "Pada tahun 1850...",
  "vision": "Menjadi desa mandiri...",
  "mission": "1. ...",
  "geography": "Luas 12 km persegi.",
  "potential": "Pertanian padi.",
  "working_hours": "Senin-Jumat 08-15",
  "map_embed": "<iframe src='...'></iframe>"
}
```

Field `village_name` wajib diisi.

**Contoh Request:**
```bash
curl -X PUT http://localhost:4000/api/v1/village \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"village_name":"Desa Sukamaju","vision":"Menjadi desa mandiri tahun 2030"}'
```

**Contoh Response (200):**
```json
{
  "success": true,
  "message": "Pengaturan desa diperbarui",
  "data": { /* seluruh field pengaturan desa */ }
}
```

---

## Lampiran: Ringkasan Endpoint

### Endpoint Publik (tanpa autentikasi)

| Metode | Path | Deskripsi |
|--------|------|-----------|
| GET | `/health` | Health check server. |
| GET | `/api/v1/public/news` | List berita published. |
| GET | `/api/v1/public/news/:slug` | Detail berita by slug. |
| GET | `/api/v1/public/announcements` | List pengumuman published. |
| GET | `/api/v1/public/service-types` | List jenis layanan aktif. |
| GET | `/api/v1/public/village` | Pengaturan desa. |
| GET | `/api/v1/public/news-categories` | List kategori berita. |
| GET | `/api/v1/public/complaints/track` | Tracking pengaduan. |
| GET | `/api/v1/news` | Alias berita published. |
| GET | `/api/v1/news/:slug` | Alias detail berita. |
| GET | `/api/v1/announcements` | Alias pengumuman published. |
| GET | `/api/v1/announcements/:id` | Alias detail pengumuman. |
| GET | `/api/v1/services/types` | Alias jenis layanan aktif. |
| GET | `/api/v1/village` | Alias pengaturan desa. |
| POST | `/api/v1/auth/register` | Registrasi warga. |
| POST | `/api/v1/auth/login` | Login. |

### Endpoint Privat (butuh autentikasi)

| Metode | Path | Peran Minimal |
|--------|------|---------------|
| GET | `/api/v1/auth/me` | Warga |
| PATCH | `/api/v1/auth/me` | Warga |
| POST | `/api/v1/auth/change-password` | Warga |
| GET | `/api/v1/news/admin` | Petugas |
| GET | `/api/v1/news/admin/:id` | Petugas |
| POST | `/api/v1/news` | Petugas |
| PUT | `/api/v1/news/:id` | Petugas |
| DELETE | `/api/v1/news/:id` | Admin |
| GET | `/api/v1/announcements/admin` | Petugas |
| GET | `/api/v1/announcements/admin/:id` | Petugas |
| POST | `/api/v1/announcements` | Petugas |
| PUT | `/api/v1/announcements/:id` | Petugas |
| DELETE | `/api/v1/announcements/:id` | Admin |
| GET | `/api/v1/services/types/admin` | Petugas |
| POST | `/api/v1/services/types` | Admin |
| PUT | `/api/v1/services/types/:id` | Admin |
| DELETE | `/api/v1/services/types/:id` | Admin |
| GET | `/api/v1/services/requests` | Warga |
| GET | `/api/v1/services/requests/:id` | Warga |
| POST | `/api/v1/services/requests` | Warga |
| PATCH | `/api/v1/services/requests/:id/status` | Petugas |
| POST | `/api/v1/services/requests/:id/attachments` | Warga |
| GET | `/api/v1/complaints` | Warga |
| GET | `/api/v1/complaints/:id` | Warga |
| POST | `/api/v1/complaints` | Warga |
| POST | `/api/v1/complaints/:id/updates` | Petugas |
| GET | `/api/v1/documents` | Warga |
| GET | `/api/v1/documents/:id` | Warga |
| GET | `/api/v1/documents/:id/download` | Warga |
| POST | `/api/v1/documents` | Petugas |
| PUT | `/api/v1/documents/:id` | Petugas |
| DELETE | `/api/v1/documents/:id` | Admin |
| GET | `/api/v1/users` | Petugas |
| GET | `/api/v1/users/:id` | Petugas |
| PATCH | `/api/v1/users/:id/status` | Admin |
| PATCH | `/api/v1/users/:id/role` | Admin |
| DELETE | `/api/v1/users/:id` | Admin |
| GET | `/api/v1/residents` | Petugas |
| GET | `/api/v1/residents/:id` | Petugas |
| PATCH | `/api/v1/residents/:id/verify` | Petugas |
| PUT | `/api/v1/residents/:id` | Petugas |
| GET | `/api/v1/dashboard/stats` | Warga |
| PUT | `/api/v1/village` | Petugas |

---

## Referensi Lain

- [SETUP.md](./SETUP.md) - panduan instalasi.
- [ERD.md](./ERD.md) - diagram basis data.
- [ACCESS-MATRIX.md](./ACCESS-MATRIX.md) - matriks hak akses detail.
- [TESTING.md](./TESTING.md) - hasil pengujian API.

---

**Akhir dokumen API.**

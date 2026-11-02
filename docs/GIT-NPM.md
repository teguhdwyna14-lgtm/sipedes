# GIT-NPM.md - Panduan Git & NPM untuk Tim SIPEDES

Dokumen ini adalah referensi lengkap penggunaan Git dan NPM dalam proyek SIPEDES. Ditujukan untuk anggota tim pengembang agar bekerja secara kolaboratif dengan workflow yang konsisten.

---

## Daftar Isi

1. [Git Basics](#1-git-basics)
2. [Konfigurasi Git](#2-konfigurasi-git)
3. [Remote GitHub](#3-remote-github)
4. [Branch Workflow](#4-branch-workflow)
5. [Pull Request](#5-pull-request)
6. [Penyelesaian Konflik](#6-penyelesaian-konflik)
7. [.gitignore](#7-gitignore)
8. [Commit Message Convention](#8-commit-message-convention)
9. [NPM Workspaces](#9-npm-workspaces)
10. [NPM Scripts](#10-npm-scripts)
11. [Versioning](#11-versioning)
12. [Cheat Sheet](#12-cheat-sheet)

---

## 1. Git Basics

Git adalah distributed version control system yang melacak perubahan kode sumber. Berikut perintah dasar yang sering dipakai.

### 1.1 Inisialisasi Repository

```bash
# Buat repository baru di folder saat ini
git init

# Atau clone repository yang sudah ada (lebih umum di tim)
git clone https://github.com/username/sipedes.git
cd sipedes
```

### 1.2 Cek Status

```bash
git status              # lihat file yang berubah, staged, atau untracked
git status -s           # format singkat
git diff                # lihat perubahan yang belum di-stage
git diff --staged       # lihat perubahan yang sudah di-stage
```

### 1.3 Menambahkan Perubahan (Staging)

```bash
git add file.txt        # tambah satu file
git add .               # tambah SEMUA perubahan di current dir
git add -p              # tambah perubahan secara interaktif (patch mode)
git add -A              # tambah semua (termasuk deletions) di seluruh repo
```

### 1.4 Commit

```bash
git commit -m "feat: tambah halaman berita"          # commit dengan pesan
git commit -am "fix: perbaiki login redirect"        # add + commit untuk file yang sudah tracked
git commit --amend                                     # ubah commit terakhir (jika belum push)
git commit --amend --no-edit                           # amend tanpa ubah pesan
```

### 1.5 Branch

```bash
git branch                          # daftar branch lokal
git branch -a                       # daftar semua branch (lokal + remote)
git branch feature/berita-detail    # buat branch baru
git switch feature/berita-detail    # pindah ke branch
git switch -c feature/berita-detail # buat + pindah sekaligus
git checkout main                   # alternatif: pindah ke main
git branch -d feature/berita-detail # hapus branch (jika sudah di-merge)
git branch -D feature/berita-detail # hapus branch paksa (belum di-merge)
```

### 1.6 Merge

```bash
# Pastikan di branch target (mis. main)
git switch main
git pull origin main

# Merge branch fitur ke main
git merge feature/berita-detail

# Jika ada konflik, selesaikan manual lalu:
git add .
git commit -m "merge: integrate feature/berita-detail"
```

### 1.7 Log

```bash
git log                     # daftar commit
git log --oneline           # satu baris per commit
git log --oneline -10       # 10 commit terakhir
git log --graph --oneline --all    # grafik branch
git log -p file.txt         # log + diff per commit untuk file tertentu
git log --author="Nama"     # filter by author
```

### 1.8 Undo

```bash
git restore file.txt                 # buang perubahan yang belum di-stage
git restore --staged file.txt        # unstage (tapi tetap simpan perubahan)
git reset --soft HEAD~1              # undo commit terakhir, simpan perubahan di staging
git reset --mixed HEAD~1             # undo commit terakhir, simpan perubahan di working dir
git reset --hard HEAD~1              # undo commit terakhir, HAPUS perubahan (bahaya!)
git revert <commit-hash>             # buat commit baru yang membatalkan commit lama
```

---

## 2. Konfigurasi Git

### 2.1 Konfigurasi Global (Sekali untuk Semua Repository)

```bash
# Identitas (WAJIB)
git config --global user.name "Nama Lengkap"
git config --global user.email "email@anda.com"

# Editor default
git config --global core.editor "code --wait"   # VS Code
git config --global core.editor "nano"          # nano
git config --global core.editor "vim"           # vim

# Branch default
git config --global init.defaultBranch main

# Behavior pull
git config --global pull.rebase false           # merge (default)
git config --global pull.rebase true            # rebase

# Line endings (penting untuk tim lintas OS)
git config --global core.autocrlf input         # Mac/Linux
git config --global core.autocrlf true          # Windows

# Color output
git config --global color.ui auto

# Cache credential (HTTPS)
git config --global credential.helper store     # simpan plain (kurang aman)
git config --global credential.helper cache     # cache di memory 15 menit
```

### 2.2 Konfigurasi Per-Repository

Tanpa `--global`, konfigurasi hanya berlaku di repo saat ini (disimpan di `.git/config`).

```bash
cd /path/to/sipedes
git config user.name "Nama Khusus untuk Repo Ini"
git config user.email "email-khusus@tim.id"
```

### 2.3 Verifikasi Konfigurasi

```bash
git config --list             # semua konfigurasi
git config --list --global    # hanya global
git config user.name          # nilai satu key
```

### 2.4 Setup SSH Key untuk GitHub (Alternatif HTTPS)

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "email@anda.com"
# (Tekan Enter untuk lokasi default, masukkan passphrase opsional)

# Tampilkan public key
cat ~/.ssh/id_ed25519.pub

# Salin output, lalu paste ke GitHub:
# Settings > SSH and GPG keys > New SSH key

# Test koneksi
ssh -T git@github.com
# Output: "Hi username! You've successfully authenticated..."

# Ubah remote dari HTTPS ke SSH
git remote set-url origin git@github.com:username/sipedes.git
```

---

## 3. Remote GitHub

### 3.1 Menambahkan Remote

```bash
# Tambah remote (nama umum: origin)
git remote add origin https://github.com/username/sipedes.git

# Lihat daftar remote
git remote -v

# Ubah URL remote
git remote set-url origin https://github.com/username/sipedes-new.git

# Hapus remote
git remote remove origin
```

### 3.2 Push (Kirim ke Remote)

```bash
# Push branch ke remote (pertama kali)
git push -u origin main
# -u = --set-upstream, agar `git pull` otomatis tahu remote tracking

# Push perubahan selanjutnya
git push

# Push branch baru
git push -u origin feature/berita-detail

# Push tag
git push origin v1.0.0
git push --tags                  # push semua tag
```

### 3.3 Pull (Ambil dari Remote)

```bash
# Pull = fetch + merge
git pull origin main

# Pull dengan rebase (lebih bersih history)
git pull --rebase origin main

# Fetch saja (tidak merge, simpan di remote tracking branch)
git fetch origin
git log origin/main              # lihat commit di remote tanpa apply
```

### 3.4 Clone

```bash
# Clone repository lengkap
git clone https://github.com/username/sipedes.git

# Clone ke folder dengan nama berbeda
git clone https://github.com/username/sipedes.git my-sipedes

# Clone branch tertentu saja
git clone -b develop https://github.com/username/sipedes.git

# Clone dengan SSH
git clone git@github.com:username/sipedes.git
```

---

## 4. Branch Workflow

SIPEDES menggunakan **Git Flow** yang disederhanakan. Berikut branch convention:

### 4.1 Daftar Branch Utama

| Branch | Tujuan | Proteksi |
|--------|--------|----------|
| `main` | Kode production-ready. Setiap commit di sini harus stabil. | Branch protection: require PR review, lulus test. |
| `develop` | Branch integrasi untuk fitur yang sedang dikembangkan. | Bisa push langsung oleh anggota tim. |

### 4.2 Branch Sementara

| Prefix | Tujuan | Contoh | Lifecycle |
|--------|--------|--------|-----------|
| `feature/` | Pengembangan fitur baru | `feature/auth-jwt`, `feature/berita-detail` | Dihapus setelah merge ke `develop`. |
| `fix/` | Perbaikan bug | `fix/login-redirect`, `fix/cors-error` | Dihapus setelah merge. |
| `hotfix/` | Perbaikan darurat di production | `hotfix/security-patch` | Merge ke `main` dan `develop`. |
| `release/` | Persiapan rilis | `release/v1.0.0` | Merge ke `main` dan tag. |
| `docs/` | Perubahan dokumentasi | `docs/setup-guide` | Bisa merge langsung ke `develop`. |
| `chore/` | Maintenance non-fungsional | `chore/update-deps` | Merge ke `develop`. |

### 4.3 Alur Kerja Standar

```
1. Update local develop:
   git switch develop
   git pull origin develop

2. Buat branch fitur:
   git switch -c feature/nama-fitur

3. Kerjakan, commit berkala:
   git add .
   git commit -m "feat: implementasi endpoint X"

4. Push branch ke remote:
   git push -u origin feature/nama-fitur

5. Buka Pull Request di GitHub:
   base: develop  <-  compare: feature/nama-fitur

6. Setelah PR di-review dan di-merge:
   git switch develop
   git pull origin develop
   git branch -d feature/nama-fitur          # hapus branch lokal
   git push origin --delete feature/nama-fitur   # hapus branch remote
```

### 4.4 Release Flow

```
1. Buat branch release dari develop:
   git switch develop
   git switch -c release/v1.0.0

2. Update version di package.json (manual):
   npm version 1.0.0 --no-git-tag-version
   git commit -am "chore: bump version to 1.0.0"

3. Merge release ke main:
   git switch main
   git merge release/v1.0.0
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin main --tags

4. Merge release kembali ke develop:
   git switch develop
   git merge release/v1.0.0
   git push origin develop

5. Hapus branch release:
   git branch -d release/v1.0.0
```

---

## 5. Pull Request

Pull Request (PR) adalah permintaan untuk menggabungkan branch fitur ke branch utama. PR memungkinkan code review sebelum merge.

### 5.1 Membuat PR

1. Pastikan branch fitur sudah di-push ke remote.
2. Buka repository di GitHub (https://github.com/username/sipedes).
3. GitHub akan menampilkan banner "**Compare & pull request**" - klik tombol tersebut.
   Atau: tab **Pull requests** > **New pull request** > pilih branch.
4. Isi template PR:
   ```markdown
   ## Deskripsi
   Penjelasan singkat apa yang dilakukan PR ini.

   ## Tipe Perubahan
   - [ ] Bug fix (fix)
   - [ ] Fitur baru (feat)
   - [ ] Breaking change (BREAKING CHANGE)
   - [ ] Dokumentasi (docs)
   - [ ] Refactor (refactor)
   - [ ] Lainnya: ____

   ## Checklist
   - [ ] Kode sudah di-test secara lokal
   - [ ] Tidak menambah lint warning
   - [ ] Dokumentasi terkait sudah diupdate (jika perlu)

   ## Screenshot / Demo (jika relevan)
   ```
5. Klik **Create pull request**.

### 5.2 Code Review

Sebagai **reviewer**:
1. Buka PR di GitHub.
2. Buka tab **Files changed**.
3. Komentari baris kode yang perlu diskusi (hover line > klik `+`).
4. Pilih: **Comment** (umum), **Approve** (sudah oke), atau **Request changes** (perlu revisi).
5. Jangan approve PR sendiri (best practice).

Sebagai **author**:
1. Tanggapi komentar reviewer.
2. Jika perlu revisi: commit di branch fitur, push otomatis update PR.
3. Setelah semua komentar resolved dan minimal 1 approval, merge.

### 5.3 Merge Strategy

| Strategy | Kapan dipakai | Hasil history |
|----------|---------------|---------------|
| **Create a merge commit** (default) | Untuk fitur besar, ingin pertanda eksplisit "merge feature X". | Merge commit + semua commit dari branch fitur tetap utuh. |
| **Squash and merge** | Untuk fitur kecil, branch fitur punya banyak commit "WIP" yang tidak ingin ditampilkan. | Satu commit di main mewakili seluruh branch. |
| **Rebase and merge** | Untuk linear history tanpa merge commit. | Commit dari branch fitur ditempelkan satu per satu di atas main. |

SIPEDES merekomendasikan **Squash and merge** untuk mayoritas PR agar history `develop`/`main` tetap bersih.

### 5.4 Setelah Merge

```bash
# Update local
git switch develop
git pull origin develop

# Hapus branch lokal
git branch -d feature/nama-fitur

# Hapus branch remote (GitHub biasanya otomatis, tapi bisa manual)
git push origin --delete feature/nama-fitur
```

---

## 6. Penyelesaian Konflik

Merge conflict terjadi ketika dua branch mengubah baris yang sama di file yang sama. Git tidak bisa auto-merge - harus diselesaikan manual.

### 6.1 Skenario Umum

```bash
git switch develop
git pull origin develop
# Update terbaru dari remote

git switch feature/fitur-saya
git merge develop
# CONFLICT (content): Merge conflict in src/app.ts
```

### 6.2 Identifikasi Konflik

```bash
git status
# Output:
# Unmerged paths:
#   both modified:   src/app.ts
```

Buka file `src/app.ts` di editor. Bagian konflik ditandai:

```
<<<<<<< HEAD
// Kode dari branch fitur-saya
const api = '/api/v2';
=======
// Kode dari develop (remote)
const api = '/api/v1';
>>>>>>> develop
```

### 6.3 Resolve Manual

1. Pilih versi yang benar (atau gabungan keduanya).
2. Hapus marker `<<<<<<<`, `=======`, `>>>>>>>`.
3. Simpan file.

Contoh hasil resolve:
```typescript
const api = '/api/v2';   // pilih versi fitur
```

4. Stage file yang sudah diperbaiki:
   ```bash
   git add src/app.ts
   ```
5. Lanjutkan merge:
   ```bash
   git commit -m "merge: resolve conflict in app.ts"
   # atau jika rebase:
   git rebase --continue
   ```

### 6.4 Tools Bantu

- **VS Code**: otomatis menyoroti konflik dengan tombol "Accept Current", "Accept Incoming", "Accept Both".
- **`git mergetool`**: launch tool visual seperti Meld, KDiff3, atau Beyond Compare.
- **`git checkout --theirs file.txt`**: ambil versi dari branch incoming.
- **`git checkout --ours file.txt`**: ambil versi dari branch current.

### 6.5 Membatalkan Merge

Jika konflik terlalu rumit dan ingin mulai ulang:

```bash
git merge --abort    # batalkan merge yang sedang berjalan
git rebase --abort   # batalkan rebase
```

---

## 7. .gitignore

File `.gitignore` menentukan file/folder yang **tidak** dilacak oleh Git. SIPEDES menggunakan `.gitignore` komprehensif di root.

### 7.1 Yang Tidak Di-commit di SIPEDES

```gitignore
# Dependencies
node_modules/
**/node_modules/

# Build output
dist/
build/
**/dist/
**/build/

# Environment variables (RAHASIA)
.env
.env.local
.env.*.local
!.env.example

# Database storage (SQLite)
*.sqlite
*.sqlite-shm
*.sqlite-wal
storage/sipedes.sqlite*

# Upload storage (file user upload)
storage/uploads/
storage/documents/
!storage/uploads/.gitkeep
!storage/documents/.gitkeep

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
logs/

# OS files
.DS_Store
Thumbs.db
desktop.ini

# Editor
.vscode/
!.vscode/settings.json
!.vscode/extensions.json
.idea/

# Test coverage
coverage/

# Temporary
*.tmp
*.bak
.cache/

# Capacitor / mobile
apps/mobile/www/
apps/mobile/android/
apps/mobile/ios/
```

### 7.2 Penjelasan Penting

| Pola | Alasan |
|------|--------|
| `node_modules/` | Dependency bisa di-recreate dengan `npm install`. Ukuran besar, banyak file. |
| `.env` | Berisi JWT secret, password DB. **JANGAN PERNAH** commit ke repo publik. |
| `dist/`, `build/` | Output build, dapat di-regenerate. |
| `*.sqlite` | Database file lokal untuk testing. |
| `storage/uploads/` | File upload user - tidak boleh ikut repo (besar & privat). |
| `.DS_Store`, `Thumbs.db` | File sistem operasi, tidak relevan dengan proyek. |
| `coverage/` | Hasil test coverage, di-regenerate tiap run test. |

### 7.3 Paksa Untrack File yang Sudah Terlanjur Di-commit

Jika file seharusnya di-ignore tapi sudah terlanjur di-commit:

```bash
git rm --cached .env                    # hapus dari index, tetap di working dir
git rm -r --cached node_modules/        # recursive
git commit -m "chore: untrack file yang seharusnya di-ignore"
git push
```

### 7.4 Cek Apakah File Akan Di-ignore

```bash
git check-ignore -v .env
# Output: .gitignore:3:.env  .env
```

---

## 8. Commit Message Convention

SIPEDES mengikuti **Conventional Commits** (https://www.conventionalcommits.org) untuk history yang konsisten dan otomatis dapat di-parse untuk changelog.

### 8.1 Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

### 8.2 Tipe Commit

| Tipe | Deskripsi | Contoh |
|------|-----------|--------|
| `feat` | Fitur baru | `feat: tambah halaman detail berita` |
| `fix` | Bug fix | `fix: perbaiki redirect setelah login` |
| `docs` | Dokumentasi | `docs: update SETUP.md dengan langkah deployment` |
| `style` | Format, white-space, titik koma (tidak ubah logic) | `style: format ulang authController.ts` |
| `refactor` | Refactor kode (tidak ubah behavior) | `refactor: pisahkan logika validasi ke service` |
| `perf` | Perbaikan performa | `perf: tambah index pada tabel news` |
| `test` | Tambah/koreksi test | `test: tambah unit test untuk authService` |
| `build` | Build system, dependencies | `build: upgrade Express ke v4.19` |
| `ci` | Konfigurasi CI/CD | `ci: tambah GitHub Actions untuk build` |
| `chore` | Maintenance rutin | `chore: update .gitignore` |
| `revert` | Kembalikan commit sebelumnya | `revert: feat berita kategori (commit abc123)` |

### 8.3 Scope (Opsional)

Scope menunjukkan area kode yang diubah:

```
feat(api): tambah endpoint GET /dashboard/stats
fix(web): perbaiki layout pada mobile
docs(api): update dokumentasi endpoint auth
```

### 8.4 Aturan Deskripsi

- Gunakan **imperative mood**: "tambah" bukan "menambahkan", "perbaiki" bukan "memperbaiki".
- Huruf kecil di awal, tanpa titik di akhir.
- Maksimal 72 karakter (untuk tampilan one-line di `git log --oneline`).
- Bahasa Indonesia (sesuai konteks proyek).

### 8.5 Body (Opsional)

Untuk perubahan kompleks, tambahkan body:

```
feat: tambah upload lampiran permohonan

- Mendukung file PDF, JPEG, PNG hingga 5MB
- File disimpan di storage/uploads/requests/
- Metadata disimpan di tabel service_request_attachments
- Endpoint: POST /services/requests/:id/attachments
```

### 8.6 Breaking Change

Untuk perubahan yang breaking (tidak backward-compatible):

```
feat!: hapus endpoint lama /v0/auth

BC: gunakan /api/v1/auth sebagai pengganti
```

Atau via footer:

```
feat: ubah struktur response API

BREAKING CHANGE: response sekarang menggunakan wrapper { success, message, data }
```

### 8.7 Contoh Nyata di SIPEDES

```bash
git commit -m "feat(api): implementasi register & login dengan JWT"
git commit -m "fix(api): handle error ketika JWT_SECRET kosong"
git commit -m "docs: tambah ACCESS-MATRIX.md"
git commit -m "refactor(web): pecah DashboardLayout menjadi komponen terpisah"
git commit -m "chore: tambah .env.example"
git commit -m "test: tambah pengujian endpoint /health"
```

---

## 9. NPM Workspaces

SIPEDES adalah **monorepo** yang menggunakan NPM Workspaces untuk mengelola multiple package dalam satu repository.

### 9.1 Struktur

```
sipedes/                       # root (workspace root)
├── package.json               # mendeklarasikan workspaces
├── apps/
│   ├── web/                   # workspace: @sipedes/web
│   ├── api/                   # workspace: @sipedes/api
│   ├── desktop/               # workspace: @sipedes/desktop
│   └── mobile/                # workspace: @sipedes/mobile
└── packages/
    └── shared/                # workspace: @sipedes/shared
```

### 9.2 Deklarasi di Root package.json

```json
{
  "name": "sipedes",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

Wildcard `apps/*` dan `packages/*` berarti setiap subfolder di `apps/` dan `packages/` yang memiliki `package.json` akan diperlakukan sebagai workspace.

### 9.3 Install Dependencies

**Install semua workspace sekaligus** (dari root):

```bash
npm install
```

NPM akan:
1. Membaca `workspaces` di root `package.json`.
2. Untuk setiap workspace, install dependencies dari `package.json` masing-masing.
3. Meng-hoist dependency bersama ke root `node_modules/` (deduplication).
4. Membuat symlink di `node_modules/@sipedes/*` agar workspace bisa saling import.

**Install dependency ke workspace tertentu:**

```bash
# Tambah express ke @sipedes/api
npm install express --workspace @sipedes/api

# Singkatnya:
npm install express -w @sipedes/api

# Tambah sebagai devDependency
npm install -D typescript -w @sipedes/api

# Tambah ke root
npm install -D prettier -w
```

### 9.4 Menjalankan Script per Workspace

```bash
# Run script "dev" di workspace @sipedes/api
npm run dev --workspace @sipedes/api
# atau:
npm run dev -w @sipedes/api

# Run di semua workspace (yang punya script tsb)
npm run build --workspaces --if-present

# Run di semua workspace dengan script "test"
npm test --workspaces --if-present
```

### 9.5 Import Antar Workspace

Workspace `@sipedes/shared` diekspos sebagai package yang bisa di-import oleh workspace lain.

```typescript
// di apps/api/src/utils/response.ts
import type { ApiResponse } from '@sipedes/shared';

// di apps/web/src/lib/api.ts
import type { User } from '@sipedes/shared';
```

Setelah ubah kode di `packages/shared/src/`, perlu di-build agar perubahan terlihat di consumer:

```bash
npm run build -w @sipedes/shared
```

### 9.6 Keuntungan Monorepo + Workspaces

1. **Satu `node_modules`** di root - hemat disk & install time (dependency bersama di-dedup).
2. **Cross-package refactoring** - Ubah tipe di `@sipedes/shared` langsung terlihat error di `@sipedes/api` & `@sipedes/web`.
3. **Sinkron versi** - Semua workspace pakai versi dependency yang sama (mis. Express 4.19 di semua tempat).
4. **Atomic commit** - Satu commit bisa mencakup perubahan di backend & frontend yang terkait.

### 9.7 Tantangan

- Build order penting: `@sipedes/shared` harus di-build sebelum `@sipedes/api` & `@sipedes/web` (agar bisa import hasil build).
- Untuk development, gunakan `tsx watch` agar tidak perlu build ulang tiap perubahan (TypeScript di-run langsung).

---

## 10. NPM Scripts

Berikut daftar script yang tersedia di root `package.json` SIPEDES beserta penjelasannya.

### 10.1 Script di Root

| Script | Perintah Asli | Deskripsi |
|--------|---------------|-----------|
| `npm run dev` | `npm run dev --workspaces --if-present` | Jalankan `dev` di semua workspace yang punya script `dev`. Berguna untuk menjalankan web + api + shared sekaligus. |
| `npm run dev:web` | `npm run dev --workspace @sipedes/web` | Jalankan Vite dev server untuk frontend. Output di http://localhost:5173. |
| `npm run dev:api` | `npm run dev --workspace @sipedes/api` | Jalankan backend dengan tsx watch (auto-reload). Output di http://localhost:4000. |
| `npm run build` | `npm run build --workspaces --if-present` | Build semua workspace. Output: `apps/web/dist/`, `apps/api/dist/`, `packages/shared/dist/`. |
| `npm run build:web` | `npm run build --workspace @sipedes/web` | Build frontend saja (Vite production build). |
| `npm run build:api` | `npm run build --workspace @sipedes/api` | Build backend saja (tsc compile ke JavaScript). |
| `npm run lint` | `npm run lint --workspaces --if-present` | Jalankan ESLint di semua workspace. |
| `npm test` | `npm run test --workspaces --if-present` | Jalankan unit test di semua workspace. |
| `npm run db:migrate` | `npm run db:migrate --workspace @sipedes/api` | Jalankan database migration (file SQL di `database/migrations/`). |
| `npm run db:seed` | `npm run db:seed --workspace @sipedes/api` | Isi database dengan data awal (akun demo, berita, dll). |
| `npm run db:reset` | `npm run db:reset --workspace @sipedes/api` | Hapus semua tabel, lalu migrate + seed ulang. |

### 10.2 Script di Workspace @sipedes/web

(Definisi ada di `apps/web/package.json`.)

| Script | Deskripsi |
|--------|-----------|
| `dev` | `vite` - Vite dev server dengan HMR. |
| `build` | `tsc && vite build` - Type-check lalu build production. |
| `preview` | `vite preview` - Sajikan hasil build secara lokal untuk preview. |
| `lint` | `eslint . --ext ts,tsx` - Lint file TypeScript. |

### 10.3 Script di Workspace @sipedes/api

(Definisi ada di `apps/api/package.json`.)

| Script | Deskripsi |
|--------|-----------|
| `dev` | `tsx watch src/index.ts` - Jalankan dengan auto-reload saat file berubah. |
| `build` | `tsc` - Kompilasi TypeScript ke `dist/`. |
| `start` | `node dist/index.js` - Jalankan hasil build (production). |
| `db:migrate` | `tsx src/scripts/migrate.ts` - Jalankan migration. |
| `db:seed` | `tsx src/scripts/seed.ts` - Jalankan seed. |
| `db:reset` | `tsx src/scripts/reset.ts` - Reset database. |
| `lint` | `eslint . --ext ts` - Lint. |

### 10.4 Cara Pakai Sehari-hari

```bash
# Development (buka 2 terminal)
npm run dev:api       # terminal 1
npm run dev:web       # terminal 2

# Build production
npm run build

# Cek database
npm run db:migrate
npm run db:seed
npm run db:reset      # hati-hati: hapus semua data
```

### 10.5 Menambahkan Script Baru

Edit `package.json` di workspace yang sesuai, tambahkan entri di `scripts`:

```json
{
  "scripts": {
    "test:e2e": "playwright test"
  }
}
```

Lalu jalankan: `npm run test:e2e -w @sipedes/api`.

---

## 11. Versioning

### 11.1 Semantic Versioning (SemVer)

SIPEDES mengikuti **Semantic Versioning** dengan format `MAJOR.MINOR.PATCH`:

| Segment | Kapan Naik | Contoh |
|---------|------------|--------|
| `MAJOR` | Breaking change (tidak backward-compatible). | `1.0.0` -> `2.0.0` (hapus endpoint lama). |
| `MINOR` | Fitur baru yang backward-compatible. | `1.0.0` -> `1.1.0` (tambah endpoint baru). |
| `PATCH` | Bug fix yang backward-compatible. | `1.0.0` -> `1.0.1` (perbaiki bug login). |

### 11.2 Versi di package.json

Setiap workspace punya versi sendiri di `package.json`:

```json
{
  "name": "@sipedes/api",
  "version": "1.0.0"
}
```

### 11.3 NPM Version Command

```bash
# Naikkan patch: 1.0.0 -> 1.0.1
npm version patch -w @sipedes/api

# Naikkan minor: 1.0.1 -> 1.1.0
npm version minor -w @sipedes/api

# Naikkan major: 1.1.0 -> 2.0.0
npm version major -w @sipedes/api

# Set versi spesifik
npm version 1.5.2 -w @sipedes/api
```

Perintah ini otomatis:
1. Update `version` di `package.json`.
2. Buat git commit `v1.0.1`.
3. Buat git tag `v1.0.1`.

(Opsi `--no-git-tag-version` jika tidak ingin commit/tag otomatis.)

### 11.4 Tag di Git

Tag menandai titik rilis tertentu:

```bash
# Tag annotated (direkomendasikan)
git tag -a v1.0.0 -m "Release 1.0.0 - Initial release"

# Tag lightweight
git tag v1.0.0

# Lihat semua tag
git tag

# Push tag ke remote
git push origin v1.0.0
git push origin --tags

# Hapus tag
git tag -d v1.0.0
git push origin --delete v1.0.0
```

### 11.5 Changelog

Sangat direkomendasikan menyimpan `CHANGELOG.md` di root:

```markdown
# Changelog

## [1.0.1] - 2024-01-20
### Fixed
- Bug login redirect ketika token expired.

## [1.0.0] - 2024-01-15
### Added
- Autentikasi JWT.
- CRUD berita, pengumuman, layanan, dokumen.
- Dashboard warga & staff.
```

Tools seperti **standard-version** atau **release-please** bisa generate changelog otomatis dari Conventional Commits.

---

## 12. Cheat Sheet

Cepat reference untuk perintah yang paling sering dipakai:

### 12.1 Git Sehari-hari

```bash
git status                              # cek status
git add .                               # stage semua
git commit -m "feat: deskripsi"         # commit
git push                                # kirim ke remote
git pull                                # ambil dari remote
git log --oneline -10                   # lihat 10 commit terakhir
git switch -c feature/nama              # buat & pindah branch baru
git switch main                         # pindah ke main
```

### 12.2 NPM Sehari-hari

```bash
npm install                             # install semua dependency
npm run dev:api                         # backend
npm run dev:web                         # frontend
npm run build                           # build semua
npm run db:migrate                      # migrate database
npm run db:seed                         # seed data
npm run db:reset                        # reset database
npm install <pkg> -w @sipedes/api       # tambah dep ke api
```

### 12.3 Emergency

```bash
# Undo commit terakhir (simpan perubahan)
git reset --soft HEAD~1

# Buang semua perubahan yang belum di-commit (HATI-HATI)
git reset --hard HEAD

# Lihat siapa yang mengubah baris ini
git blame src/file.ts

# Cari commit yang mengubah string tertentu
git log -S "fungsiYangDicari" --oneline

# Kembalikan file yang terhapus (belum di-commit)
git restore deleted-file.ts
```

---

## Referensi

- Pro Git Book (gratis): https://git-scm.com/book/id/v2
- Conventional Commits: https://www.conventionalcommits.org
- NPM Workspaces docs: https://docs.npmjs.com/cli/v7/using-npm/workspaces
- Semantic Versioning: https://semver.org
- GitHub Flow: https://docs.github.com/en/get-started/quickstart/github-flow

---

**Akhir dokumen GIT-NPM.**

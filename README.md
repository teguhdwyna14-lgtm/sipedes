<<<<<<< HEAD
# SIPEDES - Website Desa (Flask + SQLite)

## Menjalankan di Windows / VS Code
1. Ekstrak ZIP dan buka folder SIPEDES di VS Code.
2. Buka Terminal > New Terminal.
3. Jalankan `py -m pip install -r requirements.txt`
4. Jalankan `py app.py`
5. Buka `http://127.0.0.1:5000`

Login admin demo: username `admin`, password `AdminDesa!2026` (WAJIB ganti saat login pertama). Untuk instalasi baru, sebaiknya set environment variable `ADMIN_PASSWORD` dan `SECRET_KEY` sebelum pertama menjalankan aplikasi.

Di panel admin: tambah KK dahulu, kemudian buat akun warga. Username warga ditentukan admin. Password awal otomatis DDMMYYYY: 10 Januari 2006 = 10012006. Setelah login pertama warga wajib mengganti password.

## Catatan penting
- Ini prototipe fungsional lokal, BUKAN sistem siap produksi untuk data kependudukan asli.
- Sebelum online: wajib HTTPS, CSRF protection, pembatasan percobaan login, audit log, backup terenkripsi, pengelolaan hak akses yang lebih rinci, kebijakan privasi, dan pemeriksaan keamanan.
- Surat baru berupa pengajuan dan status; belum menghasilkan PDF surat bertanda tangan elektronik. Penandatanganan resmi tetap dilakukan pihak berwenang.
- Peta menggunakan tautan Google Maps; unduhan CSV berisi tautan peta, bukan berkas geospasial/batas desa resmi. Set `DESA_MAP_URL` untuk mengganti lokasi.
- Foto hero dan kartu menggunakan URL Unsplash dan memerlukan internet; ganti dengan foto desa sendiri untuk situs resmi.
- Nomor WA jasa masukkan format 628xxxxxxxxx. Jangan unggah data pribadi warga tanpa dasar hukum dan persetujuan/otorisasi yang sesuai.
- SQLite dipakai langsung, jadi tidak perlu XAMPP/MySQL.
=======
# sipedes
>>>>>>> b7fc848645aba531c22607aeda8399054e45048b

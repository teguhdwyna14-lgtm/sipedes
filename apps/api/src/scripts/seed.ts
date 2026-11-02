// =====================================================
// Seed Script - Data sintetis untuk demonstrasi
// Tidak mengandung data pribadi nyata
// =====================================================

import { getDb } from '../db/connection';
import { hashPassword } from '../utils/auth';
import { config } from '../config/env';
import type { QueryParams } from '../db/types';

async function seed(): Promise<void> {
  const db = await getDb();
  console.log('[seed] Memulai seeding data sintetis...');
  console.log(`[seed] Client: ${db.client}`);

  // 1) Roles
  const roles = [
    { name: 'warga', description: 'Warga desa - dapat mengajukan permohonan & pengaduan' },
    { name: 'petugas', description: 'Petugas desa - memproses permohonan & verifikasi' },
    { name: 'admin', description: 'Administrator - akses penuh sistem' },
  ];
  for (const role of roles) {
    await db.execute(
      'INSERT INTO roles (name, description) VALUES (?, ?) ON CONFLICT(name) DO NOTHING',
      [role.name, role.description]
    ).catch(() => {
      // SQLite ON CONFLICT syntax - untuk MySQL gunakan INSERT IGNORE
      return db.execute(
        `INSERT IGNORE INTO roles (name, description) VALUES (?, ?)`,
        [role.name, role.description]
      );
    });
  }
  console.log('[seed] Roles terisi');

  // 2) Admin & petugas (status active)
  const adminHash = await hashPassword('Admin12345');
  const petugasHash = await hashPassword('Petugas123');
  const adminId = await ensureUser(db, {
    email: 'admin@sipedes.local',
    passwordHash: adminHash,
    fullName: 'Administrator Desa',
    role: 'admin',
    status: 'active',
    phone: '081200000001',
  });
  const petugasId = await ensureUser(db, {
    email: 'petugas@sipedes.local',
    passwordHash: petugasHash,
    fullName: 'Petugas Pelayanan',
    role: 'petugas',
    status: 'active',
    phone: '081200000002',
  });
  console.log(`[seed] Admin & petugas dibuat (admin_id=${adminId}, petugas_id=${petugasId})`);

  // 3) Warga contoh (5 akun, 3 active, 1 pending, 1 rejected)
  const wargaSamples = [
    { email: 'budi@sipedes.local', name: 'Budi Santoso', status: 'active', nik: '3201010101900001', rt: '001', rw: '002' },
    { email: 'siti@sipedes.local', name: 'Siti Aminah', status: 'active', nik: '3201010202900002', rt: '001', rw: '002' },
    { email: 'agus@sipedes.local', name: 'Agus Wijaya', status: 'active', nik: '3201010303900003', rt: '003', rw: '001' },
    { email: 'deden@sipedes.local', name: 'Deden Permana', status: 'pending', nik: '3201010404900004', rt: '002', rw: '001' },
    { email: 'rina@sipedes.local', name: 'Rina Marlina', status: 'rejected', nik: '3201010505900005', rt: '003', rw: '002' },
  ];

  for (const w of wargaSamples) {
    const hash = await hashPassword('Warga1234');
    const userId = await ensureUser(db, {
      email: w.email,
      passwordHash: hash,
      fullName: w.name,
      role: 'warga',
      status: w.status as 'pending' | 'active' | 'rejected' | 'disabled',
      phone: '08120000' + w.nik.slice(-4),
    });
    // Resident profile
    await db.execute(
      `INSERT INTO resident_profiles
        (user_id, full_name, nik, kk_number, birth_date, gender, address, rt, rw, phone, occupation, status, verified_by_id, verified_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${w.status === 'active' ? 'CURRENT_TIMESTAMP' : 'NULL'})
       ON CONFLICT(user_id) DO UPDATE SET status=excluded.status`,
      [
        userId, w.name, w.nik, '3201010101900001',
        '1990-01-0' + w.nik.slice(-1), w.name.startsWith('S') || w.name.startsWith('R') ? 'P' : 'L',
        'Jl. Contoh No. ' + w.nik.slice(-2), w.rt, w.rw,
        '08120000' + w.nik.slice(-4), 'Petani',
        w.status, w.status === 'active' ? adminId : null,
      ]
    ).catch(async () => {
      // MySQL fallback (no ON CONFLICT)
      const existing = await db.query<{ id: number }>('SELECT id FROM resident_profiles WHERE user_id = ?', [userId]);
      if (existing.length === 0) {
        await db.execute(
          `INSERT INTO resident_profiles
            (user_id, full_name, nik, kk_number, birth_date, gender, address, rt, rw, phone, occupation, status, verified_by_id, verified_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${w.status === 'active' ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
          [userId, w.name, w.nik, '3201010101900001', '1990-01-0' + w.nik.slice(-1),
           w.name.startsWith('S') || w.name.startsWith('R') ? 'P' : 'L',
           'Jl. Contoh No. ' + w.nik.slice(-2), w.rt, w.rw,
           '08120000' + w.nik.slice(-4), 'Petani', w.status,
           w.status === 'active' ? adminId : null]
        );
      }
    });
  }
  console.log('[seed] Warga contoh dibuat');

  // 4) Village settings
  const existingVillage = await db.query<{ id: number }>('SELECT id FROM village_settings LIMIT 1');
  if (existingVillage.length === 0) {
    await db.execute(
      `INSERT INTO village_settings (village_name, district, regency, province, address, postal_code, phone, email, website, history, vision, mission, geography, potential, working_hours)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Desa Sukamaju', 'Kecamatan Cibadak', 'Kabupaten Bogor', 'Jawa Barat',
        'Jl. Raya Sukamaju No. 1', '16710', '(021) 1234567', 'desa@sukamaju.id',
        'https://sukamaju.id',
        'Desa Sukamaju didirikan pada tahun 1950-an oleh para pelarian perang kemerdekaan. Nama Sukamaju diberikan dengan harapan desa ini terus berkembang dan maju. Pada awalnya desa hanya berisi 50 kepala keluarga, kini telah berkembang menjadi lebih dari 800 kepala keluarga.',
        'Terwujudnya masyarakat Sukamaju yang mandiri, sejahtera, dan berbudaya berlandaskan nilai-nilai kebersamaan dan gotong royong.',
        '1. Meningkatkan kualitas pelayanan publik\n2. Mengembangkan potensi ekonomi desa\n3. Melestarikan budaya lokal\n4. Membangun infrastruktur desa\n5. Memberdayakan masyarakat',
        'Desa Sukamaju terletak di dataran rendah dengan ketinggian 200 mdpl. Luas wilayah 5,2 km persegi. Beriklim tropis dengan curah hujan sedang. Berbatasan dengan desa lain di empat penjuru.',
        'Potensi utama: pertanian padi, hortikultura, peternakan ayam, kerajinan bambu, dan wisata agro. Lahan pertanian subur seluas 300 hektar.',
        'Senin-Jumat: 08.00-15.00, Sabtu: 08.00-12.00',
      ]
    );
  }
  console.log('[seed] Village settings terisi');

  // 5) Service types
  const serviceTypes = [
    { code: 'SKD', name: 'Surat Keterangan Domisili', requirements: '1. Fotokopi KTP\n2. Fotokopi KK\n3. Pas foto 3x4', processingDays: 2 },
    { code: 'SPA', name: 'Surat Pengantar Administrasi', requirements: '1. Fotokopi KTP\n2. Fotokopi KK\n3. Surat pengantar RT/RW', processingDays: 1 },
    { code: 'SKU', name: 'Surat Keterangan Usaha', requirements: '1. Fotokopi KTP\n2. Fotokopi KK\n3. Dokumen izin usaha (jika ada)\n4. Foto lokasi usaha', processingDays: 3 },
    { code: 'SKTM', name: 'Surat Keterangan Tidak Mampu', requirements: '1. Fotokopi KTP\n2. Fotokopi KK\n3. Surat pengantar RT/RW\n4. Foto rumah', processingDays: 5 },
    { code: 'SKP', name: 'Surat Keterangan Penghasilan', requirements: '1. Fotokopi KTP\n2. Fotokopi KK\n3. Slip gaji / surat keterangan kerja', processingDays: 2 },
  ];
  for (const st of serviceTypes) {
    const exists = await db.query<{ id: number }>('SELECT id FROM service_types WHERE code = ?', [st.code]);
    if (exists.length === 0) {
      await db.execute(
        `INSERT INTO service_types (code, name, description, requirements, processing_days, active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [st.code, st.name, `Layanan penerbitan ${st.name.toLowerCase()}`, st.requirements, st.processingDays]
      );
    }
  }
  console.log('[seed] Service types terisi');

  // 6) Berita
  const newsItems = [
    {
      title: 'Gotong Royong Pembersihan Saluran Air',
      slug: 'gotong-royong-pembersihan-saluran-air',
      excerpt: 'Warga Desa Sukamaju bergotong royong membersihkan saluran air untuk menghadapi musim hujan.',
      content: 'Pada hari Sabtu tanggal 15 Oktober 2024, seluruh warga Dusun Cibadak bergotong royong membersihkan saluran air yang mengalir di sepanjang jalan utama desa. Kegiatan ini dihadiri oleh Kepala Desa, perangkat desa, dan tokoh masyarakat. Gotong royong dilakukan untuk mengantisipasi banjir saat musim hujan tiba. Kegiatan dimulai pukul 07.00 WIB dan selesai pukul 11.00 WIB. Hasilnya, saluran air kembali bersih dan dapat mengalir dengan lancar.',
      category: 'Kegiatan',
      status: 'published',
    },
    {
      title: 'Pelatihan Pertanian Organik untuk Petani',
      slug: 'pelatihan-pertanian-organik-untuk-petani',
      excerpt: 'Pemerintah desa mengadakan pelatihan pertanian organik gratis bagi para petani.',
      content: 'Dalam rangka meningkatkan kualitas hasil pertanian, Pemerintah Desa Sukamaju bekerjasama dengan Dinas Pertanian Kabupaten Bogor menyelenggarakan pelatihan pertanian organik. Pelatihan diikuti oleh 40 petani dari berbagai dusun. Materi mencakup teknik pembuatan pupuk organik, pengendalian hama tanpa pestisida, dan strategi pemasaran produk organik. Pelatihan berlangsung selama tiga hari di Balai Desa.',
      category: 'Pelatihan',
      status: 'published',
    },
    {
      title: 'Bantuan Sosial untuk Warga Terdampak',
      slug: 'bantuan-sosial-untuk-warga-terdampak',
      excerpt: 'Distribusi bantuan sosial kepada warga kurang mampu dilakukan minggu ini.',
      content: 'Pemerintah Desa Sukamaju mendistribusikan bantuan sosial kepada 50 kepala keluarga kurang mampu. Bantuan berupa sembako dan uang tunai. Distribusi dilakukan secara bertahap mengikuti protokol kesehatan. Warga penerima bantuan telah melalui verifikasi oleh tim pemerintah desa bersama ketua RT setempat.',
      category: 'Bantuan',
      status: 'published',
    },
  ];
  for (const n of newsItems) {
    const exists = await db.query<{ id: number }>('SELECT id FROM news WHERE slug = ?', [n.slug]);
    if (exists.length === 0) {
      await db.execute(
        `INSERT INTO news (title, slug, excerpt, content, category, status, author_id, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [n.title, n.slug, n.excerpt, n.content, n.category, n.status, petugasId]
      );
    }
  }
  console.log('[seed] Berita terisi');

  // 7) Pengumuman
  const announcements = [
    { title: 'Libur Hari Raya Idul Fitri', content: 'Diberitahukan kepada seluruh warga Desa Sukamaju bahwa kantor desa akan libur selama 7 hari pada hari raya Idul Fitri. Pelayanan akan kembali normal setelah hari ketujuh.', status: 'published', pinned: 1 },
    { title: 'Jadwal Pemeriksaan Kesehatan Gratis', content: 'Puskesmas akan mengadakan pemeriksaan kesehatan gratis bagi warga lansia pada tanggal 20 Oktober 2024 di Balai Desa.', status: 'published', pinned: 0 },
    { title: 'Pemilihan Kepala Dusun Baru', content: 'Akan diadakan pemilihan Kepala Dusun Cibadak menggantikan yang telah pensiun. Pendaftaran calon dibuka mulai tanggal 1 November 2024.', status: 'published', pinned: 0 },
  ];
  for (const a of announcements) {
    const exists = await db.query<{ id: number }>('SELECT id FROM announcements WHERE title = ?', [a.title]);
    if (exists.length === 0) {
      await db.execute(
        `INSERT INTO announcements (title, content, status, pinned, author_id, published_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [a.title, a.content, a.status, a.pinned, petugasId]
      );
    }
  }
  console.log('[seed] Pengumuman terisi');

  // 8) Permohonan surat contoh (untuk warga budi)
  const budi = await db.query<{ id: number }>('SELECT id FROM users WHERE email = ?', ['budi@sipedes.local']);
  if (budi.length > 0) {
    const budiId = budi[0].id;
    const stRows = await db.query<{ id: number; code: string }>('SELECT id, code FROM service_types');
    const skd = stRows.find((s) => s.code === 'SKD');
    const sku = stRows.find((s) => s.code === 'SKU');
    if (skd) {
      const rn = 'SR/20241015/ABC123';
      const exists = await db.query<{ id: number }>('SELECT id FROM service_requests WHERE request_number = ?', [rn]);
      if (exists.length === 0) {
        const result = await db.execute(
          `INSERT INTO service_requests (request_number, service_type_id, user_id, purpose, status)
           VALUES (?, ?, ?, ?, 'selesai')`,
          [rn, skd.id, budiId, 'Untuk pengurusan dokumen administrasi bank']
        );
        const reqId = (result as { insertId?: number }).insertId ?? 0;
        await db.execute(
          `INSERT INTO service_request_events (request_id, from_status, to_status, note, created_by_id)
           VALUES (?, NULL, 'diajukan', 'Permohonan diajukan oleh warga', ?)`,
          [reqId, budiId]
        );
        await db.execute(
          `INSERT INTO service_request_events (request_id, from_status, to_status, note, created_by_id)
           VALUES (?, 'diajukan', 'disetujui', 'Dokumen lengkap, disetujui', ?)`,
          [reqId, petugasId]
        );
        await db.execute(
          `INSERT INTO service_request_events (request_id, from_status, to_status, note, created_by_id)
           VALUES (?, 'disetujui', 'selesai', 'Surat telah dicetak', ?)`,
          [reqId, petugasId]
        );
      }
    }
    if (sku) {
      const rn2 = 'SR/20241020/DEF456';
      const exists = await db.query<{ id: number }>('SELECT id FROM service_requests WHERE request_number = ?', [rn2]);
      if (exists.length === 0) {
        const result = await db.execute(
          `INSERT INTO service_requests (request_number, service_type_id, user_id, purpose, status)
           VALUES (?, ?, ?, ?, 'dalam_pemeriksaan')`,
          [rn2, sku.id, budiId, 'Untuk pengajuan kredit usaha']
        );
        const reqId = (result as { insertId?: number }).insertId ?? 0;
        await db.execute(
          `INSERT INTO service_request_events (request_id, from_status, to_status, note, created_by_id)
           VALUES (?, NULL, 'diajukan', 'Permohonan diajukan', ?)`,
          [reqId, budiId]
        );
        await db.execute(
          `INSERT INTO service_request_events (request_id, from_status, to_status, note, created_by_id)
           VALUES (?, 'diajukan', 'dalam_pemeriksaan', 'Sedang diperiksa petugas', ?)`,
          [reqId, petugasId]
        );
      }
    }
  }
  console.log('[seed] Permohonan surat contoh terisi');

  // 9) Pengaduan contoh
  const siti = await db.query<{ id: number }>('SELECT id FROM users WHERE email = ?', ['siti@sipedes.local']);
  if (siti.length > 0) {
    const tc = 'PGD-TEST0001';
    const exists = await db.query<{ id: number }>('SELECT id FROM complaints WHERE tracking_code = ?', [tc]);
    if (exists.length === 0) {
      const result = await db.execute(
        `INSERT INTO complaints (tracking_code, user_id, title, description, category, status, is_anonymous)
         VALUES (?, ?, ?, ?, ?, 'diproses', 0)`,
        [tc, siti[0].id, 'Jalan Rusak di RT 001', 'Jalan di RT 001 RW 002 mengalami kerusakan parah sejak hujan besar minggu lalu. Mohon segera diperbaiki karena mengganggu aktivitas warga.', 'Infrastruktur']
      );
      const cid = (result as { insertId?: number }).insertId ?? 0;
      await db.execute(
        `INSERT INTO complaint_updates (complaint_id, status, note, created_by_id) VALUES (?, 'baru', 'Pengaduan diterima', ?)`,
        [cid, siti[0].id]
      );
      await db.execute(
        `INSERT INTO complaint_updates (complaint_id, status, note, created_by_id) VALUES (?, 'diterima', 'Pengaduan kami terima dan akan ditindaklanjuti', ?)`,
        [cid, petugasId]
      );
      await db.execute(
        `INSERT INTO complaint_updates (complaint_id, status, note, created_by_id) VALUES (?, 'diproses', 'Sedang dikoordinasikan dengan Dinas PUPR', ?)`,
        [cid, petugasId]
      );
    }
  }
  console.log('[seed] Pengaduan contoh terisi');

  // ============ MODUL BARU: NIK, Households, Businesses, Map ============

  // 10) Set NIK untuk admin & petugas (untuk konsistensi, meski login via email)
  await db.execute('UPDATE users SET nik = ? WHERE id = ?', ['3201010000000001', adminId]).catch(() => {});
  await db.execute('UPDATE users SET nik = ? WHERE id = ?', ['3201010000000002', petugasId]).catch(() => {});

  // 11) Set NIK di users untuk warga contoh + password awal = tanggal lahir DDMMYYYY
  //     password_changed_at tetap NULL untuk warga yang belum ganti password
  const wargaNikMap = [
    { email: 'budi@sipedes.local', nik: '3201010101900001', birthDate: '1990-01-01' },
    { email: 'siti@sipedes.local', nik: '3201010202900002', birthDate: '1990-02-02' },
    { email: 'agus@sipedes.local', nik: '3201010303900003', birthDate: '1990-03-03' },
    { email: 'deden@sipedes.local', nik: '3201010404900004', birthDate: '1990-04-04' },
    { email: 'rina@sipedes.local', nik: '3201010505900005', birthDate: '1990-05-05' },
  ];
  for (const w of wargaNikMap) {
    const userRow = await db.query<{ id: number }>('SELECT id FROM users WHERE email = ?', [w.email]);
    if (userRow.length > 0) {
      // Set NIK di users
      await db.execute('UPDATE users SET nik = ? WHERE id = ?', [w.nik, userRow[0].id]).catch(() => {});
      // Password awal = DDMMYYYY (tanggal lahir), tanpa mark changed (password_changed_at NULL)
      const yyyyMMdd = w.birthDate.split('-').join(''); // YYYYMMDD
      const ddmmYYYY = yyyyMMdd.slice(6, 8) + yyyyMMdd.slice(4, 6) + yyyyMMdd.slice(0, 4);
      const birthHash = await hashPassword(ddmmYYYY);
      await db.execute(
        'UPDATE users SET password_hash = ?, password_changed_at = NULL WHERE id = ?',
        [birthHash, userRow[0].id]
      ).catch(() => {});
    }
  }
  console.log('[seed] NIK & password awal (tanggal lahir) untuk warga di-set');

  // 12) Buat beberapa household (KK) dengan anggota
  //     KK 1: Budi (kepala) + Siti (istri) + 1 anak
  //     KK 2: Agus (kepala) + 1 istri + 2 anak
  //     KK 3: Deden (kepala, pending) + 1 anggota
  const budiRes = await db.query<{ id: number; user_id: number }>('SELECT id, user_id FROM resident_profiles WHERE nik = ?', ['3201010101900001']);
  const sitiRes = await db.query<{ id: number; user_id: number }>('SELECT id, user_id FROM resident_profiles WHERE nik = ?', ['3201010202900002']);
  const agusRes = await db.query<{ id: number; user_id: number }>('SELECT id, user_id FROM resident_profiles WHERE nik = ?', ['3201010303900003']);
  const dedenRes = await db.query<{ id: number; user_id: number }>('SELECT id, user_id FROM resident_profiles WHERE nik = ?', ['3201010404900004']);

  // Tambah anggota keluarga tambahan untuk demonstrasi multi-KK dengan nama sama
  // Anak Budi: "Ahmad Santoso" (nama sama dengan anak Agus beda KK)
  // Anak Agus: "Ahmad Santoso" (beda KK, sama nama)

  // Buat KK 1
  let kk1Id = 0;
  {
    const exists = await db.query<{ id: number }>('SELECT id FROM households WHERE kk_number = ?', ['3201010101900001']);
    if (exists.length === 0 && budi.length > 0) {
      const r = await db.execute(
        `INSERT INTO households (kk_number, address, rt, rw, dusun, head_resident_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['3201010101900001', 'Jl. Melati No. 5', '001', '002', 'Dusun Cibadak', budiRes[0].id, 'KK Budi Santoso']
      );
      kk1Id = (r as { insertId?: number }).insertId ?? 0;
      // Set Budi sebagai kepala
      await db.execute(
        `INSERT INTO household_members (household_id, resident_id, role, is_head) VALUES (?, ?, 'kepala', 1)`,
        [kk1Id, budiRes[0].id]
      );
      await db.execute('UPDATE resident_profiles SET household_id = ?, household_role = ? WHERE id = ?', [kk1Id, 'kepala', budiRes[0].id]);
      // Siti sebagai istri
      if (siti.length > 0) {
        await db.execute(
          `INSERT INTO household_members (household_id, resident_id, role, is_head) VALUES (?, ?, 'istri', 0)`,
          [kk1Id, sitiRes[0].id]
        );
        await db.execute('UPDATE resident_profiles SET household_id = ?, household_role = ? WHERE id = ?', [kk1Id, 'istri', sitiRes[0].id]);
      }
      // Anak: Ahmad Santoso (NIK dummy) - buat resident baru tanpa user (anggota KK belum punya akun)
      const anak1Id = await ensureResident(db, {
        fullName: 'Ahmad Santoso',
        nik: '3201011001010001',
        kkNumber: '3201010101900001',
        birthDate: '2015-06-15',
        gender: 'L',
        address: 'Jl. Melati No. 5',
        rt: '001', rw: '002',
        phone: null,
        occupation: 'Pelajar',
        status: 'active',
        verifiedById: adminId,
      });
      await db.execute(
        `INSERT INTO household_members (household_id, resident_id, role, is_head) VALUES (?, ?, 'anak', 0)`,
        [kk1Id, anak1Id]
      );
      await db.execute('UPDATE resident_profiles SET household_id = ?, household_role = ? WHERE id = ?', [kk1Id, 'anak', anak1Id]);
    } else if (exists.length > 0) {
      kk1Id = exists[0].id;
    }
  }

  // Buat KK 2 (Agus)
  let kk2Id = 0;
  {
    const exists = await db.query<{ id: number }>('SELECT id FROM households WHERE kk_number = ?', ['3201010303900003']);
    if (exists.length === 0 && agusRes.length > 0) {
      const r = await db.execute(
        `INSERT INTO households (kk_number, address, rt, rw, dusun, head_resident_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['3201010303900003', 'Jl. Mawar No. 12', '003', '001', 'Dusun Sukamulya', agusRes[0].id, 'KK Agus Wijaya']
      );
      kk2Id = (r as { insertId?: number }).insertId ?? 0;
      await db.execute(
        `INSERT INTO household_members (household_id, resident_id, role, is_head) VALUES (?, ?, 'kepala', 1)`,
        [kk2Id, agusRes[0].id]
      );
      await db.execute('UPDATE resident_profiles SET household_id = ?, household_role = ? WHERE id = ?', [kk2Id, 'kepala', agusRes[0].id]);
      // Istri: Dewi Wijaya
      const dewiId = await ensureResident(db, {
        fullName: 'Dewi Wijaya',
        nik: '3201010303900010',
        kkNumber: '3201010303900003',
        birthDate: '1992-08-20',
        gender: 'P',
        address: 'Jl. Mawar No. 12',
        rt: '003', rw: '001',
        phone: '081200000010',
        occupation: 'Ibu Rumah Tangga',
        status: 'active',
        verifiedById: adminId,
        phonePublished: true,
      });
      await db.execute(
        `INSERT INTO household_members (household_id, resident_id, role, is_head) VALUES (?, ?, 'istri', 0)`,
        [kk2Id, dewiId]
      );
      await db.execute('UPDATE resident_profiles SET household_id = ?, household_role = ? WHERE id = ?', [kk2Id, 'istri', dewiId]);
      // Anak: Ahmad Santoso (NAMA SAMA dengan KK 1, untuk demonstrasi pencarian)
      const anak2Id = await ensureResident(db, {
        fullName: 'Ahmad Santoso',
        nik: '3201011001010002',
        kkNumber: '3201010303900003',
        birthDate: '2016-09-10',
        gender: 'L',
        address: 'Jl. Mawar No. 12',
        rt: '003', rw: '001',
        phone: null,
        occupation: 'Pelajar',
        status: 'active',
        verifiedById: adminId,
      });
      await db.execute(
        `INSERT INTO household_members (household_id, resident_id, role, is_head) VALUES (?, ?, 'anak', 0)`,
        [kk2Id, anak2Id]
      );
      await db.execute('UPDATE resident_profiles SET household_id = ?, household_role = ? WHERE id = ?', [kk2Id, 'anak', anak2Id]);
    } else if (exists.length > 0) {
      kk2Id = exists[0].id;
    }
  }

  // Buat KK 3 (Deden - pending)
  if (dedenRes.length > 0) {
    const exists = await db.query<{ id: number }>('SELECT id FROM households WHERE kk_number = ?', ['3201010404900004']);
    if (exists.length === 0) {
      const r = await db.execute(
        `INSERT INTO households (kk_number, address, rt, rw, dusun, head_resident_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['3201010404900004', 'Jl. Anggrek No. 3', '002', '001', 'Dusun Cibadak', dedenRes[0].id, 'KK Deden (pending)']
      );
      const kk3Id = (r as { insertId?: number }).insertId ?? 0;
      await db.execute(
        `INSERT INTO household_members (household_id, resident_id, role, is_head) VALUES (?, ?, 'kepala', 1)`,
        [kk3Id, dedenRes[0].id]
      );
      await db.execute('UPDATE resident_profiles SET household_id = ?, household_role = ? WHERE id = ?', [kk3Id, 'kepala', dedenRes[0].id]);
    }
  }
  console.log('[seed] Households (KK) dengan anggota terisi');

  // 13) Business categories
  const categories = [
    { name: 'Bengkel Motor', slug: 'bengkel-motor', icon: 'wrench', description: 'Jasa perbaikan sepeda motor' },
    { name: 'Bengkel Mobil', slug: 'bengkel-mobil', icon: 'truck', description: 'Jasa perbaikan mobil' },
    { name: 'Warung & Toko', slug: 'warung-toko', icon: 'shopping-cart', description: 'Warung, toko kelontong, minimarket' },
    { name: 'Servis Elektronik', slug: 'servis-elektronik', icon: 'cpu', description: 'Perbaikan TV, kulkas, AC, gadget' },
    { name: 'Tukang Bangunan', slug: 'tukang-bangunan', icon: 'hammer', description: 'Jasa bangunan dan renovasi' },
    { name: 'Jasa Pertanian', slug: 'jasa-pertanian', icon: 'sprout', description: 'Bibit, pupuk, olah lahan, panen' },
    { name: 'Jahit Pakaian', slug: 'jahit-pakaian', icon: 'scissors', description: 'Penjahit dan konveksi' },
    { name: 'Makanan & Minuman', slug: 'makanan-minuman', icon: 'utensils', description: 'Katering, jajanan, kedai' },
    { name: 'Jasa Transportasi', slug: 'jasa-transportasi', icon: 'truck', description: 'Ojek, angkutan, cargo' },
  ];
  for (const c of categories) {
    const exists = await db.query<{ id: number }>('SELECT id FROM business_categories WHERE slug = ?', [c.slug]);
    if (exists.length === 0) {
      await db.execute(
        `INSERT INTO business_categories (name, slug, icon, description, active, sort_order) VALUES (?, ?, ?, ?, 1, ?)`,
        [c.name, c.slug, c.icon, c.description, categories.indexOf(c)]
      );
    }
  }
  console.log('[seed] Business categories terisi');

  // 14) Resident businesses (Jasa & Usaha Warga) - beberapa contoh approved
  //     WhatsApp dummy jelas bukan nomor asli: 62812000000XX
  const catBengkelMotor = await db.query<{ id: number }>("SELECT id FROM business_categories WHERE slug = 'bengkel-motor'");
  const catWarung = await db.query<{ id: number }>("SELECT id FROM business_categories WHERE slug = 'warung-toko'");
  const catElektronik = await db.query<{ id: number }>("SELECT id FROM business_categories WHERE slug = 'servis-elektronik'");
  const catBangunan = await db.query<{ id: number }>("SELECT id FROM business_categories WHERE slug = 'tukang-bangunan'");
  const catMakanan = await db.query<{ id: number }>("SELECT id FROM business_categories WHERE slug = 'makanan-minuman'");
  const catJahit = await db.query<{ id: number }>("SELECT id FROM business_categories WHERE slug = 'jahit-pakaian'");

  const businesses = [
    {
      ownerId: budiRes[0]?.id,
      categoryId: catBengkelMotor[0]?.id,
      name: 'Bengkel Motor Bu Budi',
      description: 'Spesialis servis motor Honda, Yamaha, dan Suzuki. Tune up, ganti oli, ketok magic. Buka tiap hari 08.00-17.00.',
      whatsapp: '6281200000011',
      whatsappPublished: true,
      address: 'Jl. Melati No. 5, Dusun Cibadak',
      rt: '001', rw: '002',
      latitude: -6.4010, longitude: 106.7970,
      status: 'approved',
    },
    {
      ownerId: sitiRes[0]?.id,
      categoryId: catWarung[0]?.id,
      name: 'Warung Siti Lestari',
      description: 'Sembako, kebutuhan harian, dan jajanan anak. Harga ramah, pelayanan ramah.',
      whatsapp: '6281200000012',
      whatsappPublished: true,
      address: 'Jl. Melati No. 5A, Dusun Cibadak',
      rt: '001', rw: '002',
      latitude: -6.4012, longitude: 106.7972,
      status: 'approved',
    },
    {
      ownerId: agusRes[0]?.id,
      categoryId: catElektronik[0]?.id,
      name: 'Servis Elektronik Agus',
      description: 'Perbaikan TV, kulkas, AC, dan kipas angin. Garansi 1 bulan.',
      whatsapp: '6281200000013',
      whatsappPublished: true,
      address: 'Jl. Mawar No. 12, Dusun Sukamulya',
      rt: '003', rw: '001',
      latitude: -6.4050, longitude: 106.7990,
      status: 'approved',
    },
    {
      ownerId: null, // skip jika owner null
      categoryId: catBangunan[0]?.id,
      name: 'Tukang Bangunan Maju Jaya',
      description: 'Menerima pekerjaan bangunan, renovasi, dan genteng. Tim berpengalaman 10+ tahun.',
      whatsapp: '6281200000014',
      whatsappPublished: false, // tidak dipublikasi
      address: 'Dusun Cibadak',
      rt: '001', rw: '002',
      latitude: -6.4020, longitude: 106.7980,
      status: 'approved',
    },
    {
      ownerId: null,
      categoryId: catMakanan[0]?.id,
      name: 'Katering Bu Nur',
      description: 'Katering harian dan acara. Menu harian: nasi, lauk, sayur. Pesan H-1.',
      whatsapp: '6281200000015',
      whatsappPublished: true,
      address: 'Dusun Sukamulya',
      rt: '003', rw: '001',
      latitude: -6.4060, longitude: 106.7995,
      status: 'approved',
    },
    {
      ownerId: null,
      categoryId: catJahit[0]?.id,
      name: 'Penjahit Mode Cantik',
      description: 'Menerima jahit baju, kebaya, dan seragam. Ukuran custom.',
      whatsapp: '6281200000016',
      whatsappPublished: false,
      address: 'Dusun Cibadak',
      rt: '002', rw: '001',
      latitude: -6.4030, longitude: 106.7985,
      status: 'pending', // belum disetujui
    },
  ];

  for (const b of businesses) {
    if (!b.ownerId || !b.categoryId) continue; // skip jika owner/category tidak ditemukan
    const exists = await db.query<{ id: number }>('SELECT id FROM resident_businesses WHERE name = ?', [b.name]);
    if (exists.length === 0) {
      await db.execute(
        `INSERT INTO resident_businesses
         (owner_id, category_id, name, description, whatsapp, whatsapp_published, address, rt, rw, latitude, longitude, status, approved_by_id, approved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${b.status === 'approved' ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
        [b.ownerId, b.categoryId, b.name, b.description, b.whatsapp,
         b.whatsappPublished ? 1 : 0, b.address, b.rt, b.rw,
         b.latitude, b.longitude, b.status,
         b.status === 'approved' ? adminId : null]
      );
    }
  }
  console.log('[seed] Resident businesses terisi');

  // 15) Map locations (penanda peta desa)
  const mapLocations = [
    {
      name: 'Kantor Desa Sukamaju',
      type: 'kantor_desa',
      description: 'Kantor pusat pemerintahan Desa Sukamaju',
      latitude: -6.4000, longitude: 106.8000,
      address: 'Jl. Raya Sukamaju No. 1',
      icon: 'building',
    },
    {
      name: 'Balai Pertemuan Warga',
      type: 'fasilitas_umum',
      description: 'Balai untuk kegiatan warga, posyandu, dan pertemuan',
      latitude: -6.4015, longitude: 106.7985,
      address: 'Dusun Cibadak',
      icon: 'users',
    },
    {
      name: 'Puskesmas Pembantu',
      type: 'fasilitas_umum',
      description: 'Layanan kesehatan dasar untuk warga',
      latitude: -6.4025, longitude: 106.7995,
      address: 'Dusun Sukamulya',
      icon: 'heart',
    },
    {
      name: 'Lapangan Desa',
      type: 'fasilitas_umum',
      description: 'Lapangan olahraga dan kegiatan terbuka',
      latitude: -6.3995, longitude: 106.8010,
      address: 'Pusat desa',
      icon: 'flag',
    },
    {
      name: 'Batas Wilayah Utara',
      type: 'batas_desa',
      description: 'Batas utara Desa Sukamaju dengan desa tetangga',
      latitude: -6.3950, longitude: 106.8000,
      address: '',
      icon: 'map-pin',
    },
    {
      name: 'Batas Wilayah Selatan',
      type: 'batas_desa',
      description: 'Batas selatan Desa Sukamaju',
      latitude: -6.4080, longitude: 106.8000,
      address: '',
      icon: 'map-pin',
    },
  ];
  for (const m of mapLocations) {
    const exists = await db.query<{ id: number }>('SELECT id FROM map_locations WHERE name = ?', [m.name]);
    if (exists.length === 0) {
      await db.execute(
        `INSERT INTO map_locations (name, type, description, latitude, longitude, address, icon, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [m.name, m.type, m.description, m.latitude, m.longitude, m.address, m.icon]
      );
    }
  }
  console.log('[seed] Map locations terisi');

  // 16) Buat file peta contoh (PNG sederhana) agar tombol download berfungsi
  //     Catatan: file ini hanya placeholder demo, BUKAN batas desa resmi
  const fs = await import('fs');
  const path = await import('path');
  // Gunakan config.upload.dir agar konsisten dengan backend runtime
  const { config } = await import('../config/env');
  const storageDir = config.upload.dir;
  if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

  // Buat file PNG minimal valid (1x1 pixel) sebagai placeholder
  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
  );
  const mapFileName = 'peta-desa-sukamaju-demo.png';
  const mapFilePath = path.join(storageDir, mapFileName);
  if (!fs.existsSync(mapFilePath)) {
    fs.writeFileSync(mapFilePath, pngBuffer);
  }

  const mapFileExists = await db.query<{ id: number }>('SELECT id FROM map_files WHERE file_name = ?', [mapFileName]);
  if (mapFileExists.length === 0) {
    await db.execute(
      `INSERT INTO map_files (title, description, file_name, file_path, mime_type, file_size, attribution, uploaded_by_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Peta Desa Sukamaju (Demo)',
        'File peta demo placeholder untuk pengujian tombol download. BUKAN batas desa resmi. Ganti dengan peta resmi yang berlisensi.',
        mapFileName,
        mapFilePath,
        'image/png',
        pngBuffer.length,
        'Sumber: Pemerintah Desa Sukamaju (demo)',
        adminId,
      ]
    );
  }
  console.log('[seed] Map file demo terisi');

  console.log('[seed] Seeding selesai.');
  console.log('');
  console.log('Akun demo:');
  console.log('  Admin   : admin@sipedes.local / Admin12345');
  console.log('  Petugas : petugas@sipedes.local / Petugas123');
  console.log('  Warga   : login via NIK + password awal = tanggal lahir (DDMMYYYY)');
  console.log('           budi@sipedes.local  -> NIK 3201010101900001 / password: 01011990');
  console.log('           siti@sipedes.local  -> NIK 3201010202900002 / password: 02021990');
  console.log('           agus@sipedes.local  -> NIK 3201010303900003 / password: 03031990');
  console.log('  (pending) deden@sipedes.local -> NIK 3201010404900004 / password: 04041990');
  console.log('  Catatan: warga wajib ganti password setelah login pertama.');
}

async function ensureUser(
  db: Awaited<ReturnType<typeof getDb>>,
  params: {
    email: string;
    nik?: string | null;
    passwordHash: string;
    fullName: string;
    role: 'warga' | 'petugas' | 'admin';
    status: 'pending' | 'active' | 'rejected' | 'disabled';
    phone?: string;
  }
): Promise<number> {
  const existing = await db.query<{ id: number }>('SELECT id FROM users WHERE email = ?', [params.email]);
  if (existing.length > 0) return existing[0].id;
  const result = await db.execute(
    `INSERT INTO users (email, nik, password_hash, full_name, role, status, phone)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [params.email, params.nik ?? null, params.passwordHash, params.fullName, params.role, params.status, params.phone ?? null]
  );
  return (result as { insertId?: number }).insertId ?? 0;
}

// Helper untuk membuat resident_profile tanpa user (untuk anggota KK yang belum punya akun)
async function ensureResident(
  db: Awaited<ReturnType<typeof getDb>>,
  params: {
    fullName: string;
    nik: string;
    kkNumber: string;
    birthDate: string;
    gender: 'L' | 'P';
    address: string;
    rt: string;
    rw: string;
    phone?: string | null;
    occupation?: string;
    status: 'pending' | 'active' | 'rejected' | 'disabled';
    verifiedById?: number;
    phonePublished?: boolean;
  }
): Promise<number> {
  const existing = await db.query<{ id: number }>('SELECT id FROM resident_profiles WHERE nik = ?', [params.nik]);
  if (existing.length > 0) return existing[0].id;
  const result = await db.execute(
    `INSERT INTO resident_profiles
      (user_id, full_name, nik, kk_number, birth_date, gender, address, rt, rw, phone, occupation, status, verified_by_id, verified_at, phone_published)
     VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
    [params.fullName, params.nik, params.kkNumber, params.birthDate, params.gender,
     params.address, params.rt, params.rw, params.phone ?? null, params.occupation ?? null,
     params.status, params.verifiedById ?? null, params.phonePublished ? 1 : 0]
  );
  return (result as { insertId?: number }).insertId ?? 0;
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed] ERROR:', err);
    process.exit(1);
  });

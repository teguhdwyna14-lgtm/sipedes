-- =====================================================
-- Migration 002: NIK Login, Households, Businesses, Map (SQLite)
-- =====================================================

-- ----- Tambah kolom login NIK di users -----
ALTER TABLE users ADD COLUMN nik TEXT;
ALTER TABLE users ADD COLUMN password_changed_at TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nik ON users(nik) WHERE nik IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_nik_lookup ON users(nik);

-- ----- households (Kartu Keluarga) -----
CREATE TABLE IF NOT EXISTS households (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kk_number TEXT UNIQUE,
  address TEXT NOT NULL,
  rt TEXT,
  rw TEXT,
  dusun TEXT,
  head_resident_id INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (head_resident_id) REFERENCES resident_profiles(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_household_rt_rw ON households(rt, rw);
CREATE INDEX IF NOT EXISTS idx_household_dusun ON households(dusun);

-- ----- household_members (relasi anggota KK) -----
CREATE TABLE IF NOT EXISTS household_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  household_id INTEGER NOT NULL,
  resident_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'lainnya' CHECK (role IN ('kepala','istri','anak','cucu','orang_tua','famili_lain','pembantu','lainnya')),
  is_head INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (household_id, resident_id),
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  FOREIGN KEY (resident_id) REFERENCES resident_profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_hm_household ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_hm_resident ON household_members(resident_id);

-- ----- Tambah kolom household_id di resident_profiles -----
ALTER TABLE resident_profiles ADD COLUMN household_id INTEGER REFERENCES households(id) ON DELETE SET NULL;
ALTER TABLE resident_profiles ADD COLUMN household_role TEXT CHECK (household_role IS NULL OR household_role IN ('kepala','istri','anak','cucu','orang_tua','famili_lain','pembantu','lainnya'));
ALTER TABLE resident_profiles ADD COLUMN phone_published INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_resident_household ON resident_profiles(household_id);

-- ----- business_categories -----
CREATE TABLE IF NOT EXISTS business_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bizcat_active ON business_categories(active);
CREATE INDEX IF NOT EXISTS idx_bizcat_sort ON business_categories(sort_order);

-- ----- resident_businesses (Jasa & Usaha Warga) -----
CREATE TABLE IF NOT EXISTS resident_businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  whatsapp TEXT,
  whatsapp_published INTEGER NOT NULL DEFAULT 1,
  address TEXT,
  rt TEXT,
  rw TEXT,
  photo_url TEXT,
  latitude REAL,
  longitude REAL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','disabled')),
  rejection_note TEXT,
  approved_by_id INTEGER,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (owner_id) REFERENCES resident_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES business_categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_biz_status ON resident_businesses(status);
CREATE INDEX IF NOT EXISTS idx_biz_owner ON resident_businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_biz_category ON resident_businesses(category_id);
CREATE INDEX IF NOT EXISTS idx_biz_name ON resident_businesses(name);

-- ----- map_locations -----
CREATE TABLE IF NOT EXISTS map_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'lainnya' CHECK (type IN ('kantor_desa','fasilitas_umum','usaha_warga','batas_desa','lainnya')),
  description TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  address TEXT,
  icon TEXT,
  linked_business_id INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (linked_business_id) REFERENCES resident_businesses(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_map_type ON map_locations(type);
CREATE INDEX IF NOT EXISTS idx_map_active ON map_locations(active);

-- ----- map_files -----
CREATE TABLE IF NOT EXISTS map_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  attribution TEXT,
  uploaded_by_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (uploaded_by_id) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_mapfile_created ON map_files(created_at);

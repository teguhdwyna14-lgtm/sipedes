-- =====================================================
-- Migration 003: Allow nullable user_id di resident_profiles
-- Diperlukan karena anggota KK (anak, famili) belum tentu punya akun user
-- =====================================================

-- SQLite tidak mendukung ALTER COLUMN, jadi recreate table
-- Untuk MySQL, gunakan ALTER TABLE langsung

-- ----- MySQL version -----
-- ALTER TABLE resident_profiles MODIFY user_id INT NULL;

-- ----- SQLite version -----
-- Recreate table dengan user_id nullable
CREATE TABLE resident_profiles_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  nik TEXT UNIQUE,
  kk_number TEXT,
  full_name TEXT NOT NULL,
  birth_date TEXT,
  gender TEXT CHECK (gender IN ('L','P')),
  address TEXT,
  rt TEXT,
  rw TEXT,
  phone TEXT,
  occupation TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','rejected','disabled')),
  verified_by_id INTEGER,
  verified_at TEXT,
  rejection_note TEXT,
  household_id INTEGER REFERENCES households(id) ON DELETE SET NULL,
  household_role TEXT CHECK (household_role IS NULL OR household_role IN ('kepala','istri','anak','cucu','orang_tua','famili_lain','pembantu','lainnya')),
  phone_published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE SET NULL
);

INSERT INTO resident_profiles_new (id, user_id, nik, kk_number, full_name, birth_date, gender, address, rt, rw, phone, occupation, status, verified_by_id, verified_at, rejection_note, household_id, household_role, phone_published, created_at, updated_at)
SELECT id, user_id, nik, kk_number, full_name, birth_date, gender, address, rt, rw, phone, occupation, status, verified_by_id, verified_at, rejection_note, household_id, household_role, phone_published, created_at, updated_at
FROM resident_profiles;

DROP TABLE resident_profiles;
ALTER TABLE resident_profiles_new RENAME TO resident_profiles;
CREATE INDEX IF NOT EXISTS idx_resident_status ON resident_profiles(status);
CREATE INDEX IF NOT EXISTS idx_resident_rt_rw ON resident_profiles(rt, rw);
CREATE INDEX IF NOT EXISTS idx_resident_household ON resident_profiles(household_id);

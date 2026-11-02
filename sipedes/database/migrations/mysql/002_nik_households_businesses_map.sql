-- =====================================================
-- Migration 002: NIK Login, Households, Businesses, Map
-- Revisi SIPEDES - menambah modul baru tanpa merusak skema lama
-- =====================================================

-- ----- Tambah kolom login NIK di users -----
ALTER TABLE users
  ADD COLUMN nik VARCHAR(32) NULL UNIQUE AFTER email,
  ADD COLUMN password_changed_at TIMESTAMP NULL AFTER password_hash;

-- Buat index untuk pencarian NIK
CREATE INDEX idx_users_nik ON users(nik);

-- ----- households (Kartu Keluarga) -----
CREATE TABLE IF NOT EXISTS households (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kk_number VARCHAR(32) NULL UNIQUE,
  address VARCHAR(255) NOT NULL,
  rt VARCHAR(5) NULL,
  rw VARCHAR(5) NULL,
  dusun VARCHAR(100) NULL,
  head_resident_id INT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_household_head FOREIGN KEY (head_resident_id) REFERENCES resident_profiles(id) ON DELETE SET NULL,
  INDEX idx_household_rt_rw (rt, rw),
  INDEX idx_household_dusun (dusun)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----- household_members (relasi anggota KK) -----
CREATE TABLE IF NOT EXISTS household_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  household_id INT NOT NULL,
  resident_id INT NOT NULL,
  role ENUM('kepala','istri','anak','cucu','orang_tua','famili_lain','pembantu','lainnya') NOT NULL DEFAULT 'lainnya',
  is_head TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_household_resident (household_id, resident_id),
  CONSTRAINT fk_hm_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  CONSTRAINT fk_hm_resident FOREIGN KEY (resident_id) REFERENCES resident_profiles(id) ON DELETE CASCADE,
  INDEX idx_hm_household (household_id),
  INDEX idx_hm_resident (resident_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----- Tambah kolom household_id di resident_profiles (opsional, FK) -----
ALTER TABLE resident_profiles
  ADD COLUMN household_id INT NULL AFTER kk_number,
  ADD COLUMN household_role ENUM('kepala','istri','anak','cucu','orang_tua','famili_lain','pembantu','lainnya') NULL AFTER household_id,
  ADD COLUMN phone_published TINYINT(1) NOT NULL DEFAULT 0 AFTER phone,
  ADD CONSTRAINT fk_resident_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE SET NULL,
  ADD INDEX idx_resident_household (household_id);

-- ----- business_categories -----
CREATE TABLE IF NOT EXISTS business_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  icon VARCHAR(50) NULL,
  description TEXT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_bizcat_active (active),
  INDEX idx_bizcat_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----- resident_businesses (Jasa & Usaha Warga) -----
CREATE TABLE IF NOT EXISTS resident_businesses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  category_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  whatsapp VARCHAR(30) NULL,
  whatsapp_published TINYINT(1) NOT NULL DEFAULT 1,
  address VARCHAR(255) NULL,
  rt VARCHAR(5) NULL,
  rw VARCHAR(5) NULL,
  photo_url VARCHAR(500) NULL,
  latitude DECIMAL(10, 7) NULL,
  longitude DECIMAL(10, 7) NULL,
  status ENUM('pending','approved','rejected','disabled') NOT NULL DEFAULT 'pending',
  rejection_note VARCHAR(500) NULL,
  approved_by_id INT NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_biz_owner FOREIGN KEY (owner_id) REFERENCES resident_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_biz_category FOREIGN KEY (category_id) REFERENCES business_categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_biz_approved_by FOREIGN KEY (approved_by_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_biz_status (status),
  INDEX idx_biz_owner (owner_id),
  INDEX idx_biz_category (category_id),
  INDEX idx_biz_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----- map_locations (penanda peta desa) -----
CREATE TABLE IF NOT EXISTS map_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  type ENUM('kantor_desa','fasilitas_umum','usaha_warga','batas_desa','lainnya') NOT NULL DEFAULT 'lainnya',
  description TEXT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  address VARCHAR(255) NULL,
  icon VARCHAR(50) NULL,
  linked_business_id INT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_map_biz FOREIGN KEY (linked_business_id) REFERENCES resident_businesses(id) ON DELETE SET NULL,
  INDEX idx_map_type (type),
  INDEX idx_map_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----- map_files (file peta untuk diunduh) -----
CREATE TABLE IF NOT EXISTS map_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  attribution VARCHAR(255) NULL,
  uploaded_by_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mapfile_uploader FOREIGN KEY (uploaded_by_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_mapfile_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

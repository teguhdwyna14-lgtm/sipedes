-- =====================================================
-- Migration 001: Initial Schema (MySQL / InnoDB / utf8mb4)
-- =====================================================

-- ----- roles -----
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----- users -----
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  role ENUM('warga','petugas','admin') NOT NULL DEFAULT 'warga',
  status ENUM('pending','active','rejected','disabled') NOT NULL DEFAULT 'pending',
  phone VARCHAR(30) NULL,
  avatar_url VARCHAR(500) NULL,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----- user_roles (multi-role optional) -----
CREATE TABLE IF NOT EXISTS user_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  UNIQUE KEY uq_user_role (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----- resident_profiles -----
CREATE TABLE IF NOT EXISTS resident_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  nik VARCHAR(32) NULL UNIQUE,
  kk_number VARCHAR(32) NULL,
  full_name VARCHAR(150) NOT NULL,
  birth_date DATE NULL,
  gender ENUM('L','P') NULL,
  address VARCHAR(255) NULL,
  rt VARCHAR(5) NULL,
  rw VARCHAR(5) NULL,
  phone VARCHAR(30) NULL,
  occupation VARCHAR(100) NULL,
  status ENUM('pending','active','rejected','disabled') NOT NULL DEFAULT 'pending',
  verified_by_id INT NULL,
  verified_at TIMESTAMP NULL,
  rejection_note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_resident_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_resident_verified_by FOREIGN KEY (verified_by_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_resident_status (status),
  INDEX idx_resident_rt_rw (rt, rw)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----- village_settings -----
CREATE TABLE IF NOT EXISTS village_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  village_name VARCHAR(150) NOT NULL,
  district VARCHAR(150) NULL,
  regency VARCHAR(150) NULL,
  province VARCHAR(150) NULL,
  address VARCHAR(255) NULL,
  postal_code VARCHAR(10) NULL,
  phone VARCHAR(30) NULL,
  email VARCHAR(150) NULL,
  website VARCHAR(255) NULL,
  logo_url VARCHAR(500) NULL,
  history TEXT NULL,
  vision TEXT NULL,
  mission TEXT NULL,
  geography TEXT NULL,
  potential TEXT NULL,
  working_hours VARCHAR(255) NULL,
  map_embed TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----- news -----
CREATE TABLE IF NOT EXISTS news (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  excerpt VARCHAR(500) NULL,
  content TEXT NOT NULL,
  category VARCHAR(100) NULL,
  image_url VARCHAR(500) NULL,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  author_id INT NOT NULL,
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_news_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_news_status (status),
  INDEX idx_news_category (category),
  INDEX idx_news_published (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----- announcements -----
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  pinned TINYINT(1) NOT NULL DEFAULT 0,
  author_id INT NOT NULL,
  published_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_announcement_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_announcement_status (status),
  INDEX idx_announcement_pinned (pinned)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----- service_types -----
CREATE TABLE IF NOT EXISTS service_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  requirements TEXT NOT NULL,
  processing_days INT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_service_type_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----- service_requests -----
CREATE TABLE IF NOT EXISTS service_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_number VARCHAR(50) NOT NULL UNIQUE,
  service_type_id INT NOT NULL,
  user_id INT NOT NULL,
  purpose TEXT NOT NULL,
  notes TEXT NULL,
  status ENUM('diajukan','dalam_pemeriksaan','perlu_perbaikan','disetujui','ditolak','selesai') NOT NULL DEFAULT 'diajukan',
  rejection_reason VARCHAR(500) NULL,
  processed_by_id INT NULL,
  processed_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_request_service_type FOREIGN KEY (service_type_id) REFERENCES service_types(id) ON DELETE RESTRICT,
  CONSTRAINT fk_request_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_request_processed_by FOREIGN KEY (processed_by_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_request_status (status),
  INDEX idx_request_user (user_id),
  INDEX idx_request_type (service_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----- service_request_attachments -----
CREATE TABLE IF NOT EXISTS service_request_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attachment_request FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
  INDEX idx_attachment_request (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----- service_request_events -----
CREATE TABLE IF NOT EXISTS service_request_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  from_status ENUM('diajukan','dalam_pemeriksaan','perlu_perbaikan','disetujui','ditolak','selesai') NULL,
  to_status ENUM('diajukan','dalam_pemeriksaan','perlu_perbaikan','disetujui','ditolak','selesai') NOT NULL,
  note VARCHAR(500) NULL,
  created_by_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_event_request FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_created_by FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_event_request (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----- complaints -----
CREATE TABLE IF NOT EXISTS complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tracking_code VARCHAR(50) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NULL,
  status ENUM('baru','diterima','diproses','selesai','ditutup') NOT NULL DEFAULT 'baru',
  is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_complaint_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_complaint_status (status),
  INDEX idx_complaint_user (user_id),
  INDEX idx_complaint_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----- complaint_updates -----
CREATE TABLE IF NOT EXISTS complaint_updates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  status ENUM('baru','diterima','diproses','selesai','ditutup') NOT NULL,
  note VARCHAR(500) NULL,
  created_by_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_update_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_update_created_by FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_update_complaint (complaint_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----- documents -----
CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  category VARCHAR(100) NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  owner_id INT NULL,
  request_id INT NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  uploaded_by_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_document_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_document_request FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE SET NULL,
  CONSTRAINT fk_document_uploaded_by FOREIGN KEY (uploaded_by_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_document_category (category),
  INDEX idx_document_owner (owner_id),
  INDEX idx_document_public (is_public)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----- activity_logs -----
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100) NULL,
  entity_id INT NULL,
  description VARCHAR(500) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_log_user (user_id),
  INDEX idx_log_entity (entity),
  INDEX idx_log_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----- notifications -----
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info','success','warning','error') NOT NULL DEFAULT 'info',
  read TINYINT(1) NOT NULL DEFAULT 0,
  link VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notification_user_read (user_id, read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----- password_reset_tokens -----
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_reset_token (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

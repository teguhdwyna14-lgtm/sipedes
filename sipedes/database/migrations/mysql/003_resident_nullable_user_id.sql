-- =====================================================
-- Migration 003: Allow nullable user_id di resident_profiles (MySQL)
-- Diperlukan karena anggota KK (anak, famili) belum tentu punya akun user
-- =====================================================

ALTER TABLE resident_profiles MODIFY user_id INT NULL;

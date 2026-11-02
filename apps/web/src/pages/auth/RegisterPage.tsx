// Halaman registrasi warga baru

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../lib/api';
import { useToastStore } from '../../store/toastStore';
import { ToastContainer } from '../../components/ui/ToastContainer';

interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phone: string;
  nik: string;
  kkNumber: string;
  birthDate: string;
  address: string;
  rt: string;
  rw: string;
}

const EMPTY: RegisterForm = {
  email: '', password: '', confirmPassword: '', fullName: '',
  phone: '', nik: '', kkNumber: '', birthDate: '',
  address: '', rt: '', rw: '',
};

export function RegisterPage() {
  const toast = useToastStore();
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterForm>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<RegisterForm>>({});

  const validate = (): boolean => {
    const e: Partial<RegisterForm> = {};
    if (!form.fullName.trim()) e.fullName = 'Nama lengkap wajib diisi';
    if (!form.email.trim()) {
      e.email = 'Email wajib diisi';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Format email tidak valid';
    }
    if (!form.password) {
      e.password = 'Password wajib diisi';
    } else if (form.password.length < 8) {
      e.password = 'Password minimal 8 karakter';
    } else if (!/[a-zA-Z]/.test(form.password) || !/\d/.test(form.password)) {
      e.password = 'Password harus mengandung huruf dan angka';
    }
    if (form.password !== form.confirmPassword) {
      e.confirmPassword = 'Konfirmasi password tidak cocok';
    }
    if (!form.rt.trim()) e.rt = 'RT wajib diisi';
    if (!form.rw.trim()) e.rw = 'RW wajib diisi';
    if (form.nik && !/^\d{16}$/.test(form.nik)) {
      e.nik = 'NIK harus 16 digit angka';
    }
    if (form.kkNumber && !/^\d{16}$/.test(form.kkNumber)) {
      e.kkNumber = 'No. KK harus 16 digit angka';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (field: keyof RegisterForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        phone: form.phone || undefined,
        nik: form.nik || undefined,
        kkNumber: form.kkNumber || undefined,
        birthDate: form.birthDate || undefined,
        address: form.address || undefined,
        rt: form.rt,
        rw: form.rw,
      };
      const res = await api.post('/auth/register', payload);
      if (res.data.success) {
        toast.success('Pendaftaran berhasil. Akun Anda menunggu verifikasi petugas.');
        navigate('/login', { replace: true });
      } else {
        toast.error(res.data.message || 'Pendaftaran gagal');
      }
    } catch (err) {
      let msg = 'Pendaftaran gagal. Silakan coba lagi.';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-800 to-forest-950 py-10 px-4">
      <ToastContainer />
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-gold-500 flex items-center justify-center font-bold text-forest-950 text-xl">
            SP
          </div>
          <div className="text-left">
            <div className="font-display font-bold text-lg text-cream-50">SIPEDES</div>
            <div className="text-[10px] text-cream-300">Sistem Informasi & Pelayanan Desa</div>
          </div>
        </Link>

        <div className="card p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-forest-900 mb-1">Daftar Akun Warga</h1>
          <p className="text-sm text-forest-600 mb-4">Buat akun untuk mengakses layanan online desa.</p>

          {/* Info box */}
          <div className="bg-gold-50 border border-gold-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <svg className="w-5 h-5 text-gold-700 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-forest-800">
              Akun warga baru perlu diverifikasi petugas sebelum dapat login.
              Pastikan data yang Anda masukkan benar dan sesuai dokumen resmi.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="fullName">Nama Lengkap <span className="text-red-600">*</span></label>
                <input
                  id="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  className={`input ${errors.fullName ? 'input-error' : ''}`}
                  placeholder="Sesuai KTP"
                />
                {errors.fullName && <p className="error-text">{errors.fullName}</p>}
              </div>

              <div>
                <label className="label" htmlFor="email">Email <span className="text-red-600">*</span></label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  placeholder="email@contoh.com"
                />
                {errors.email && <p className="error-text">{errors.email}</p>}
              </div>

              <div>
                <label className="label" htmlFor="phone">No. Telepon</label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="input"
                  placeholder="08xxxxxxxxxx"
                />
                <p className="help-text">Opsional</p>
              </div>

              <div>
                <label className="label" htmlFor="password">Password <span className="text-red-600">*</span></label>
                <input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className={`input ${errors.password ? 'input-error' : ''}`}
                  placeholder="Min. 8 karakter, huruf & angka"
                />
                {errors.password && <p className="error-text">{errors.password}</p>}
              </div>

              <div>
                <label className="label" htmlFor="confirmPassword">Konfirmasi Password <span className="text-red-600">*</span></label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
                  placeholder="Ulangi password"
                />
                {errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}
              </div>

              <div>
                <label className="label" htmlFor="nik">NIK</label>
                <input
                  id="nik"
                  type="text"
                  maxLength={16}
                  value={form.nik}
                  onChange={(e) => handleChange('nik', e.target.value.replace(/\D/g, ''))}
                  className={`input ${errors.nik ? 'input-error' : ''}`}
                  placeholder="16 digit angka"
                />
                {errors.nik && <p className="error-text">{errors.nik}</p>}
                <p className="help-text">Opsional, 16 digit</p>
              </div>

              <div>
                <label className="label" htmlFor="kkNumber">No. Kartu Keluarga</label>
                <input
                  id="kkNumber"
                  type="text"
                  maxLength={16}
                  value={form.kkNumber}
                  onChange={(e) => handleChange('kkNumber', e.target.value.replace(/\D/g, ''))}
                  className={`input ${errors.kkNumber ? 'input-error' : ''}`}
                  placeholder="16 digit angka"
                />
                {errors.kkNumber && <p className="error-text">{errors.kkNumber}</p>}
                <p className="help-text">Opsional, 16 digit</p>
              </div>

              <div>
                <label className="label" htmlFor="birthDate">Tanggal Lahir</label>
                <input
                  id="birthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => handleChange('birthDate', e.target.value)}
                  className="input"
                />
                <p className="help-text">Opsional</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="rt">RT <span className="text-red-600">*</span></label>
                  <input
                    id="rt"
                    type="text"
                    value={form.rt}
                    onChange={(e) => handleChange('rt', e.target.value)}
                    className={`input ${errors.rt ? 'input-error' : ''}`}
                    placeholder="001"
                  />
                  {errors.rt && <p className="error-text">{errors.rt}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="rw">RW <span className="text-red-600">*</span></label>
                  <input
                    id="rw"
                    type="text"
                    value={form.rw}
                    onChange={(e) => handleChange('rw', e.target.value)}
                    className={`input ${errors.rw ? 'input-error' : ''}`}
                    placeholder="001"
                  />
                  {errors.rw && <p className="error-text">{errors.rw}</p>}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="label" htmlFor="address">Alamat Lengkap</label>
                <textarea
                  id="address"
                  rows={2}
                  value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="input"
                  placeholder="Alamat domisili"
                />
                <p className="help-text">Opsional</p>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Memproses...' : 'Daftar Sekarang'}
            </button>
          </form>

          <p className="text-sm text-forest-600 text-center mt-6">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-forest-700 font-semibold hover:text-forest-900">
              Masuk di sini
            </Link>
          </p>
        </div>

        <p className="text-center text-cream-300 text-xs mt-6">
          <Link to="/" className="hover:text-gold-300">&larr; Kembali ke Beranda</Link>
        </p>
      </div>
    </div>
  );
}

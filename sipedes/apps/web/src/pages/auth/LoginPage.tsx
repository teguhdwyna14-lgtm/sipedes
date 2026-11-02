// Halaman login - mendukung login NIK (warga) & email (petugas/admin)

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../lib/api';
import type { AuthResponse } from '@sipedes/shared';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { ToastContainer } from '../../components/ui/ToastContainer';
import { cn } from '../../lib/utils';

type Mode = 'nik' | 'email';

interface FieldErrors {
  nik?: string;
  email?: string;
  password?: string;
}

export function LoginPage() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const toast = useToastStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');

  const [mode, setMode] = useState<Mode>('nik');
  const [nik, setNik] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const validate = (): boolean => {
    const newErrors: FieldErrors = {};
    if (mode === 'nik') {
      if (!nik.trim()) newErrors.nik = 'NIK wajib diisi';
      else if (!/^\d{16}$/.test(nik.trim())) newErrors.nik = 'NIK harus 16 digit angka';
    } else {
      if (!email.trim()) newErrors.email = 'Email wajib diisi';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Format email tidak valid';
    }
    if (!password) newErrors.password = 'Password wajib diisi';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const redirectAfterLogin = (data: AuthResponse) => {
    if (redirect) {
      navigate(redirect, { replace: true });
      return;
    }
    if (data.mustChangePassword) {
      navigate('/force-change-password', { replace: true });
      return;
    }
    const role = data.user.role;
    navigate(role === 'admin' || role === 'petugas' ? '/staff' : '/warga', { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const endpoint = mode === 'nik' ? '/auth/login-nik' : '/auth/login';
      const payload = mode === 'nik' ? { nik: nik.trim(), password } : { email: email.trim(), password };
      const res = await api.post(endpoint, payload);
      if (res.data.success && res.data.data) {
        const data = res.data.data as AuthResponse;
        setAuth(data);
        toast.success(`Selamat datang, ${data.user.fullName}!`);
        redirectAfterLogin(data);
      } else {
        toast.error(res.data.message || 'Login gagal');
      }
    } catch (err) {
      let msg = 'Login gagal. Periksa kredensial Anda.';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-forest-800 to-forest-950 p-4">
      <ToastContainer />
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-lg bg-gold-500 flex items-center justify-center font-bold text-forest-950 text-xl">
            SP
          </div>
          <div className="text-left">
            <div className="font-display font-bold text-lg text-cream-50">SIPEDES</div>
            <div className="text-[10px] text-cream-300">Sistem Informasi & Pelayanan Desa</div>
          </div>
        </Link>

        <div className="card p-8">
          <h1 className="text-2xl font-bold text-forest-900 mb-1">Masuk ke Akun</h1>
          <p className="text-sm text-forest-600 mb-6">Silakan masuk untuk mengakses layanan desa.</p>

          {/* Toggle mode */}
          <div className="flex gap-1 p-1 bg-cream-100 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => switchMode('nik')}
              className={cn(
                'flex-1 py-2 text-sm font-semibold rounded-md transition-colors',
                mode === 'nik' ? 'bg-white text-forest-800 shadow-sm' : 'text-forest-600 hover:text-forest-800'
              )}
            >
              Login NIK (Warga)
            </button>
            <button
              type="button"
              onClick={() => switchMode('email')}
              className={cn(
                'flex-1 py-2 text-sm font-semibold rounded-md transition-colors',
                mode === 'email' ? 'bg-white text-forest-800 shadow-sm' : 'text-forest-600 hover:text-forest-800'
              )}
            >
              Login Email (Petugas)
            </button>
          </div>

          {mode === 'nik' && (
            <div className="mb-5 p-3 bg-gold-50 border border-gold-200 rounded-lg text-xs text-gold-900">
              <p className="font-semibold mb-1">Informasi Login NIK</p>
              <p>Password awal adalah tanggal lahir (format DDMMYYYY). Anda wajib mengganti password setelah login pertama.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'nik' ? (
              <div>
                <label className="label" htmlFor="nik">NIK (16 digit)</label>
                <input
                  id="nik"
                  type="text"
                  inputMode="numeric"
                  value={nik}
                  onChange={(e) => setNik(e.target.value.replace(/\D/g, '').slice(0, 16))}
                  className={cn('input', errors.nik && 'input-error')}
                  placeholder="16 digit NIK pada KTP"
                  autoComplete="username"
                  maxLength={16}
                  autoFocus
                />
                <p className="help-text">{nik.length}/16 digit</p>
                {errors.nik && <p className="error-text">{errors.nik}</p>}
              </div>
            ) : (
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn('input', errors.email && 'input-error')}
                  placeholder="email@contoh.com"
                  autoComplete="email"
                  autoFocus
                />
                {errors.email && <p className="error-text">{errors.email}</p>}
              </div>
            )}

            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn('input', errors.password && 'input-error')}
                placeholder="Masukkan password"
                autoComplete="current-password"
              />
              {errors.password && <p className="error-text">{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <p className="text-sm text-forest-600 text-center mt-6">
            Belum punya akun?{' '}
            <Link to="/register" className="text-forest-700 font-semibold hover:text-forest-900">
              Daftar di sini
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

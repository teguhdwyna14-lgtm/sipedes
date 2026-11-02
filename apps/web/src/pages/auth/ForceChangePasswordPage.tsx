// Halaman wajib ganti password setelah login pertama

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { ToastContainer } from '../../components/ui/ToastContainer';
import { cn } from '../../lib/utils';

interface FieldErrors {
  newPassword?: string;
  confirmPassword?: string;
}

export function ForceChangePasswordPage() {
  const { user, isAuthenticated, mustChangePassword, clearMustChangePassword } = useAuthStore();
  const toast = useToastStore();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Redirect: jika tidak ada token atau tidak wajib ganti password, arahkan sesuai role
  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login', { replace: true });
      return;
    }
    if (!mustChangePassword) {
      navigate(user.role === 'admin' || user.role === 'petugas' ? '/staff' : '/warga', { replace: true });
    }
  }, [isAuthenticated, user, mustChangePassword, navigate]);

  const validate = (): boolean => {
    const newErrors: FieldErrors = {};
    if (!newPassword) newErrors.newPassword = 'Password baru wajib diisi';
    else if (newPassword.length < 8) newErrors.newPassword = 'Password minimal 8 karakter';
    else if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      newErrors.newPassword = 'Password harus mengandung huruf dan angka';
    }
    if (!confirmPassword) newErrors.confirmPassword = 'Konfirmasi password wajib diisi';
    else if (confirmPassword !== newPassword) newErrors.confirmPassword = 'Konfirmasi password tidak cocok';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/force-change-password', { newPassword, confirmPassword });
      if (res.data.success) {
        clearMustChangePassword();
        toast.success('Password berhasil diubah. Silakan lanjutkan.');
        if (user) {
          navigate(user.role === 'admin' || user.role === 'petugas' ? '/staff' : '/warga', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      } else {
        toast.error(res.data.message || 'Gagal mengubah password');
      }
    } catch (err) {
      let msg = 'Gagal mengubah password';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-2xl font-bold text-forest-900 mb-1">Ganti Password Awal</h1>
          <p className="text-sm text-forest-600 mb-6">
            Halo, <span className="font-semibold">{user?.fullName}</span>. Anda wajib mengganti password sebelum dapat mengakses layanan.
          </p>

          <div className="mb-5 p-3 bg-gold-50 border border-gold-200 rounded-lg text-xs text-gold-900">
            <p>Password awal Anda adalah tanggal lahir. Demi keamanan, silakan buat password baru yang kuat dan mudah diingat.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="newPassword">Password Baru</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={cn('input', errors.newPassword && 'input-error')}
                placeholder="Min. 8 karakter, huruf & angka"
                autoComplete="new-password"
                autoFocus
              />
              <p className="help-text">Minimal 8 karakter, harus mengandung huruf dan angka.</p>
              {errors.newPassword && <p className="error-text">{errors.newPassword}</p>}
            </div>

            <div>
              <label className="label" htmlFor="confirmPassword">Konfirmasi Password Baru</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={cn('input', errors.confirmPassword && 'input-error')}
                placeholder="Ulangi password baru"
                autoComplete="new-password"
              />
              {errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Memproses...' : 'Ubah Password & Lanjut'}
            </button>
          </form>
        </div>

        <p className="text-center text-cream-300 text-xs mt-6">
          <Link to="/" className="hover:text-gold-300">&larr; Kembali ke Beranda</Link>
        </p>
      </div>
    </div>
  );
}

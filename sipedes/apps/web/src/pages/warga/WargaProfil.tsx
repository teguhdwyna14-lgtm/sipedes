// Profil warga - info akun, data warga, ubah password

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { api } from '../../lib/api';
import type { ResidentProfile, AuthUser } from '@sipedes/shared';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { LoadingState, ErrorState } from '../../components/ui';
import { formatDate, getStatusBadgeClass, statusLabel } from '../../lib/utils';

interface ProfileResponse {
  user: AuthUser;
  resident: ResidentProfile | null;
}

interface ProfileForm {
  fullName: string;
  phone: string;
}

interface ResidentForm {
  nik: string;
  kkNumber: string;
  birthDate: string;
  address: string;
  rt: string;
  rw: string;
}

interface PasswordForm {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function WargaProfil() {
  const { user, updateUser } = useAuthStore();
  const toast = useToastStore();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState<ProfileForm>({ fullName: '', phone: '' });
  const [residentForm, setResidentForm] = useState<ResidentForm>({ nik: '', kkNumber: '', birthDate: '', address: '', rt: '', rw: '' });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({ oldPassword: '', newPassword: '', confirmPassword: '' });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingResident, setSavingResident] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwErrors, setPwErrors] = useState<Partial<PasswordForm>>({});

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        const data = res.data.data as ProfileResponse;
        setProfile(data);
        setProfileForm({
          fullName: data.user.fullName ?? '',
          phone: data.user.phone ?? '',
        });
        if (data.resident) {
          setResidentForm({
            nik: data.resident.nik ?? '',
            kkNumber: data.resident.kkNumber ?? '',
            birthDate: data.resident.birthDate ? data.resident.birthDate.split('T')[0] : '',
            address: data.resident.address ?? '',
            rt: data.resident.rt ?? '',
            rw: data.resident.rw ?? '',
          });
        }
      } else {
        setError(res.data.message || 'Gagal memuat profil');
      }
    } catch (err) {
      let msg = 'Gagal memuat profil';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const isVerified = (profile?.resident?.status ?? user?.status) === 'active';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.patch('/auth/me', {
        fullName: profileForm.fullName.trim(),
        phone: profileForm.phone.trim() || undefined,
      });
      if (res.data.success) {
        updateUser({ fullName: profileForm.fullName.trim(), phone: profileForm.phone.trim() });
        toast.success('Profil berhasil diperbarui');
      } else {
        toast.error(res.data.message || 'Gagal menyimpan');
      }
    } catch (err) {
      let msg = 'Gagal menyimpan profil';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveResident = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingResident(true);
    try {
      const res = await api.patch('/auth/me', {
        nik: residentForm.nik || undefined,
        kkNumber: residentForm.kkNumber || undefined,
        birthDate: residentForm.birthDate || undefined,
        address: residentForm.address || undefined,
        rt: residentForm.rt || undefined,
        rw: residentForm.rw || undefined,
      });
      if (res.data.success) {
        toast.success('Data warga berhasil diperbarui');
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal menyimpan');
      }
    } catch (err) {
      let msg = 'Gagal menyimpan data warga';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      setSavingResident(false);
    }
  };

  const validatePassword = (): boolean => {
    const e: Partial<PasswordForm> = {};
    if (!passwordForm.oldPassword) e.oldPassword = 'Password lama wajib diisi';
    if (!passwordForm.newPassword) e.newPassword = 'Password baru wajib diisi';
    else if (passwordForm.newPassword.length < 8) e.newPassword = 'Password minimal 8 karakter';
    else if (!/[a-zA-Z]/.test(passwordForm.newPassword) || !/\d/.test(passwordForm.newPassword)) {
      e.newPassword = 'Password harus mengandung huruf dan angka';
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      e.confirmPassword = 'Konfirmasi password tidak cocok';
    }
    setPwErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword()) return;
    setSavingPassword(true);
    try {
      const res = await api.post('/auth/change-password', {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });
      if (res.data.success) {
        toast.success('Password berhasil diubah');
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(res.data.message || 'Gagal mengubah password');
      }
    } catch (err) {
      let msg = 'Gagal mengubah password';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <LoadingState message="Memuat profil..." />;
  if (error) return <ErrorState message={error} onRetry={fetch} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-forest-900">Profil Saya</h1>
        <p className="text-sm text-forest-600 mt-1">Kelola informasi akun dan data warga Anda.</p>
      </div>

      {/* Status verifikasi */}
      <div className="card p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-forest-700 text-cream-50 flex items-center justify-center text-xl font-bold flex-shrink-0">
          {user?.fullName?.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-forest-900">{user?.fullName}</div>
          <div className="text-sm text-forest-600">{user?.email}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-forest-600 mb-1">Status Akun</div>
          <span className={getStatusBadgeClass(user?.status ?? 'pending')}>
            {statusLabel(user?.status ?? 'pending')}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Info Akun */}
        <form onSubmit={handleSaveProfile} className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-forest-900">Informasi Akun</h2>
          </div>

          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={user?.email ?? ''}
              disabled
              className="input bg-cream-100 cursor-not-allowed"
            />
            <p className="help-text">Email tidak dapat diubah</p>
          </div>

          <div>
            <label className="label" htmlFor="fullName">Nama Lengkap</label>
            <input
              id="fullName"
              type="text"
              value={profileForm.fullName}
              onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="label" htmlFor="phone">No. Telepon</label>
            <input
              id="phone"
              type="tel"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              className="input"
              placeholder="08xxxxxxxxxx"
            />
          </div>

          <button type="submit" disabled={savingProfile} className="btn-primary w-full">
            {savingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>

        {/* Data Warga */}
        <form onSubmit={handleSaveResident} className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-forest-900">Data Warga</h2>
            {isVerified && (
              <span className="text-xs text-forest-600">Terkunci (terverifikasi)</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="nik">NIK</label>
              <input
                id="nik"
                type="text"
                maxLength={16}
                value={residentForm.nik}
                onChange={(e) => setResidentForm({ ...residentForm, nik: e.target.value.replace(/\D/g, '') })}
                disabled={isVerified}
                className="input disabled:bg-cream-100"
              />
            </div>
            <div>
              <label className="label" htmlFor="kkNumber">No. KK</label>
              <input
                id="kkNumber"
                type="text"
                maxLength={16}
                value={residentForm.kkNumber}
                onChange={(e) => setResidentForm({ ...residentForm, kkNumber: e.target.value.replace(/\D/g, '') })}
                disabled={isVerified}
                className="input disabled:bg-cream-100"
              />
            </div>
            <div>
              <label className="label" htmlFor="birthDate">Tanggal Lahir</label>
              <input
                id="birthDate"
                type="date"
                value={residentForm.birthDate}
                onChange={(e) => setResidentForm({ ...residentForm, birthDate: e.target.value })}
                disabled={isVerified}
                className="input disabled:bg-cream-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label" htmlFor="rt">RT</label>
                <input
                  id="rt"
                  type="text"
                  value={residentForm.rt}
                  onChange={(e) => setResidentForm({ ...residentForm, rt: e.target.value })}
                  disabled={isVerified}
                  className="input disabled:bg-cream-100"
                />
              </div>
              <div>
                <label className="label" htmlFor="rw">RW</label>
                <input
                  id="rw"
                  type="text"
                  value={residentForm.rw}
                  onChange={(e) => setResidentForm({ ...residentForm, rw: e.target.value })}
                  disabled={isVerified}
                  className="input disabled:bg-cream-100"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="address">Alamat</label>
            <textarea
              id="address"
              rows={2}
              value={residentForm.address}
              onChange={(e) => setResidentForm({ ...residentForm, address: e.target.value })}
              disabled={isVerified}
              className="input disabled:bg-cream-100"
            />
          </div>

          {!isVerified ? (
            <button type="submit" disabled={savingResident} className="btn-primary w-full">
              {savingResident ? 'Menyimpan...' : 'Simpan Data Warga'}
            </button>
          ) : (
            <p className="text-xs text-forest-600">
              Data warga telah terverifikasi. Hubungi petugas untuk perubahan data.
            </p>
          )}

          {profile?.resident?.verifiedAt && (
            <p className="text-xs text-forest-600">
              Diverifikasi pada: {formatDate(profile.resident.verifiedAt)}
            </p>
          )}
        </form>
      </div>

      {/* Ubah Password */}
      <form onSubmit={handleChangePassword} className="card p-6 space-y-4">
        <h2 className="text-lg font-bold text-forest-900">Ubah Password</h2>

        <div>
          <label className="label" htmlFor="oldPassword">Password Lama</label>
          <input
            id="oldPassword"
            type="password"
            value={passwordForm.oldPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
            className={`input ${pwErrors.oldPassword ? 'input-error' : ''}`}
            autoComplete="current-password"
          />
          {pwErrors.oldPassword && <p className="error-text">{pwErrors.oldPassword}</p>}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="newPassword">Password Baru</label>
            <input
              id="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className={`input ${pwErrors.newPassword ? 'input-error' : ''}`}
              autoComplete="new-password"
            />
            {pwErrors.newPassword && <p className="error-text">{pwErrors.newPassword}</p>}
          </div>
          <div>
            <label className="label" htmlFor="confirmPassword">Konfirmasi Password Baru</label>
            <input
              id="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className={`input ${pwErrors.confirmPassword ? 'input-error' : ''}`}
              autoComplete="new-password"
            />
            {pwErrors.confirmPassword && <p className="error-text">{pwErrors.confirmPassword}</p>}
          </div>
        </div>

        <button type="submit" disabled={savingPassword} className="btn-primary">
          {savingPassword ? 'Menyimpan...' : 'Ubah Password'}
        </button>
      </form>
    </div>
  );
}

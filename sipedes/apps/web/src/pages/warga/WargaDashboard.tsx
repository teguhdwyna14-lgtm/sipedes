// Dashboard ringkasan untuk warga

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../lib/api';
import type { DashboardStats, ServiceRequest, Complaint } from '@sipedes/shared';
import { useAuthStore } from '../../store/authStore';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui';
import { formatDate, formatRelative, getStatusBadgeClass, statusLabel } from '../../lib/utils';

export function WargaDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/dashboard/stats');
      if (res.data.success) {
        setStats(res.data.data as DashboardStats);
      } else {
        setError(res.data.message || 'Gagal memuat statistik');
      }
    } catch (err) {
      let msg = 'Gagal memuat data dashboard';
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

  if (loading) return <LoadingState message="Memuat dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={fetch} />;

  const recentRequests = stats?.recentServiceRequests ?? [];
  const recentComplaints = stats?.recentComplaints ?? [];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="bg-gradient-to-r from-forest-700 to-forest-800 text-cream-50 rounded-xl p-6 shadow-card">
        <h1 className="text-2xl font-bold">Halo, {user?.fullName}</h1>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-sm text-cream-200">Status akun:</span>
          <span className={getStatusBadgeClass(user?.status ?? 'pending')}>{statusLabel(user?.status ?? 'pending')}</span>
        </div>
        {user?.status === 'pending' && (
          <p className="text-sm text-gold-300 mt-3">
            Akun Anda sedang menunggu verifikasi petugas. Beberapa layanan mungkin belum tersedia.
          </p>
        )}
      </div>

      {/* Quick action */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link to="/warga/permohonan/baru" className="card card-hover p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-forest-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-forest-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-forest-900">Ajukan Surat</h3>
            <p className="text-sm text-forest-600">Buat permohonan surat baru</p>
          </div>
        </Link>
        <Link to="/warga/pengaduan/baru" className="card card-hover p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gold-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-gold-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-forest-900">Buat Pengaduan</h3>
            <p className="text-sm text-forest-600">Sampaikan keluhan atau laporan</p>
          </div>
        </Link>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-sm text-forest-600">Permohonan Saya</div>
          <div className="text-3xl font-bold text-forest-900 mt-1">{stats?.myServiceRequests ?? 0}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-forest-600">Pengaduan Saya</div>
          <div className="text-3xl font-bold text-forest-900 mt-1">{stats?.myComplaints ?? 0}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-forest-600">Total Layanan</div>
          <div className="text-3xl font-bold text-forest-900 mt-1">{stats?.totalServiceRequests ?? 0}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-forest-600">Layanan Selesai</div>
          <div className="text-3xl font-bold text-forest-900 mt-1">{stats?.completedServiceRequests ?? 0}</div>
        </div>
      </div>

      {/* Recent permohonan */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-forest-900">Permohonan Terbaru</h2>
          <Link to="/warga/permohonan" className="text-sm font-semibold text-forest-700 hover:text-forest-900">
            Lihat semua &rarr;
          </Link>
        </div>
        {recentRequests.length === 0 ? (
          <EmptyState title="Belum ada permohonan" message="Ajukan permohonan surat pertama Anda." />
        ) : (
          <div className="space-y-3">
            {recentRequests.slice(0, 5).map((r: ServiceRequest) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3 bg-cream-50 rounded-lg">
                <div className="min-w-0">
                  <div className="font-semibold text-forest-900 text-sm">{r.requestNumber}</div>
                  <div className="text-xs text-forest-600">{r.serviceName ?? '-'}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-forest-500 hidden sm:inline">{formatDate(r.createdAt)}</span>
                  <span className={getStatusBadgeClass(r.status)}>{statusLabel(r.status)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent pengaduan */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-forest-900">Pengaduan Terbaru</h2>
          <Link to="/warga/pengaduan" className="text-sm font-semibold text-forest-700 hover:text-forest-900">
            Lihat semua &rarr;
          </Link>
        </div>
        {recentComplaints.length === 0 ? (
          <EmptyState title="Belum ada pengaduan" message="Sampaikan pengaduan untuk masalah di desa Anda." />
        ) : (
          <div className="space-y-3">
            {recentComplaints.slice(0, 5).map((c: Complaint) => (
              <div key={c.id} className="flex items-center justify-between gap-3 p-3 bg-cream-50 rounded-lg">
                <div className="min-w-0">
                  <div className="font-semibold text-forest-900 text-sm truncate">{c.title}</div>
                  <div className="text-xs text-forest-600">{c.trackingCode} - {formatRelative(c.createdAt)}</div>
                </div>
                <span className={getStatusBadgeClass(c.status)}>{statusLabel(c.status)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Dashboard statistik untuk staff/admin

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../lib/api';
import type { DashboardStats } from '@sipedes/shared';
import { useAuthStore } from '../../store/authStore';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui';
import { formatDate, formatRelative, getStatusBadgeClass, statusLabel } from '../../lib/utils';

interface StatCardProps {
  label: string;
  value: number | undefined;
  to?: string;
  tone?: 'forest' | 'gold' | 'red' | 'blue';
}

function StatCard({ label, value, to, tone = 'forest' }: StatCardProps) {
  const toneClass = {
    forest: 'bg-forest-50 border-forest-200',
    gold: 'bg-gold-50 border-gold-200',
    red: 'bg-red-50 border-red-200',
    blue: 'bg-blue-50 border-blue-200',
  }[tone];

  const content = (
    <div className={`card p-5 border ${toneClass} ${to ? 'card-hover' : ''}`}>
      <div className="text-sm text-forest-600">{label}</div>
      <div className="text-3xl font-bold text-forest-900 mt-1">{value ?? 0}</div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export function StaffDashboard() {
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
      let msg = 'Gagal memuat dashboard';
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
      <div className="bg-gradient-to-r from-forest-700 to-forest-800 text-cream-50 rounded-xl p-6 shadow-card">
        <h1 className="text-2xl font-bold">Selamat datang, {user?.fullName}</h1>
        <p className="text-cream-200 text-sm mt-2 capitalize">Anda login sebagai {user?.role} desa.</p>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Warga" value={stats?.totalResidents} to="/staff/warga" tone="forest" />
        <StatCard label="Menunggu Verifikasi" value={stats?.pendingVerifications} to="/staff/verifikasi" tone="gold" />
        <StatCard label="Total Permohonan" value={stats?.totalServiceRequests} to="/staff/permohonan" tone="blue" />
        <StatCard label="Permohonan Pending" value={stats?.pendingServiceRequests} to="/staff/permohonan" tone="red" />
        <StatCard label="Total Pengaduan" value={stats?.totalComplaints} to="/staff/pengaduan" tone="forest" />
        <StatCard label="Pengaduan Terbuka" value={stats?.openComplaints} to="/staff/pengaduan" tone="red" />
        <StatCard label="Total Berita" value={stats?.totalNews} to="/staff/berita" tone="blue" />
        <StatCard label="Total Pengumuman" value={stats?.totalAnnouncements} to="/staff/pengumuman" tone="gold" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent permohonan */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-forest-900">Permohonan Terbaru</h2>
            <Link to="/staff/permohonan" className="text-sm font-semibold text-forest-700 hover:text-forest-900">
              Kelola &rarr;
            </Link>
          </div>
          {recentRequests.length === 0 ? (
            <EmptyState title="Belum ada permohonan" />
          ) : (
            <div className="space-y-3">
              {recentRequests.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 p-3 bg-cream-50 rounded-lg">
                  <div className="min-w-0">
                    <div className="font-semibold text-forest-900 text-sm">{r.requestNumber}</div>
                    <div className="text-xs text-forest-600 truncate">
                      {r.userFullName ?? '-'} - {r.serviceName ?? '-'}
                    </div>
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
            <Link to="/staff/pengaduan" className="text-sm font-semibold text-forest-700 hover:text-forest-900">
              Kelola &rarr;
            </Link>
          </div>
          {recentComplaints.length === 0 ? (
            <EmptyState title="Belum ada pengaduan" />
          ) : (
            <div className="space-y-3">
              {recentComplaints.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 p-3 bg-cream-50 rounded-lg">
                  <div className="min-w-0">
                    <div className="font-semibold text-forest-900 text-sm truncate">{c.title}</div>
                    <div className="text-xs text-forest-600">
                      {c.trackingCode} - {formatRelative(c.createdAt)}
                    </div>
                  </div>
                  <span className={getStatusBadgeClass(c.status)}>{statusLabel(c.status)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

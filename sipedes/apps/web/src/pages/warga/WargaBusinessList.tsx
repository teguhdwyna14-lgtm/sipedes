// Daftar usaha milik warga yang login

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../lib/api';
import type { ResidentBusiness } from '@sipedes/shared';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui';
import { getStatusBadgeClass, statusLabel, formatDate, truncate } from '../../lib/utils';

const statusBusinessLabel = (s: string): string => {
  const map: Record<string, string> = {
    pending: 'Menunggu Tinjauan',
    approved: 'Disetujui',
    rejected: 'Ditolak',
    disabled: 'Dinonaktifkan',
  };
  return map[s] ?? statusLabel(s);
};

const businessBadgeClass = (s: string): string => {
  const map: Record<string, string> = {
    pending: 'badge-gold',
    approved: 'badge-green',
    rejected: 'badge-red',
    disabled: 'badge-gray',
  };
  return map[s] ?? 'badge-gray';
};

export function WargaBusinessList() {
  const [items, setItems] = useState<ResidentBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/businesses/mine');
      if (res.data.success) {
        const list = res.data.data?.items ?? res.data.data ?? [];
        setItems(Array.isArray(list) ? (list as ResidentBusiness[]) : []);
      } else {
        setError(res.data.message || 'Gagal memuat usaha');
      }
    } catch (err) {
      let msg = 'Gagal memuat usaha';
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest-900">Usaha Saya</h1>
          <p className="text-sm text-forest-600 mt-1">Kelola daftar jasa & usaha yang Anda ajukan.</p>
        </div>
        <Link to="/warga/usaha/baru" className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Usaha
        </Link>
      </div>

      <div className="p-4 bg-gold-50 border border-gold-200 rounded-lg text-sm text-gold-900">
        Usaha baru yang Anda ajukan akan ditinjau oleh admin sebelum tampil di direktori publik.
      </div>

      {loading ? (
        <LoadingState message="Memuat usaha..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetch} />
      ) : items.length === 0 ? (
        <div className="card p-8">
          <EmptyState
            title="Belum ada usaha"
            message="Klik 'Tambah Usaha' untuk mendaftarkan jasa/usaha Anda."
            action={<Link to="/warga/usaha/baru" className="btn-primary">Tambah Usaha</Link>}
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((b) => {
            const canEdit = b.status === 'pending' || b.status === 'rejected';
            return (
              <div key={b.id} className="card flex flex-col">
                <div className="aspect-video bg-gradient-to-br from-forest-200 to-cream-200 flex items-center justify-center">
                  {b.photoUrl ? (
                    <img src={b.photoUrl} alt={b.name} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-12 h-12 text-forest-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-forest-900 line-clamp-1">{b.name}</h3>
                    <span className={businessBadgeClass(b.status)}>{statusBusinessLabel(b.status)}</span>
                  </div>
                  {b.categoryName && <p className="text-xs text-forest-600 mb-2">{b.categoryName}</p>}
                  <p className="text-sm text-forest-700 line-clamp-2 flex-1">{b.description ?? '-'}</p>
                  {b.status === 'rejected' && b.rejectionNote && (
                    <p className="text-xs text-red-700 mt-2 bg-red-50 p-2 rounded">
                      Catatan penolakan: {truncate(b.rejectionNote, 120)}
                    </p>
                  )}
                  <p className="text-xs text-forest-500 mt-2">Diajukan: {formatDate(b.createdAt)}</p>
                  <div className="flex gap-2 mt-3">
                    {canEdit && (
                      <Link to={`/warga/usaha/${b.id}/edit`} className="btn-secondary text-xs px-3 py-1.5 flex-1 text-center">
                        Edit
                      </Link>
                    )}
                    <Link to={`/jasa-usaha/${b.id}`} className="btn-ghost text-xs px-3 py-1.5 flex-1 text-center">
                      Lihat
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// List pengaduan milik warga

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../lib/api';
import type { Complaint } from '@sipedes/shared';
import { LoadingState, EmptyState, ErrorState, Pagination, Modal } from '../../components/ui';
import { formatDate, formatDateTime, formatRelative, getStatusBadgeClass, statusLabel } from '../../lib/utils';

const PAGE_LIMIT = 10;

export function WargaPengaduanList() {
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<Complaint | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/complaints', {
        params: { page, limit: PAGE_LIMIT, search: search || undefined },
      });
      if (res.data.success) {
        setItems(res.data.data?.items ?? []);
        setTotalPages(res.data.meta?.totalPages ?? 1);
      } else {
        setError(res.data.message || 'Gagal memuat pengaduan');
      }
    } catch (err) {
      let msg = 'Gagal memuat pengaduan';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest-900">Pengaduan Saya</h1>
          <p className="text-sm text-forest-600 mt-1">Daftar pengaduan yang Anda buat.</p>
        </div>
        <Link to="/warga/pengaduan/baru" className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Buat Pengaduan
        </Link>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Cari judul / kode tracking..."
          className="input flex-1"
        />
        <button type="submit" className="btn-primary">Cari</button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }} className="btn-secondary">
            Reset
          </button>
        )}
      </form>

      {loading ? (
        <LoadingState message="Memuat pengaduan..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetch} />
      ) : items.length === 0 ? (
        <div className="card p-8">
          <EmptyState
            title="Belum ada pengaduan"
            message="Sampaikan pengaduan untuk masalah di desa Anda."
            action={<Link to="/warga/pengaduan/baru" className="btn-primary">Buat Pengaduan</Link>}
          />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((c) => (
              <div key={c.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-forest-600">{c.trackingCode}</span>
                      {c.category && <span className="badge-blue">{c.category}</span>}
                      {c.isAnonymous && <span className="badge-gray">Anonim</span>}
                    </div>
                    <h3 className="font-semibold text-forest-900">{c.title}</h3>
                    <p className="text-sm text-forest-600 mt-1 line-clamp-2">{c.description}</p>
                    <p className="text-xs text-forest-500 mt-2">{formatRelative(c.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={getStatusBadgeClass(c.status)}>{statusLabel(c.status)}</span>
                    <button onClick={() => setSelected(c)} className="btn-ghost text-sm">Detail</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Detail Pengaduan" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-forest-600">Kode Tracking</div>
                <div className="font-mono font-semibold text-forest-900">{selected.trackingCode}</div>
              </div>
              <div>
                <div className="text-xs text-forest-600">Status</div>
                <span className={getStatusBadgeClass(selected.status)}>{statusLabel(selected.status)}</span>
              </div>
              <div>
                <div className="text-xs text-forest-600">Kategori</div>
                <div className="font-semibold text-forest-900">{selected.category ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs text-forest-600">Tanggal</div>
                <div className="font-semibold text-forest-900">{formatDateTime(selected.createdAt)}</div>
              </div>
            </div>

            <div>
              <div className="text-xs text-forest-600 mb-1">Judul</div>
              <p className="font-semibold text-forest-900">{selected.title}</p>
            </div>

            <div>
              <div className="text-xs text-forest-600 mb-1">Deskripsi</div>
              <p className="text-forest-800 text-sm whitespace-pre-line">{selected.description}</p>
            </div>

            {selected.updates && selected.updates.length > 0 && (
              <div>
                <div className="text-xs text-forest-600 mb-2">Riwayat Update</div>
                <div className="space-y-3">
                  {selected.updates.map((u) => (
                    <div key={u.id} className="border-l-2 border-forest-200 pl-3">
                      <div className="flex items-center gap-2">
                        <span className={getStatusBadgeClass(u.status)}>{statusLabel(u.status)}</span>
                        <span className="text-xs text-forest-500">{formatDateTime(u.createdAt)}</span>
                      </div>
                      {u.note && <p className="text-sm text-forest-700 mt-1">{u.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

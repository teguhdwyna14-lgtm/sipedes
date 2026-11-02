// List permohonan surat milik warga

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../lib/api';
import type { ServiceRequest } from '@sipedes/shared';
import { LoadingState, EmptyState, ErrorState, Pagination, Modal } from '../../components/ui';
import { formatDate, formatDateTime, getStatusBadgeClass, statusLabel } from '../../lib/utils';

const PAGE_LIMIT = 10;

export function WargaPermohonanList() {
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<ServiceRequest | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/services/requests', {
        params: { page, limit: PAGE_LIMIT, search: search || undefined },
      });
      if (res.data.success) {
        setItems(res.data.data?.items ?? []);
        setTotalPages(res.data.meta?.totalPages ?? 1);
      } else {
        setError(res.data.message || 'Gagal memuat permohonan');
      }
    } catch (err) {
      let msg = 'Gagal memuat permohonan';
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
          <h1 className="text-2xl font-bold text-forest-900">Permohonan Surat Saya</h1>
          <p className="text-sm text-forest-600 mt-1">Daftar permohonan yang Anda ajukan.</p>
        </div>
        <Link to="/warga/permohonan/baru" className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajukan Permohonan Baru
        </Link>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Cari nomor / jenis surat..."
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
        <LoadingState message="Memuat permohonan..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetch} />
      ) : items.length === 0 ? (
        <div className="card p-8">
          <EmptyState
            title="Belum ada permohonan"
            message="Ajukan permohonan surat pertama Anda."
            action={<Link to="/warga/permohonan/baru" className="btn-primary">Ajukan Permohonan</Link>}
          />
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="table-app">
              <thead>
                <tr>
                  <th>Nomor</th>
                  <th>Jenis Layanan</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold text-forest-900">{r.requestNumber}</td>
                    <td>{r.serviceName ?? '-'}</td>
                    <td className="text-forest-600">{formatDate(r.createdAt)}</td>
                    <td><span className={getStatusBadgeClass(r.status)}>{statusLabel(r.status)}</span></td>
                    <td className="text-right">
                      <button onClick={() => setSelected(r)} className="btn-ghost text-sm">Detail</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Detail Permohonan" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-forest-600">Nomor Permohonan</div>
                <div className="font-semibold text-forest-900">{selected.requestNumber}</div>
              </div>
              <div>
                <div className="text-xs text-forest-600">Status</div>
                <span className={getStatusBadgeClass(selected.status)}>{statusLabel(selected.status)}</span>
              </div>
              <div>
                <div className="text-xs text-forest-600">Jenis Layanan</div>
                <div className="font-semibold text-forest-900">{selected.serviceName ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs text-forest-600">Tanggal Ajukan</div>
                <div className="font-semibold text-forest-900">{formatDateTime(selected.createdAt)}</div>
              </div>
            </div>

            <div>
              <div className="text-xs text-forest-600 mb-1">Keperluan</div>
              <p className="text-forest-800 text-sm">{selected.purpose}</p>
            </div>

            {selected.notes && (
              <div>
                <div className="text-xs text-forest-600 mb-1">Catatan</div>
                <p className="text-forest-800 text-sm whitespace-pre-line">{selected.notes}</p>
              </div>
            )}

            {selected.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-xs text-red-700 font-semibold mb-1">Alasan Penolakan</div>
                <p className="text-sm text-red-800">{selected.rejectionReason}</p>
              </div>
            )}

            {selected.attachments && selected.attachments.length > 0 && (
              <div>
                <div className="text-xs text-forest-600 mb-1">Lampiran</div>
                <ul className="space-y-1">
                  {selected.attachments.map((a) => (
                    <li key={a.id} className="text-sm text-forest-700 flex items-center gap-2">
                      <svg className="w-4 h-4 text-forest-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {a.fileName}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selected.events && selected.events.length > 0 && (
              <div>
                <div className="text-xs text-forest-600 mb-2">Riwayat Status</div>
                <div className="space-y-2">
                  {selected.events.map((ev) => (
                    <div key={ev.id} className="flex gap-3 text-sm">
                      <div className="text-forest-500 w-32 flex-shrink-0">{formatDateTime(ev.createdAt)}</div>
                      <div>
                        <span className={getStatusBadgeClass(ev.toStatus)}>{statusLabel(ev.toStatus)}</span>
                        {ev.note && <p className="text-forest-700 mt-1">{ev.note}</p>}
                      </div>
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

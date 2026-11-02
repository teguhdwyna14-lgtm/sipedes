// Kelola permohonan surat oleh staff/admin

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { api } from '../../lib/api';
import type { ServiceRequest, ServiceRequestStatus } from '@sipedes/shared';
import { useToastStore } from '../../store/toastStore';
import { LoadingState, EmptyState, ErrorState, Pagination, Modal } from '../../components/ui';
import { formatDate, formatDateTime, formatFileSize, getStatusBadgeClass, statusLabel } from '../../lib/utils';

const PAGE_LIMIT = 10;

const STATUS_OPTIONS: ServiceRequestStatus[] = [
  'dalam_pemeriksaan', 'perlu_perbaikan', 'disetujui', 'ditolak', 'selesai',
];

interface StatusForm {
  status: ServiceRequestStatus;
  note: string;
  rejectionReason: string;
}

export function StaffPermohonan() {
  const toast = useToastStore();
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [selected, setSelected] = useState<ServiceRequest | null>(null);
  const [statusForm, setStatusForm] = useState<StatusForm | null>(null);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/services/requests', {
        params: {
          page, limit: PAGE_LIMIT,
          search: search || undefined,
          status: statusFilter || undefined,
        },
      });
      if (res.data.success) {
        setItems(res.data.data?.items ?? []);
        setTotalPages(res.data.meta?.totalPages ?? 1);
      } else {
        setError(res.data.message || 'Gagal memuat data');
      }
    } catch (err) {
      let msg = 'Gagal memuat permohonan';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const openStatusForm = (r: ServiceRequest) => {
    setStatusForm({ status: 'dalam_pemeriksaan', note: '', rejectionReason: '' });
    setSelected(r);
  };

  const handleUpdateStatus = async () => {
    if (!selected || !statusForm) return;
    if (statusForm.status === 'ditolak' && !statusForm.rejectionReason.trim()) {
      toast.error('Alasan penolakan wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch(`/services/requests/${selected.id}/status`, {
        status: statusForm.status,
        note: statusForm.note.trim() || undefined,
        rejectionReason: statusForm.status === 'ditolak' ? statusForm.rejectionReason.trim() : undefined,
      });
      if (res.data.success) {
        toast.success('Status permohonan diperbarui');
        setSelected(null);
        setStatusForm(null);
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal memperbarui status');
      }
    } catch (err) {
      let msg = 'Gagal memperbarui status';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-forest-900">Kelola Permohonan Surat</h1>
        <p className="text-sm text-forest-600 mt-1">Proses permohonan surat dari warga.</p>
      </div>

      {/* Filter */}
      <div className="card p-4 space-y-3">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nomor / nama pemohon..."
            className="input flex-1 min-w-[200px]"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input sm:w-48"
          >
            <option value="">Semua Status</option>
            <option value="diajukan">Diajukan</option>
            <option value="dalam_pemeriksaan">Dalam Pemeriksaan</option>
            <option value="perlu_perbaikan">Perlu Perbaikan</option>
            <option value="disetujui">Disetujui</option>
            <option value="ditolak">Ditolak</option>
            <option value="selesai">Selesai</option>
          </select>
          <button type="submit" className="btn-primary">Cari</button>
          {(search || statusFilter) && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchInput(''); setStatusFilter(''); setPage(1); }}
              className="btn-secondary"
            >
              Reset
            </button>
          )}
        </form>
      </div>

      {loading ? (
        <LoadingState message="Memuat data..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetch} />
      ) : items.length === 0 ? (
        <div className="card p-8">
          <EmptyState title="Tidak ada permohonan" message="Coba ubah filter pencarian." />
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="table-app">
              <thead>
                <tr>
                  <th>Nomor</th>
                  <th>Pemohon</th>
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
                    <td>{r.userFullName ?? '-'}</td>
                    <td>{r.serviceName ?? '-'}</td>
                    <td className="text-forest-600">{formatDate(r.createdAt)}</td>
                    <td><span className={getStatusBadgeClass(r.status)}>{statusLabel(r.status)}</span></td>
                    <td className="text-right">
                      <button onClick={() => openStatusForm(r)} className="btn-primary text-sm">Proses</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      <Modal open={!!selected} onClose={() => { setSelected(null); setStatusForm(null); }} title="Proses Permohonan" size="lg">
        {selected && statusForm && (
          <div className="space-y-4">
            <div className="bg-cream-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-forest-600">Nomor</div>
                  <div className="font-semibold text-forest-900">{selected.requestNumber}</div>
                </div>
                <div>
                  <div className="text-xs text-forest-600">Status Saat Ini</div>
                  <span className={getStatusBadgeClass(selected.status)}>{statusLabel(selected.status)}</span>
                </div>
                <div>
                  <div className="text-xs text-forest-600">Pemohon</div>
                  <div className="text-forest-900">{selected.userFullName ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-forest-600">Jenis Layanan</div>
                  <div className="text-forest-900">{selected.serviceName ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-forest-600">Tanggal Ajukan</div>
                  <div className="text-forest-900">{formatDateTime(selected.createdAt)}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-forest-600">Keperluan</div>
                <p className="text-forest-800 whitespace-pre-line">{selected.purpose}</p>
              </div>
              {selected.notes && (
                <div>
                  <div className="text-xs text-forest-600">Catatan Pemohon</div>
                  <p className="text-forest-800 whitespace-pre-line">{selected.notes}</p>
                </div>
              )}
            </div>

            {/* Lampiran */}
            {selected.attachments && selected.attachments.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-forest-800 mb-2">Lampiran</div>
                <ul className="space-y-1">
                  {selected.attachments.map((a) => (
                    <li key={a.id} className="text-sm text-forest-700 flex items-center gap-2 bg-cream-50 px-3 py-2 rounded">
                      <svg className="w-4 h-4 text-forest-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="flex-1 truncate">{a.fileName}</span>
                      <span className="text-xs text-forest-500">{formatFileSize(a.fileSize)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Update status */}
            <div className="border-t border-cream-200 pt-4 space-y-3">
              <div>
                <label className="label" htmlFor="newStatus">Ubah Status</label>
                <select
                  id="newStatus"
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value as ServiceRequestStatus })}
                  className="input"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{statusLabel(s)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="note">Catatan</label>
                <textarea
                  id="note"
                  rows={2}
                  value={statusForm.note}
                  onChange={(e) => setStatusForm({ ...statusForm, note: e.target.value })}
                  className="input"
                  placeholder="Catatan untuk pemohon (opsional)"
                />
              </div>

              {statusForm.status === 'ditolak' && (
                <div>
                  <label className="label" htmlFor="rejection">Alasan Penolakan <span className="text-red-600">*</span></label>
                  <textarea
                    id="rejection"
                    rows={2}
                    value={statusForm.rejectionReason}
                    onChange={(e) => setStatusForm({ ...statusForm, rejectionReason: e.target.value })}
                    className="input"
                    placeholder="Jelaskan alasan penolakan..."
                  />
                </div>
              )}
            </div>

            {/* Riwayat */}
            {selected.events && selected.events.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-forest-800 mb-2">Riwayat Status</div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selected.events.map((ev) => (
                    <div key={ev.id} className="text-sm flex gap-3">
                      <div className="text-forest-500 w-32 flex-shrink-0 text-xs">{formatDateTime(ev.createdAt)}</div>
                      <div>
                        <span className={getStatusBadgeClass(ev.toStatus)}>{statusLabel(ev.toStatus)}</span>
                        {ev.note && <p className="text-forest-700 mt-1 text-xs">{ev.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button onClick={() => { setSelected(null); setStatusForm(null); }} className="btn-secondary flex-1">Tutup</button>
              <button onClick={handleUpdateStatus} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// Kelola pengaduan oleh staff/admin

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { api } from '../../lib/api';
import type { Complaint, ComplaintStatus } from '@sipedes/shared';
import { useToastStore } from '../../store/toastStore';
import { LoadingState, EmptyState, ErrorState, Pagination, Modal } from '../../components/ui';
import { formatDate, formatDateTime, getStatusBadgeClass, statusLabel } from '../../lib/utils';

const PAGE_LIMIT = 10;

const STATUS_OPTIONS: ComplaintStatus[] = ['diterima', 'diproses', 'selesai', 'ditutup'];
const CATEGORIES = ['Infrastruktur', 'Kebersihan', 'Keamanan', 'Pelayanan', 'Lainnya'];

interface UpdateForm {
  status: ComplaintStatus;
  note: string;
}

export function StaffPengaduan() {
  const toast = useToastStore();
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [selected, setSelected] = useState<Complaint | null>(null);
  const [updateForm, setUpdateForm] = useState<UpdateForm | null>(null);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/complaints', {
        params: {
          page, limit: PAGE_LIMIT,
          search: search || undefined,
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
        },
      });
      if (res.data.success) {
        setItems(res.data.data?.items ?? []);
        setTotalPages(res.data.meta?.totalPages ?? 1);
      } else {
        setError(res.data.message || 'Gagal memuat data');
      }
    } catch (err) {
      let msg = 'Gagal memuat pengaduan';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, categoryFilter]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const openProcess = (c: Complaint) => {
    setSelected(c);
    setUpdateForm({ status: c.status === 'baru' ? 'diterima' : c.status, note: '' });
  };

  const handleAddUpdate = async () => {
    if (!selected || !updateForm) return;
    setSaving(true);
    try {
      const res = await api.post(`/complaints/${selected.id}/updates`, {
        status: updateForm.status,
        note: updateForm.note.trim() || undefined,
      });
      if (res.data.success) {
        toast.success('Update pengaduan ditambahkan');
        // Refresh detail
        try {
          const detailRes = await api.get(`/complaints/${selected.id}`);
          if (detailRes.data.success) {
            setSelected(detailRes.data.data as Complaint);
          }
        } catch { /* ignore */ }
        setUpdateForm({ status: updateForm.status, note: '' });
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal menambahkan update');
      }
    } catch (err) {
      let msg = 'Gagal menambahkan update';
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
        <h1 className="text-2xl font-bold text-forest-900">Kelola Pengaduan</h1>
        <p className="text-sm text-forest-600 mt-1">Tindak lanjuti pengaduan dari warga.</p>
      </div>

      <div className="card p-4 space-y-3">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari judul / tracking code..."
            className="input flex-1 min-w-[200px]"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input sm:w-44"
          >
            <option value="">Semua Status</option>
            <option value="baru">Baru</option>
            <option value="diterima">Diterima</option>
            <option value="diproses">Diproses</option>
            <option value="selesai">Selesai</option>
            <option value="ditutup">Ditutup</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="input sm:w-44"
          >
            <option value="">Semua Kategori</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary">Cari</button>
          {(search || statusFilter || categoryFilter) && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchInput(''); setStatusFilter(''); setCategoryFilter(''); setPage(1); }}
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
          <EmptyState title="Tidak ada pengaduan" message="Coba ubah filter pencarian." />
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="table-app">
              <thead>
                <tr>
                  <th>Tracking Code</th>
                  <th>Pelapor</th>
                  <th>Judul</th>
                  <th>Kategori</th>
                  <th>Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono text-xs">{c.trackingCode}</td>
                    <td>{c.isAnonymous ? 'Anonim' : (c.userFullName ?? '-')}</td>
                    <td className="max-w-xs truncate">{c.title}</td>
                    <td>{c.category ?? '-'}</td>
                    <td><span className={getStatusBadgeClass(c.status)}>{statusLabel(c.status)}</span></td>
                    <td className="text-right">
                      <button onClick={() => openProcess(c)} className="btn-primary text-sm">Proses</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      <Modal open={!!selected} onClose={() => { setSelected(null); setUpdateForm(null); }} title="Proses Pengaduan" size="lg">
        {selected && updateForm && (
          <div className="space-y-4">
            <div className="bg-cream-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-forest-600">Tracking Code</div>
                  <div className="font-mono text-forest-900">{selected.trackingCode}</div>
                </div>
                <div>
                  <div className="text-xs text-forest-600">Status Saat Ini</div>
                  <span className={getStatusBadgeClass(selected.status)}>{statusLabel(selected.status)}</span>
                </div>
                <div>
                  <div className="text-xs text-forest-600">Pelapor</div>
                  <div className="text-forest-900">{selected.isAnonymous ? 'Anonim' : (selected.userFullName ?? '-')}</div>
                </div>
                <div>
                  <div className="text-xs text-forest-600">Kategori</div>
                  <div className="text-forest-900">{selected.category ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-forest-600">Tanggal</div>
                  <div className="text-forest-900">{formatDateTime(selected.createdAt)}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-forest-600">Judul</div>
                <p className="font-semibold text-forest-900">{selected.title}</p>
              </div>
              <div>
                <div className="text-xs text-forest-600">Deskripsi</div>
                <p className="text-forest-800 whitespace-pre-line">{selected.description}</p>
              </div>
            </div>

            {/* Riwayat */}
            {selected.updates && selected.updates.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-forest-800 mb-2">Riwayat Update</div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selected.updates.map((u) => (
                    <div key={u.id} className="border-l-2 border-forest-200 pl-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={getStatusBadgeClass(u.status)}>{statusLabel(u.status)}</span>
                        <span className="text-xs text-forest-500">{formatDateTime(u.createdAt)}</span>
                        {u.createdByName && <span className="text-xs text-forest-600">oleh {u.createdByName}</span>}
                      </div>
                      {u.note && <p className="text-forest-700 mt-1">{u.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tambah update */}
            <div className="border-t border-cream-200 pt-4 space-y-3">
              <div className="font-semibold text-forest-900">Tambah Update</div>
              <div>
                <label className="label" htmlFor="newStatus">Ubah Status</label>
                <select
                  id="newStatus"
                  value={updateForm.status}
                  onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value as ComplaintStatus })}
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
                  value={updateForm.note}
                  onChange={(e) => setUpdateForm({ ...updateForm, note: e.target.value })}
                  className="input"
                  placeholder="Catatan tindak lanjut..."
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => { setSelected(null); setUpdateForm(null); }} className="btn-secondary flex-1">Tutup</button>
              <button onClick={handleAddUpdate} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Menyimpan...' : 'Tambah Update'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

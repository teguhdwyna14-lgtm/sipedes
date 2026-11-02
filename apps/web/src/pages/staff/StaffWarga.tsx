// CRUD data warga untuk staff/admin

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { api } from '../../lib/api';
import type { ResidentProfile, UserStatus } from '@sipedes/shared';
import { useToastStore } from '../../store/toastStore';
import { LoadingState, EmptyState, ErrorState, Pagination, Modal } from '../../components/ui';
import { formatDate, getStatusBadgeClass, maskNik, maskPhone, statusLabel } from '../../lib/utils';

const PAGE_LIMIT = 10;

interface EditForm {
  fullName: string;
  nik: string;
  kkNumber: string;
  rt: string;
  rw: string;
  address: string;
  phone: string;
  status: UserStatus;
}

export function StaffWarga() {
  const toast = useToastStore();
  const [items, setItems] = useState<ResidentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [rtFilter, setRtFilter] = useState('');
  const [rwFilter, setRwFilter] = useState('');

  const [selected, setSelected] = useState<ResidentProfile | null>(null);
  const [editing, setEditing] = useState<ResidentProfile | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/residents', {
        params: {
          page, limit: PAGE_LIMIT,
          search: search || undefined,
          status: statusFilter || undefined,
          rt: rtFilter || undefined,
          rw: rwFilter || undefined,
        },
      });
      if (res.data.success) {
        setItems(res.data.data?.items ?? []);
        setTotalPages(res.data.meta?.totalPages ?? 1);
      } else {
        setError(res.data.message || 'Gagal memuat data');
      }
    } catch (err) {
      let msg = 'Gagal memuat data warga';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, rtFilter, rwFilter]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const openEdit = (r: ResidentProfile) => {
    setEditing(r);
    setEditForm({
      fullName: r.fullName,
      nik: r.nik ?? '',
      kkNumber: r.kkNumber ?? '',
      rt: r.rt ?? '',
      rw: r.rw ?? '',
      address: r.address ?? '',
      phone: r.phone ?? '',
      status: r.status,
    });
  };

  const handleSaveEdit = async () => {
    if (!editing || !editForm) return;
    setSaving(true);
    try {
      const res = await api.put(`/residents/${editing.id}`, {
        fullName: editForm.fullName.trim(),
        nik: editForm.nik || undefined,
        kkNumber: editForm.kkNumber || undefined,
        rt: editForm.rt || undefined,
        rw: editForm.rw || undefined,
        address: editForm.address || undefined,
        phone: editForm.phone || undefined,
        status: editForm.status,
      });
      if (res.data.success) {
        toast.success('Data warga berhasil diperbarui');
        setEditing(null);
        setEditForm(null);
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal menyimpan');
      }
    } catch (err) {
      let msg = 'Gagal menyimpan';
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
        <h1 className="text-2xl font-bold text-forest-900">Data Warga</h1>
        <p className="text-sm text-forest-600 mt-1">Kelola data warga desa.</p>
      </div>

      {/* Filter */}
      <div className="card p-4 space-y-3">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nama / NIK..."
            className="input flex-1 min-w-[200px]"
          />
          <button type="submit" className="btn-primary">Cari</button>
        </form>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input"
          >
            <option value="">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="active">Aktif</option>
            <option value="rejected">Ditolak</option>
            <option value="disabled">Nonaktif</option>
          </select>
          <input
            type="text"
            value={rtFilter}
            onChange={(e) => { setRtFilter(e.target.value); setPage(1); }}
            placeholder="RT"
            className="input"
          />
          <input
            type="text"
            value={rwFilter}
            onChange={(e) => { setRwFilter(e.target.value); setPage(1); }}
            placeholder="RW"
            className="input"
          />
        </div>
        {(search || statusFilter || rtFilter || rwFilter) && (
          <button
            onClick={() => { setSearch(''); setSearchInput(''); setStatusFilter(''); setRtFilter(''); setRwFilter(''); setPage(1); }}
            className="btn-ghost text-sm"
          >
            Reset Filter
          </button>
        )}
      </div>

      {loading ? (
        <LoadingState message="Memuat data..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetch} />
      ) : items.length === 0 ? (
        <div className="card p-8">
          <EmptyState title="Tidak ada data warga" message="Coba ubah filter pencarian." />
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="table-app">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>NIK</th>
                  <th>RT/RW</th>
                  <th>Status</th>
                  <th>Tanggal Daftar</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold text-forest-900">{r.fullName}</td>
                    <td className="font-mono text-sm">{maskNik(r.nik)}</td>
                    <td>{r.rt ?? '-'}/{r.rw ?? '-'}</td>
                    <td><span className={getStatusBadgeClass(r.status)}>{statusLabel(r.status)}</span></td>
                    <td className="text-forest-600">{formatDate(r.createdAt)}</td>
                    <td className="text-right">
                      <button onClick={() => setSelected(r)} className="btn-ghost text-sm">Detail</button>
                      <button onClick={() => openEdit(r)} className="btn-ghost text-sm">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Detail Warga" size="md">
        {selected && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2">
              <div className="text-xs text-forest-600">Nama Lengkap</div>
              <div className="font-semibold text-forest-900">{selected.fullName}</div>
            </div>
            <div>
              <div className="text-xs text-forest-600">NIK</div>
              <div className="font-mono text-forest-900">{selected.nik ?? '-'}</div>
            </div>
            <div>
              <div className="text-xs text-forest-600">No. KK</div>
              <div className="font-mono text-forest-900">{selected.kkNumber ?? '-'}</div>
            </div>
            <div>
              <div className="text-xs text-forest-600">Tanggal Lahir</div>
              <div className="text-forest-900">{selected.birthDate ? formatDate(selected.birthDate) : '-'}</div>
            </div>
            <div>
              <div className="text-xs text-forest-600">Telepon</div>
              <div className="text-forest-900">{selected.phone ?? '-'}</div>
            </div>
            <div>
              <div className="text-xs text-forest-600">RT/RW</div>
              <div className="text-forest-900">{selected.rt ?? '-'}/{selected.rw ?? '-'}</div>
            </div>
            <div>
              <div className="text-xs text-forest-600">Status</div>
              <span className={getStatusBadgeClass(selected.status)}>{statusLabel(selected.status)}</span>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-forest-600">Alamat</div>
              <div className="text-forest-900">{selected.address ?? '-'}</div>
            </div>
            {selected.verifiedAt && (
              <div className="col-span-2">
                <div className="text-xs text-forest-600">Diverifikasi pada</div>
                <div className="text-forest-900">{formatDate(selected.verifiedAt)}</div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => { setEditing(null); setEditForm(null); }} title="Edit Data Warga" size="lg">
        {editing && editForm && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label" htmlFor="editFullName">Nama Lengkap</label>
                <input
                  id="editFullName"
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor="editNik">NIK</label>
                <input
                  id="editNik"
                  type="text"
                  maxLength={16}
                  value={editForm.nik}
                  onChange={(e) => setEditForm({ ...editForm, nik: e.target.value.replace(/\D/g, '') })}
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor="editKk">No. KK</label>
                <input
                  id="editKk"
                  type="text"
                  maxLength={16}
                  value={editForm.kkNumber}
                  onChange={(e) => setEditForm({ ...editForm, kkNumber: e.target.value.replace(/\D/g, '') })}
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor="editRt">RT</label>
                <input
                  id="editRt"
                  type="text"
                  value={editForm.rt}
                  onChange={(e) => setEditForm({ ...editForm, rt: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor="editRw">RW</label>
                <input
                  id="editRw"
                  type="text"
                  value={editForm.rw}
                  onChange={(e) => setEditForm({ ...editForm, rw: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor="editPhone">Telepon</label>
                <input
                  id="editPhone"
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor="editStatus">Status</label>
                <select
                  id="editStatus"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as UserStatus })}
                  className="input"
                >
                  <option value="pending">Menunggu</option>
                  <option value="active">Aktif</option>
                  <option value="rejected">Ditolak</option>
                  <option value="disabled">Nonaktif</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="label" htmlFor="editAddress">Alamat</label>
                <textarea
                  id="editAddress"
                  rows={2}
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => { setEditing(null); setEditForm(null); }} className="btn-secondary flex-1">Batal</button>
              <button onClick={handleSaveEdit} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

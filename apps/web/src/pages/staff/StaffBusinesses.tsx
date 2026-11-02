// Kelola Jasa & Usaha Warga (staff)

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { api } from '../../lib/api';
import type { ResidentBusiness, BusinessStatus, BusinessCategory } from '@sipedes/shared';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { LoadingState, EmptyState, ErrorState, Pagination, Modal, ConfirmDialog } from '../../components/ui';
import { formatDate, truncate } from '../../lib/utils';

const PAGE_LIMIT = 10;

const statusBusinessLabel = (s: string): string => {
  const map: Record<string, string> = {
    pending: 'Menunggu',
    approved: 'Disetujui',
    rejected: 'Ditolak',
    disabled: 'Nonaktif',
  };
  return map[s] ?? s;
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

interface BusinessForm {
  name: string;
  categoryId: number | '';
  description: string;
  whatsapp: string;
  whatsappPublished: boolean;
  address: string;
  rt: string;
  rw: string;
  photoUrl: string;
  latitude: string;
  longitude: string;
  status: BusinessStatus;
}

const EMPTY_FORM: BusinessForm = {
  name: '', categoryId: '', description: '', whatsapp: '', whatsappPublished: true,
  address: '', rt: '', rw: '', photoUrl: '', latitude: '', longitude: '', status: 'pending',
};

interface CategoryForm {
  name: string;
  description: string;
  icon: string;
}

const EMPTY_CAT_FORM: CategoryForm = { name: '', description: '', icon: '' };

export function StaffBusinesses() {
  const { isAdmin } = useAuthStore();
  const toast = useToastStore();
  const [items, setItems] = useState<ResidentBusiness[]>([]);
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<BusinessStatus | ''>('');

  // Business form modal
  const [editing, setEditing] = useState<ResidentBusiness | null>(null);
  const [form, setForm] = useState<BusinessForm>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Detail modal
  const [detail, setDetail] = useState<ResidentBusiness | null>(null);

  // Status change modal (reject with note)
  const [rejecting, setRejecting] = useState<ResidentBusiness | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');

  // Delete confirmation
  const [deleting, setDeleting] = useState<ResidentBusiness | null>(null);

  // Category modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState<CategoryForm>(EMPTY_CAT_FORM);
  const [editingCat, setEditingCat] = useState<BusinessCategory | null>(null);
  const [savingCat, setSavingCat] = useState(false);
  const [deletingCat, setDeletingCat] = useState<BusinessCategory | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/business-categories');
      if (res.data.success) {
        const list = res.data.data?.items ?? res.data.data ?? [];
        setCategories(Array.isArray(list) ? (list as BusinessCategory[]) : []);
      }
    } catch {
      /* silent */
    }
  }, []);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/businesses/admin', {
        params: {
          page,
          limit: PAGE_LIMIT,
          search: search || undefined,
          status: statusFilter || undefined,
        },
      });
      if (res.data.success) {
        setItems(res.data.data?.items ?? []);
        setTotalPages(res.data.meta?.totalPages ?? 1);
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
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (b: ResidentBusiness) => {
    setEditing(b);
    setForm({
      name: b.name,
      categoryId: b.categoryId,
      description: b.description ?? '',
      whatsapp: b.whatsapp ?? '',
      whatsappPublished: b.whatsappPublished,
      address: b.address ?? '',
      rt: b.rt ?? '',
      rw: b.rw ?? '',
      photoUrl: b.photoUrl ?? '',
      latitude: b.latitude != null ? String(b.latitude) : '',
      longitude: b.longitude != null ? String(b.longitude) : '',
      status: b.status,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Nama usaha wajib diisi');
      return;
    }
    if (!form.categoryId) {
      toast.error('Kategori wajib dipilih');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        categoryId: Number(form.categoryId),
        description: form.description.trim() || undefined,
        whatsapp: form.whatsapp.trim() || undefined,
        whatsappPublished: form.whatsappPublished,
        address: form.address.trim() || undefined,
        rt: form.rt.trim() || undefined,
        rw: form.rw.trim() || undefined,
        photoUrl: form.photoUrl.trim() || undefined,
        latitude: form.latitude.trim() ? Number(form.latitude) : undefined,
        longitude: form.longitude.trim() ? Number(form.longitude) : undefined,
        status: form.status,
      };
      let res;
      if (editing) {
        res = await api.put(`/businesses/${editing.id}`, payload);
      } else {
        res = await api.post('/businesses', payload);
      }
      if (res.data.success) {
        toast.success(editing ? 'Usaha diperbarui' : 'Usaha dibuat');
        setShowForm(false);
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal menyimpan');
      }
    } catch (err) {
      let msg = 'Gagal menyimpan usaha';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (b: ResidentBusiness) => {
    try {
      const res = await api.patch(`/businesses/${b.id}/status`, { status: 'approved' });
      if (res.data.success) {
        toast.success('Usaha disetujui & dipublikasikan');
        fetch();
        if (detail?.id === b.id) setDetail({ ...b, status: 'approved' });
      } else {
        toast.error(res.data.message || 'Gagal menyetujui');
      }
    } catch (err) {
      let msg = 'Gagal menyetujui';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    }
  };

  const handleReject = async () => {
    if (!rejecting) return;
    if (!rejectionNote.trim()) {
      toast.error('Catatan penolakan wajib diisi');
      return;
    }
    try {
      const res = await api.patch(`/businesses/${rejecting.id}/status`, {
        status: 'rejected',
        rejectionNote: rejectionNote.trim(),
      });
      if (res.data.success) {
        toast.success('Usaha ditolak');
        setRejecting(null);
        setRejectionNote('');
        fetch();
        if (detail?.id === rejecting.id) setDetail({ ...rejecting, status: 'rejected', rejectionNote: rejectionNote.trim() });
      } else {
        toast.error(res.data.message || 'Gagal menolak');
      }
    } catch (err) {
      let msg = 'Gagal menolak';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    }
  };

  const handleDisable = async (b: ResidentBusiness) => {
    try {
      const res = await api.patch(`/businesses/${b.id}/status`, { status: 'disabled' });
      if (res.data.success) {
        toast.success('Usaha dinonaktifkan');
        fetch();
        if (detail?.id === b.id) setDetail({ ...b, status: 'disabled' });
      } else {
        toast.error(res.data.message || 'Gagal menonaktifkan');
      }
    } catch (err) {
      let msg = 'Gagal menonaktifkan';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await api.delete(`/businesses/${deleting.id}`);
      if (res.data.success) {
        toast.success('Usaha dihapus');
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal menghapus');
      }
    } catch (err) {
      let msg = 'Gagal menghapus usaha';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    }
  };

  // Category CRUD
  const openCreateCat = () => {
    setEditingCat(null);
    setCatForm(EMPTY_CAT_FORM);
    setShowCatModal(true);
  };

  const openEditCat = (c: BusinessCategory) => {
    setEditingCat(c);
    setCatForm({ name: c.name, description: c.description ?? '', icon: c.icon ?? '' });
    setShowCatModal(true);
  };

  const handleSaveCat = async () => {
    if (!catForm.name.trim()) {
      toast.error('Nama kategori wajib diisi');
      return;
    }
    setSavingCat(true);
    try {
      const payload = {
        name: catForm.name.trim(),
        description: catForm.description.trim() || undefined,
        icon: catForm.icon.trim() || undefined,
      };
      let res;
      if (editingCat) {
        res = await api.put(`/business-categories/${editingCat.id}`, payload);
      } else {
        res = await api.post('/business-categories', payload);
      }
      if (res.data.success) {
        toast.success(editingCat ? 'Kategori diperbarui' : 'Kategori dibuat');
        setShowCatModal(false);
        fetchCategories();
      } else {
        toast.error(res.data.message || 'Gagal menyimpan kategori');
      }
    } catch (err) {
      let msg = 'Gagal menyimpan kategori';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCat = async () => {
    if (!deletingCat) return;
    try {
      const res = await api.delete(`/business-categories/${deletingCat.id}`);
      if (res.data.success) {
        toast.success('Kategori dihapus');
        fetchCategories();
      } else {
        toast.error(res.data.message || 'Gagal menghapus kategori');
      }
    } catch (err) {
      let msg = 'Gagal menghapus kategori';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest-900">Jasa & Usaha Warga</h1>
          <p className="text-sm text-forest-600 mt-1">Tinjau dan kelola usaha yang diajukan warga.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCatModal(true)} className="btn-secondary">
            Kelola Kategori
          </button>
          <button onClick={openCreate} className="btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Usaha
          </button>
        </div>
      </div>

      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nama/pemilik usaha..."
            className="input flex-1 min-w-[200px]"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as BusinessStatus | ''); setPage(1); }}
            className="input sm:w-44"
          >
            <option value="">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
            <option value="disabled">Nonaktif</option>
          </select>
          <button type="submit" className="btn-primary">Cari</button>
          {(search || statusFilter) && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchInput(''); setStatusFilter(''); setPage(1); }}
              className="btn-secondary"
            >Reset</button>
          )}
        </form>
      </div>

      {loading ? (
        <LoadingState message="Memuat usaha..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetch} />
      ) : items.length === 0 ? (
        <div className="card p-8">
          <EmptyState title="Belum ada usaha" message="Belum ada usaha yang diajukan warga." />
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="table-app">
              <thead>
                <tr>
                  <th>Nama Usaha</th>
                  <th>Pemilik</th>
                  <th>Kategori</th>
                  <th>WhatsApp</th>
                  <th>Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((b) => (
                  <tr key={b.id}>
                    <td className="font-semibold text-forest-900 max-w-xs truncate">{b.name}</td>
                    <td>{b.ownerName ?? '-'}</td>
                    <td>{b.categoryName ?? '-'}</td>
                    <td className="text-forest-600">{b.whatsapp ?? '-'}</td>
                    <td><span className={businessBadgeClass(b.status)}>{statusBusinessLabel(b.status)}</span></td>
                    <td className="text-right whitespace-nowrap">
                      <button onClick={() => setDetail(b)} className="btn-ghost text-sm">Detail</button>
                      {b.status === 'pending' && (
                        <button
                          onClick={() => handleApprove(b)}
                          className="btn-ghost text-sm text-forest-700"
                        >Setujui</button>
                      )}
                      {b.status !== 'rejected' && (
                        <button
                          onClick={() => { setRejecting(b); setRejectionNote(''); }}
                          className="btn-ghost text-sm text-red-700 hover:bg-red-50"
                        >Tolak</button>
                      )}
                      {b.status === 'approved' && (
                        <button
                          onClick={() => handleDisable(b)}
                          className="btn-ghost text-sm text-wood-700 hover:bg-wood-50"
                        >Nonaktif</button>
                      )}
                      <button onClick={() => openEdit(b)} className="btn-ghost text-sm">Edit</button>
                      {isAdmin && (
                        <button
                          onClick={() => setDeleting(b)}
                          className="btn-ghost text-sm text-red-700 hover:bg-red-50"
                        >Hapus</button>
                      )}
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
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Detail Usaha"
        size="lg"
      >
        {detail && (
          <div className="space-y-4">
            {detail.photoUrl && (
              <div className="aspect-video bg-cream-100 rounded-lg overflow-hidden">
                <img src={detail.photoUrl} alt={detail.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-forest-900">{detail.name}</h3>
              <span className={businessBadgeClass(detail.status)}>{statusBusinessLabel(detail.status)}</span>
            </div>
            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-forest-600">Pemilik</dt>
                <dd className="font-semibold text-forest-900">{detail.ownerName ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-forest-600">Kategori</dt>
                <dd className="text-forest-900">{detail.categoryName ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-forest-600">WhatsApp</dt>
                <dd className="text-forest-900">{detail.whatsapp ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-forest-600">Alamat</dt>
                <dd className="text-forest-900">{detail.address ?? '-'} (RT {detail.rt ?? '-'}/RW {detail.rw ?? '-'})</dd>
              </div>
              <div>
                <dt className="text-forest-600">Dibuat</dt>
                <dd className="text-forest-900">{formatDate(detail.createdAt)}</dd>
              </div>
              {detail.latitude != null && detail.longitude != null && (
                <div>
                  <dt className="text-forest-600">Koordinat</dt>
                  <dd className="text-forest-900 font-mono text-xs">{detail.latitude}, {detail.longitude}</dd>
                </div>
              )}
            </dl>
            {detail.description && (
              <div>
                <dt className="label">Deskripsi</dt>
                <p className="text-forest-700 whitespace-pre-line text-sm">{detail.description}</p>
              </div>
            )}
            {detail.rejectionNote && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                <p className="font-semibold mb-1">Catatan Penolakan:</p>
                <p>{detail.rejectionNote}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Form modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Usaha' : 'Tambah Usaha'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="b-name">Nama <span className="text-red-600">*</span></label>
              <input
                id="b-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="b-cat">Kategori <span className="text-red-600">*</span></label>
              <select
                id="b-cat"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value === '' ? '' : Number(e.target.value) })}
                className="input"
              >
                <option value="">Pilih kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="b-desc">Deskripsi</label>
            <textarea
              id="b-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="b-wa">WhatsApp</label>
              <input
                id="b-wa"
                type="text"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="b-status">Status</label>
              <select
                id="b-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as BusinessStatus })}
                className="input"
              >
                <option value="pending">Menunggu</option>
                <option value="approved">Disetujui</option>
                <option value="rejected">Ditolak</option>
                <option value="disabled">Nonaktif</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.whatsappPublished}
              onChange={(e) => setForm({ ...form, whatsappPublished: e.target.checked })}
              className="w-4 h-4 rounded border-cream-300 text-forest-700 focus:ring-forest-500"
            />
            <span className="text-sm text-forest-800">Tampilkan WhatsApp di publik</span>
          </label>

          <div>
            <label className="label" htmlFor="b-addr">Alamat</label>
            <input
              id="b-addr"
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="input"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="b-rt">RT</label>
              <input
                id="b-rt"
                type="text"
                value={form.rt}
                onChange={(e) => setForm({ ...form, rt: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="b-rw">RW</label>
              <input
                id="b-rw"
                type="text"
                value={form.rw}
                onChange={(e) => setForm({ ...form, rw: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="b-photo">URL Foto</label>
            <input
              id="b-photo"
              type="url"
              value={form.photoUrl}
              onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
              className="input"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="b-lat">Latitude</label>
              <input
                id="b-lat"
                type="text"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="b-lng">Longitude</label>
              <input
                id="b-lng"
                type="text"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Batal</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal
        open={!!rejecting}
        onClose={() => { setRejecting(null); setRejectionNote(''); }}
        title="Tolak Usaha"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-forest-700">
            Tolak usaha "<span className="font-semibold">{rejecting?.name}</span>"? Berikan catatan untuk pemilik.
          </p>
          <div>
            <label className="label" htmlFor="reject-note">Catatan Penolakan <span className="text-red-600">*</span></label>
            <textarea
              id="reject-note"
              rows={3}
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              className="input"
              placeholder="Jelaskan alasan penolakan..."
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => { setRejecting(null); setRejectionNote(''); }} className="btn-secondary flex-1">Batal</button>
            <button onClick={handleReject} className="btn-danger flex-1">Tolak Usaha</button>
          </div>
        </div>
      </Modal>

      {/* Category modal */}
      <Modal
        open={showCatModal}
        onClose={() => setShowCatModal(false)}
        title="Kelola Kategori Usaha"
        size="lg"
      >
        <div className="space-y-4">
          {/* Form kategori */}
          <div className="border border-cream-200 rounded-lg p-4 bg-cream-50">
            <h3 className="font-semibold text-forest-900 mb-3">
              {editingCat ? 'Edit Kategori' : 'Tambah Kategori'}
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="cat-name">Nama <span className="text-red-600">*</span></label>
                <input
                  id="cat-name"
                  type="text"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="input"
                  placeholder="Kuliner"
                />
              </div>
              <div>
                <label className="label" htmlFor="cat-icon">Ikon (opsional)</label>
                <input
                  id="cat-icon"
                  type="text"
                  value={catForm.icon}
                  onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
                  className="input"
                  placeholder="nama-ikon"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="label" htmlFor="cat-desc">Deskripsi</label>
              <textarea
                id="cat-desc"
                rows={2}
                value={catForm.description}
                onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                className="input"
              />
            </div>
            <div className="flex gap-2 mt-3">
              {editingCat && (
                <button
                  onClick={() => { setEditingCat(null); setCatForm(EMPTY_CAT_FORM); }}
                  className="btn-secondary"
                >Batal Edit</button>
              )}
              <button onClick={handleSaveCat} disabled={savingCat} className="btn-primary">
                {savingCat ? 'Menyimpan...' : editingCat ? 'Perbarui' : 'Tambah'}
              </button>
            </div>
          </div>

          {/* List kategori */}
          <div>
            <h3 className="font-semibold text-forest-900 mb-2">Daftar Kategori</h3>
            {categories.length === 0 ? (
              <EmptyState title="Belum ada kategori" />
            ) : (
              <table className="table-app">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Slug</th>
                    <th className="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td className="font-semibold text-forest-900">{c.name}</td>
                      <td className="text-xs font-mono text-forest-600">{c.slug}</td>
                      <td className="text-right">
                        <button onClick={() => openEditCat(c)} className="btn-ghost text-sm">Edit</button>
                        {isAdmin && (
                          <button
                            onClick={() => setDeletingCat(c)}
                            className="btn-ghost text-sm text-red-700 hover:bg-red-50"
                          >Hapus</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="text-right">
            <button onClick={() => setShowCatModal(false)} className="btn-secondary">Tutup</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Hapus Usaha"
        message={`Anda yakin ingin menghapus usaha "${deleting?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        danger
      />

      <ConfirmDialog
        open={!!deletingCat}
        onClose={() => setDeletingCat(null)}
        onConfirm={handleDeleteCat}
        title="Hapus Kategori"
        message={`Anda yakin ingin menghapus kategori "${deletingCat?.name}"? Usaha yang memakai kategori ini mungkin terpengaruh.`}
        confirmLabel="Hapus"
        danger
      />
    </div>
  );
}

// CRUD pengumuman untuk staff/admin

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { api } from '../../lib/api';
import type { Announcement, AnnouncementStatus } from '@sipedes/shared';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { LoadingState, EmptyState, ErrorState, Pagination, Modal, ConfirmDialog } from '../../components/ui';
import { formatDate, formatDateTime, getStatusBadgeClass, statusLabel } from '../../lib/utils';

const PAGE_LIMIT = 10;

interface AnnForm {
  title: string;
  content: string;
  status: AnnouncementStatus;
  pinned: boolean;
}

const EMPTY_FORM: AnnForm = {
  title: '', content: '', status: 'draft', pinned: false,
};

export function StaffPengumuman() {
  const { isAdmin } = useAuthStore();
  const toast = useToastStore();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<AnnForm>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Announcement | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/announcements/admin', {
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
        setError(res.data.message || 'Gagal memuat pengumuman');
      }
    } catch (err) {
      let msg = 'Gagal memuat pengumuman';
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

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm({
      title: a.title,
      content: a.content,
      status: a.status,
      pinned: a.pinned,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Judul wajib diisi');
      return;
    }
    if (!form.content.trim()) {
      toast.error('Konten wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content,
        status: form.status,
        pinned: form.pinned,
      };
      let res;
      if (editing) {
        res = await api.put(`/announcements/${editing.id}`, payload);
      } else {
        res = await api.post('/announcements', payload);
      }
      if (res.data.success) {
        toast.success(editing ? 'Pengumuman diperbarui' : 'Pengumuman dibuat');
        setShowForm(false);
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal menyimpan');
      }
    } catch (err) {
      let msg = 'Gagal menyimpan pengumuman';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await api.delete(`/announcements/${deleting.id}`);
      if (res.data.success) {
        toast.success('Pengumuman dihapus');
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal menghapus');
      }
    } catch (err) {
      let msg = 'Gagal menghapus pengumuman';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest-900">Kelola Pengumuman</h1>
          <p className="text-sm text-forest-600 mt-1">Tulis dan kelola pengumuman desa.</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Pengumuman
        </button>
      </div>

      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari pengumuman..."
            className="input flex-1 min-w-[200px]"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input sm:w-44"
          >
            <option value="">Semua Status</option>
            <option value="draft">Draf</option>
            <option value="published">Dipublikasi</option>
            <option value="archived">Diarsipkan</option>
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
        <LoadingState message="Memuat pengumuman..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetch} />
      ) : items.length === 0 ? (
        <div className="card p-8">
          <EmptyState title="Belum ada pengumuman" message="Klik 'Tambah Pengumuman' untuk membuat baru." />
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="table-app">
              <thead>
                <tr>
                  <th>Judul</th>
                  <th>Disematkan</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id}>
                    <td className="font-semibold text-forest-900 max-w-xs truncate">{a.title}</td>
                    <td>{a.pinned ? <span className="badge-gold">Ya</span> : <span className="badge-gray">Tidak</span>}</td>
                    <td><span className={getStatusBadgeClass(a.status)}>{statusLabel(a.status)}</span></td>
                    <td className="text-forest-600">{formatDate(a.publishedAt ?? a.createdAt)}</td>
                    <td className="text-right">
                      <button onClick={() => openEdit(a)} className="btn-ghost text-sm">Edit</button>
                      {isAdmin && (
                        <button
                          onClick={() => setDeleting(a)}
                          className="btn-ghost text-sm text-red-700 hover:bg-red-50"
                        >
                          Hapus
                        </button>
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

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Pengumuman' : 'Tambah Pengumuman'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="title">Judul <span className="text-red-600">*</span></label>
            <input
              id="title"
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input"
              placeholder="Judul pengumuman"
            />
          </div>

          <div>
            <label className="label" htmlFor="content">Konten <span className="text-red-600">*</span></label>
            <textarea
              id="content"
              rows={6}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="input"
              placeholder="Isi pengumuman..."
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="status">Status</label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as AnnouncementStatus })}
                className="input"
              >
                <option value="draft">Draf</option>
                <option value="published">Dipublikasi</option>
                <option value="archived">Diarsipkan</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
                  className="w-4 h-4 rounded border-cream-300 text-forest-700 focus:ring-forest-500"
                />
                <span className="text-sm font-semibold text-forest-800">Sematkan di atas</span>
              </label>
            </div>
          </div>

          {editing && (
            <p className="text-xs text-forest-600">
              Diperbarui: {formatDateTime(editing.updatedAt)}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Batal</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Hapus Pengumuman"
        message={`Anda yakin ingin menghapus pengumuman "${deleting?.title}"?`}
        confirmLabel="Hapus"
        danger
      />
    </div>
  );
}

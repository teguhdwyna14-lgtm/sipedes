// CRUD berita untuk staff/admin

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { api } from '../../lib/api';
import type { News, NewsStatus } from '@sipedes/shared';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { LoadingState, EmptyState, ErrorState, Pagination, Modal, ConfirmDialog } from '../../components/ui';
import { formatDate, getStatusBadgeClass, statusLabel } from '../../lib/utils';

const PAGE_LIMIT = 10;

interface NewsForm {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  imageUrl: string;
  status: NewsStatus;
}

const EMPTY_FORM: NewsForm = {
  title: '', excerpt: '', content: '', category: '', imageUrl: '', status: 'draft',
};

export function StaffBerita() {
  const { isAdmin } = useAuthStore();
  const toast = useToastStore();
  const [items, setItems] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [editing, setEditing] = useState<News | null>(null);
  const [form, setForm] = useState<NewsForm>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<News | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/news/admin', {
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
        setError(res.data.message || 'Gagal memuat berita');
      }
    } catch (err) {
      let msg = 'Gagal memuat berita';
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

  const openEdit = (n: News) => {
    setEditing(n);
    setForm({
      title: n.title,
      excerpt: n.excerpt ?? '',
      content: n.content,
      category: n.category ?? '',
      imageUrl: n.imageUrl ?? '',
      status: n.status,
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
        excerpt: form.excerpt.trim() || undefined,
        content: form.content,
        category: form.category.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        status: form.status,
      };
      let res;
      if (editing) {
        res = await api.put(`/news/${editing.id}`, payload);
      } else {
        res = await api.post('/news', payload);
      }
      if (res.data.success) {
        toast.success(editing ? 'Berita diperbarui' : 'Berita dibuat');
        setShowForm(false);
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal menyimpan');
      }
    } catch (err) {
      let msg = 'Gagal menyimpan berita';
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
      const res = await api.delete(`/news/${deleting.id}`);
      if (res.data.success) {
        toast.success('Berita dihapus');
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal menghapus');
      }
    } catch (err) {
      let msg = 'Gagal menghapus berita';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest-900">Kelola Berita</h1>
          <p className="text-sm text-forest-600 mt-1">Tulis dan kelola berita desa.</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Berita
        </button>
      </div>

      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari judul berita..."
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
        <LoadingState message="Memuat berita..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetch} />
      ) : items.length === 0 ? (
        <div className="card p-8">
          <EmptyState title="Belum ada berita" message="Klik 'Tambah Berita' untuk membuat berita baru." />
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="table-app">
              <thead>
                <tr>
                  <th>Judul</th>
                  <th>Kategori</th>
                  <th>Status</th>
                  <th>Tanggal Publish</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((n) => (
                  <tr key={n.id}>
                    <td className="font-semibold text-forest-900 max-w-xs truncate">{n.title}</td>
                    <td>{n.category ?? '-'}</td>
                    <td><span className={getStatusBadgeClass(n.status)}>{statusLabel(n.status)}</span></td>
                    <td className="text-forest-600">{n.publishedAt ? formatDate(n.publishedAt) : '-'}</td>
                    <td className="text-right">
                      <button onClick={() => openEdit(n)} className="btn-ghost text-sm">Edit</button>
                      {isAdmin && (
                        <button
                          onClick={() => setDeleting(n)}
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

      {/* Form modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Berita' : 'Tambah Berita'}
        size="xl"
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
              placeholder="Judul berita"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="category">Kategori</label>
              <input
                id="category"
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input"
                placeholder="Kategori berita"
              />
            </div>
            <div>
              <label className="label" htmlFor="status">Status</label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as NewsStatus })}
                className="input"
              >
                <option value="draft">Draf</option>
                <option value="published">Dipublikasi</option>
                <option value="archived">Diarsipkan</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="imageUrl">URL Gambar</label>
            <input
              id="imageUrl"
              type="url"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              className="input"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="label" htmlFor="excerpt">Ringkasan</label>
            <textarea
              id="excerpt"
              rows={2}
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              className="input"
              placeholder="Ringkasan singkat berita"
            />
          </div>

          <div>
            <label className="label" htmlFor="content">Konten <span className="text-red-600">*</span></label>
            <textarea
              id="content"
              rows={10}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="input font-mono text-sm"
              placeholder="Tulis konten berita. Gunakan enter untuk membuat paragraf baru."
            />
            <p className="help-text">Pisahkan paragraf dengan baris kosong (enter dua kali).</p>
          </div>

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
        title="Hapus Berita"
        message={`Anda yakin ingin menghapus berita "${deleting?.title}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        danger
      />
    </div>
  );
}

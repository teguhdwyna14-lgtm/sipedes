// Kelola arsip dokumen untuk staff/admin

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { api } from '../../lib/api';
import type { DocumentRecord } from '@sipedes/shared';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { LoadingState, EmptyState, ErrorState, Pagination, Modal, ConfirmDialog } from '../../components/ui';
import { formatDate, formatFileSize } from '../../lib/utils';

const PAGE_LIMIT = 10;

interface UploadForm {
  title: string;
  description: string;
  category: string;
  isPublic: boolean;
  file: File | null;
}

const EMPTY_FORM: UploadForm = { title: '', description: '', category: '', isPublic: false, file: null };

export function StaffDokumen() {
  const { isAdmin } = useAuthStore();
  const toast = useToastStore();
  const [items, setItems] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<UploadForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<DocumentRecord | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/documents', { params: { page, limit: PAGE_LIMIT } });
      if (res.data.success) {
        setItems(res.data.data?.items ?? []);
        setTotalPages(res.data.meta?.totalPages ?? 1);
      } else {
        setError(res.data.message || 'Gagal memuat dokumen');
      }
    } catch (err) {
      let msg = 'Gagal memuat dokumen';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleUpload = async () => {
    if (!form.title.trim()) {
      toast.error('Judul wajib diisi');
      return;
    }
    if (!form.file) {
      toast.error('File wajib diunggah');
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title.trim());
      if (form.description.trim()) formData.append('description', form.description.trim());
      if (form.category.trim()) formData.append('category', form.category.trim());
      formData.append('isPublic', String(form.isPublic));
      formData.append('file', form.file);

      const res = await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        toast.success('Dokumen berhasil diunggah');
        setShowForm(false);
        setForm(EMPTY_FORM);
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal mengunggah');
      }
    } catch (err) {
      let msg = 'Gagal mengunggah dokumen';
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
      const res = await api.delete(`/documents/${deleting.id}`);
      if (res.data.success) {
        toast.success('Dokumen dihapus');
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal menghapus');
      }
    } catch (err) {
      let msg = 'Gagal menghapus dokumen';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    }
  };

  const handleDownload = async (doc: DocumentRecord) => {
    setDownloadingId(doc.id);
    try {
      const res = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      let msg = 'Gagal mengunduh dokumen';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest-900">Arsip Dokumen</h1>
          <p className="text-sm text-forest-600 mt-1">Kelola dokumen dan arsip desa.</p>
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setShowForm(true); }} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Upload Dokumen
        </button>
      </div>

      {loading ? (
        <LoadingState message="Memuat dokumen..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetch} />
      ) : items.length === 0 ? (
        <div className="card p-8">
          <EmptyState title="Belum ada dokumen" message="Klik 'Upload Dokumen' untuk menambahkan." />
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="table-app">
              <thead>
                <tr>
                  <th>Judul</th>
                  <th>Kategori</th>
                  <th>Ukuran</th>
                  <th>Akses</th>
                  <th>Tanggal</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id}>
                    <td className="font-semibold text-forest-900 max-w-xs truncate">{d.title}</td>
                    <td>{d.category ?? '-'}</td>
                    <td className="text-forest-600">{formatFileSize(d.fileSize)}</td>
                    <td>
                      {d.isPublic ? <span className="badge-green">Publik</span> : <span className="badge-gray">Privat</span>}
                    </td>
                    <td className="text-forest-600">{formatDate(d.createdAt)}</td>
                    <td className="text-right">
                      <button
                        onClick={() => handleDownload(d)}
                        disabled={downloadingId === d.id}
                        className="btn-ghost text-sm disabled:opacity-50"
                      >
                        {downloadingId === d.id ? 'Mengunduh...' : 'Unduh'}
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => setDeleting(d)}
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

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Upload Dokumen Baru" size="lg">
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="title">Judul <span className="text-red-600">*</span></label>
            <input
              id="title"
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input"
              placeholder="Judul dokumen"
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
                placeholder="Contoh: Regulasi, SK, Laporan"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                  className="w-4 h-4 rounded border-cream-300 text-forest-700 focus:ring-forest-500"
                />
                <span className="text-sm font-semibold text-forest-800">Dokumen publik</span>
              </label>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="description">Deskripsi</label>
            <textarea
              id="description"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input"
              placeholder="Deskripsi dokumen (opsional)"
            />
          </div>

          <div>
            <label className="label" htmlFor="file">File <span className="text-red-600">*</span></label>
            <input
              id="file"
              type="file"
              onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })}
              className="input"
            />
            {form.file && (
              <p className="help-text">
                {form.file.name} ({formatFileSize(form.file.size)})
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Batal</button>
            <button onClick={handleUpload} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Mengunggah...' : 'Upload'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Hapus Dokumen"
        message={`Anda yakin ingin menghapus dokumen "${deleting?.title}"?`}
        confirmLabel="Hapus"
        danger
      />
    </div>
  );
}

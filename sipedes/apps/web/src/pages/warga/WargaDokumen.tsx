// List dokumen milik warga + dokumen publik

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { api } from '../../lib/api';
import type { DocumentRecord } from '@sipedes/shared';
import { useToastStore } from '../../store/toastStore';
import { LoadingState, EmptyState, ErrorState, Pagination } from '../../components/ui';
import { formatDate, formatFileSize } from '../../lib/utils';

const PAGE_LIMIT = 12;

export function WargaDokumen() {
  const toast = useToastStore();
  const [items, setItems] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
      toast.success('Dokumen diunduh');
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
      <div>
        <h1 className="text-2xl font-bold text-forest-900">Dokumen Saya</h1>
        <p className="text-sm text-forest-600 mt-1">Daftar dokumen pribadi dan publik yang tersedia.</p>
      </div>

      {loading ? (
        <LoadingState message="Memuat dokumen..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetch} />
      ) : items.length === 0 ? (
        <div className="card p-8">
          <EmptyState title="Belum ada dokumen" message="Dokumen yang tersedia akan tampil di sini." />
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
                  <th>Tanggal</th>
                  <th>Akses</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-forest-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <div className="font-semibold text-forest-900">{d.title}</div>
                          {d.description && <div className="text-xs text-forest-600 truncate max-w-xs">{d.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="text-forest-700">{d.category ?? '-'}</td>
                    <td className="text-forest-600">{formatFileSize(d.fileSize)}</td>
                    <td className="text-forest-600">{formatDate(d.createdAt)}</td>
                    <td>
                      {d.isPublic ? (
                        <span className="badge-green">Publik</span>
                      ) : (
                        <span className="badge-gray">Privat</span>
                      )}
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => handleDownload(d)}
                        disabled={downloadingId === d.id}
                        className="btn-ghost text-sm disabled:opacity-50"
                      >
                        {downloadingId === d.id ? 'Mengunduh...' : 'Unduh'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}

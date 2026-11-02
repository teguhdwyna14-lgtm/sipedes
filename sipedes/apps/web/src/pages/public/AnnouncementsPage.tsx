// Halaman daftar pengumuman desa

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { api } from '../../lib/api';
import type { Announcement } from '@sipedes/shared';
import { LoadingState, EmptyState, ErrorState, Pagination, Modal } from '../../components/ui';
import { formatRelative, formatDateTime } from '../../lib/utils';

const PAGE_LIMIT = 10;

export function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<Announcement | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/public/announcements', {
        params: { page, limit: PAGE_LIMIT, search: search || undefined },
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
  }, [page, search]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  // Pengumuman pinned di atas
  const pinned = items.filter((a) => a.pinned);
  const rest = items.filter((a) => !a.pinned);

  return (
    <div>
      <section className="bg-forest-800 text-cream-50">
        <div className="container-app py-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Pengumuman Desa</h1>
          <p className="text-cream-200">Informasi resmi dan pengumuman dari pemerintah desa.</p>
        </div>
      </section>

      <section className="container-app py-8">
        <form onSubmit={handleSearch} className="flex gap-2 mb-6 max-w-lg">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari pengumuman..."
            className="input flex-1"
          />
          <button type="submit" className="btn-primary">Cari</button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
              className="btn-secondary"
            >
              Reset
            </button>
          )}
        </form>

        {loading ? (
          <LoadingState message="Memuat pengumuman..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetch} />
        ) : items.length === 0 ? (
          <EmptyState title="Belum ada pengumuman" message="Pengumuman akan tampil di sini setelah dipublikasi." />
        ) : (
          <>
            {pinned.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gold-800 mb-3 uppercase tracking-wide">Disematkan</h2>
                <div className="space-y-3">
                  {pinned.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setSelected(a)}
                      className="card card-hover w-full text-left p-5 bg-gold-50 border-gold-200"
                    >
                      <div className="flex items-start gap-3">
                        <span className="badge-gold flex-shrink-0">Disematkan</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-forest-900">{a.title}</h3>
                          <p className="text-sm text-forest-600 mt-1 line-clamp-2">{a.content}</p>
                          <p className="text-xs text-forest-500 mt-2">{formatRelative(a.publishedAt ?? a.createdAt)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {rest.length > 0 && (
              <div className="space-y-3">
                {rest.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelected(a)}
                    className="card card-hover w-full text-left p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-forest-900">{a.title}</h3>
                        <p className="text-sm text-forest-600 mt-1 line-clamp-2">{a.content}</p>
                        <p className="text-xs text-forest-500 mt-2">
                          {formatDateTime(a.publishedAt ?? a.createdAt)}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-forest-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </section>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ''}
        size="lg"
      >
        {selected && (
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {selected.pinned && <span className="badge-gold">Disematkan</span>}
              <span className="text-xs text-forest-600">
                Dipublikasi: {formatDateTime(selected.publishedAt ?? selected.createdAt)}
              </span>
            </div>
            <div className="text-forest-800 whitespace-pre-line leading-relaxed">
              {selected.content}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

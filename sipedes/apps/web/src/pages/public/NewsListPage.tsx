// Halaman daftar berita desa dengan search & pagination

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../lib/api';
import type { News } from '@sipedes/shared';
import { LoadingState, EmptyState, ErrorState, Pagination } from '../../components/ui';
import { formatRelative, truncate } from '../../lib/utils';

const PAGE_LIMIT = 9;

export function NewsListPage() {
  const [news, setNews] = useState<News[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/public/news', {
        params: { page, limit: PAGE_LIMIT, search: search || undefined, category: category || undefined },
      });
      if (res.data.success) {
        setNews(res.data.data?.items ?? []);
        const meta = res.data.meta;
        setTotalPages(meta?.totalPages ?? 1);
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
  }, [page, search, category]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  useEffect(() => {
    api.get('/public/news-categories')
      .then((res) => {
        if (res.data.success) {
          setCategories(res.data.data ?? []);
        }
      })
      .catch(() => { /* silent */ });
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleCategory = (cat: string) => {
    setPage(1);
    setCategory(cat);
  };

  return (
    <div>
      {/* Header */}
      <section className="bg-forest-800 text-cream-50">
        <div className="container-app py-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Berita Desa</h1>
          <p className="text-cream-200">Informasi terkini seputar kegiatan dan pemberitaan desa.</p>
        </div>
      </section>

      <section className="container-app py-8">
        {/* Filter & search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari berita..."
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
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleCategory('')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${category === '' ? 'bg-forest-700 text-cream-50' : 'bg-cream-200 text-forest-800 hover:bg-cream-300'}`}
              >
                Semua
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${category === cat ? 'bg-forest-700 text-cream-50' : 'bg-cream-200 text-forest-800 hover:bg-cream-300'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Konten */}
        {loading ? (
          <LoadingState message="Memuat berita..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchNews} />
        ) : news.length === 0 ? (
          <EmptyState title="Belum ada berita" message="Berita akan tampil di sini setelah dipublikasi." />
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.map((n) => (
                <Link key={n.id} to={`/berita/${n.slug}`} className="card card-hover group flex flex-col">
                  <div className="aspect-video bg-gradient-to-br from-forest-200 to-cream-200 flex items-center justify-center">
                    {n.imageUrl ? (
                      <img src={n.imageUrl} alt={n.title} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-12 h-12 text-forest-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    {n.category && <span className="badge-gold self-start mb-2">{n.category}</span>}
                    <h3 className="font-semibold text-forest-900 group-hover:text-forest-700 transition-colors line-clamp-2">
                      {n.title}
                    </h3>
                    <p className="text-sm text-forest-600 mt-2 line-clamp-2 flex-1">{n.excerpt || truncate(n.content, 120)}</p>
                    <div className="flex items-center justify-between mt-3 text-xs text-forest-500">
                      <span>{n.authorName ?? 'Redaksi'}</span>
                      <span>{formatRelative(n.publishedAt ?? n.createdAt)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </section>
    </div>
  );
}

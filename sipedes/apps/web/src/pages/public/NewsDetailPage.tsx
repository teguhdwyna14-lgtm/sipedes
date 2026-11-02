// Halaman detail berita by slug

import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../lib/api';
import type { News } from '@sipedes/shared';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui';
import { formatDateTime } from '../../lib/utils';

export function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [news, setNews] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/public/news/${slug}`);
      if (res.data.success) {
        setNews(res.data.data as News);
      } else {
        setError(res.data.message || 'Berita tidak ditemukan');
        setNews(null);
      }
    } catch (err) {
      let msg = 'Gagal memuat berita';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.message ?? err.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
      setNews(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  if (loading) return <LoadingState message="Memuat berita..." />;

  if (error || !news) {
    return (
      <div className="container-app py-12">
        {error ? (
          <ErrorState message={error} onRetry={fetch} />
        ) : (
          <EmptyState title="Berita tidak ditemukan" message="Berita mungkin telah dihapus atau dipindahkan." />
        )}
        <div className="text-center mt-4">
          <Link to="/berita" className="btn-primary">&larr; Kembali ke Daftar Berita</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <section className="bg-forest-800 text-cream-50">
        <div className="container-app py-10">
          <Link to="/berita" className="text-cream-300 hover:text-gold-300 text-sm">&larr; Kembali ke Berita</Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {news.category && <span className="badge-gold">{news.category}</span>}
            <span className="text-xs text-cream-300">{formatDateTime(news.publishedAt ?? news.createdAt)}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mt-3 leading-tight">{news.title}</h1>
          {news.authorName && (
            <p className="text-cream-300 text-sm mt-3">Oleh: {news.authorName}</p>
          )}
        </div>
      </section>

      {/* Gambar */}
      {news.imageUrl && (
        <div className="container-app py-6">
          <img
            src={news.imageUrl}
            alt={news.title}
            className="w-full max-h-[480px] object-cover rounded-xl shadow-card"
          />
        </div>
      )}

      {/* Konten */}
      <article className="container-app py-8">
        <div className="max-w-3xl">
          {news.excerpt && (
            <p className="text-lg text-forest-700 font-medium mb-6 leading-relaxed border-l-4 border-gold-500 pl-4 italic">
              {news.excerpt}
            </p>
          )}
          <div className="prose prose-forest max-w-none">
            {news.content.split('\n').map((para, idx) => (
              para.trim() ? (
                <p key={idx} className="text-forest-800 leading-relaxed mb-4">{para}</p>
              ) : null
            ))}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-cream-200">
          <Link to="/berita" className="btn-secondary">&larr; Kembali ke Berita</Link>
        </div>
      </article>
    </div>
  );
}

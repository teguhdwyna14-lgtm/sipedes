// Halaman Beranda publik

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import type { News, Announcement, ServiceType, VillageSettings } from '@sipedes/shared';
import { LoadingState, EmptyState } from '../../components/ui';
import { useVillageSettings } from '../../hooks/useVillageSettings';
import { formatRelative, truncate } from '../../lib/utils';

export function HomePage() {
  const { settings } = useVillageSettings();
  const [news, setNews] = useState<News[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/public/news', { params: { limit: 3 } }),
      api.get('/public/announcements', { params: { limit: 3 } }),
      api.get('/public/service-types', { params: { limit: 6 } }),
    ])
      .then(([newsRes, annRes, svcRes]) => {
        setNews(newsRes.data.data?.items ?? []);
        setAnnouncements(annRes.data.data?.items ?? []);
        setServices(svcRes.data.data?.items ?? []);
      })
      .catch(() => { /* silent */ })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-forest-800 text-cream-50 overflow-hidden">
        <div className="absolute inset-0 bg-batik-pattern opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-br from-forest-900/80 to-forest-700/40" />
        <div className="container-app relative py-20 sm:py-28">
          <div className="max-w-3xl">
            <div className="inline-block px-3 py-1 rounded-full bg-gold-500/20 text-gold-300 text-xs font-semibold mb-4 border border-gold-500/30">
              Selamat Datang di Portal Resmi
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-4">
              Pemerintah Desa {settings?.village_name ?? 'Sukamaju'}
            </h1>
            <p className="text-lg sm:text-xl text-cream-200 mb-8 leading-relaxed">
              {settings?.regency}, {settings?.province}. Sistem Informasi dan Pelayanan Desa (SIPEDES) menyediakan layanan publik yang cepat, transparan, dan akuntabel bagi seluruh warga.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/layanan" className="btn-gold">
                Layanan Surat Online
              </Link>
              <Link to="/register" className="btn-outline border-cream-200 text-cream-50 hover:bg-cream-50 hover:text-forest-800">
                Daftar Akun Warga
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="bg-cream-100 border-y border-cream-200">
        <div className="container-app py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-forest-700">5+</div>
              <div className="text-sm text-forest-600 mt-1">Jenis Layanan Surat</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-forest-700">800+</div>
              <div className="text-sm text-forest-600 mt-1">Kepala Keluarga</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-forest-700">5,2</div>
              <div className="text-sm text-forest-600 mt-1">km² Luas Wilayah</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-forest-700">4</div>
              <div className="text-sm text-forest-600 mt-1">Dusun</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pengumuman terbaru */}
      {announcements.length > 0 && (
        <section className="container-app py-12">
          <div className="bg-gold-50 border border-gold-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-gold-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              <h2 className="text-xl font-bold text-gold-900">Pengumuman Terkini</h2>
            </div>
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                  {a.pinned && <span className="badge-gold flex-shrink-0">Disematkan</span>}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-forest-900">{a.title}</h3>
                    <p className="text-sm text-forest-600 mt-0.5">{truncate(a.content, 120)}</p>
                    <p className="text-xs text-forest-500 mt-1">{formatRelative(a.publishedAt ?? a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Berita & Layanan */}
      <section className="container-app pb-16">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Berita terbaru */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title">Berita Desa</h2>
              <Link to="/berita" className="text-sm font-semibold text-forest-700 hover:text-forest-900">
                Lihat semua &rarr;
              </Link>
            </div>
            {news.length === 0 ? (
              <EmptyState title="Belum ada berita" />
            ) : (
              <div className="grid sm:grid-cols-2 gap-6">
                {news.map((n) => (
                  <Link
                    key={n.id}
                    to={`/berita/${n.slug}`}
                    className="card card-hover group"
                  >
                    <div className="aspect-video bg-gradient-to-br from-forest-200 to-cream-200 flex items-center justify-center">
                      {n.imageUrl ? (
                        <img src={n.imageUrl} alt={n.title} className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-12 h-12 text-forest-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="p-4">
                      {n.category && <span className="badge-gold mb-2">{n.category}</span>}
                      <h3 className="font-semibold text-forest-900 group-hover:text-forest-700 transition-colors line-clamp-2">
                        {n.title}
                      </h3>
                      <p className="text-sm text-forest-600 mt-2 line-clamp-2">{n.excerpt}</p>
                      <p className="text-xs text-forest-500 mt-3">{formatRelative(n.publishedAt ?? n.createdAt)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Layanan surat */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title">Layanan Surat</h2>
            </div>
            <div className="card divide-y divide-cream-100">
              {services.length === 0 ? (
                <EmptyState title="Belum ada layanan" />
              ) : (
                services.map((s) => (
                  <Link
                    key={s.id}
                    to="/layanan"
                    className="flex items-center gap-3 p-4 hover:bg-cream-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-forest-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-forest-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-forest-900 text-sm">{s.name}</div>
                      <div className="text-xs text-forest-600">Kode: {s.code}</div>
                    </div>
                    <svg className="w-4 h-4 text-forest-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))
              )}
            </div>
            <Link to="/register" className="btn-primary w-full mt-4">
              Ajukan Permohonan Surat
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

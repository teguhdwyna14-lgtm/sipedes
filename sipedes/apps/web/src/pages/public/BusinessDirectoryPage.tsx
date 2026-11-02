// Direktori publik Jasa & Usaha Warga

import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../lib/api';
import type { ResidentBusiness, BusinessCategory } from '@sipedes/shared';
import { LoadingState, EmptyState, ErrorState, Pagination } from '../../components/ui';
import { truncate } from '../../lib/utils';

const PAGE_LIMIT = 12;

export function BusinessDirectoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ResidentBusiness[]>([]);
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');

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
      const res = await api.get('/businesses', {
        params: {
          page,
          limit: PAGE_LIMIT,
          search: search || undefined,
          categoryId: categoryId || undefined,
        },
      });
      if (res.data.success) {
        setItems(res.data.data?.items ?? []);
        setTotalPages(res.data.meta?.totalPages ?? 1);
      } else {
        setError(res.data.message || 'Gagal memuat data usaha');
      }
    } catch (err) {
      let msg = 'Gagal memuat data usaha';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryId]);

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

  const handleReset = () => {
    setSearch('');
    setSearchInput('');
    setCategoryId('');
    setPage(1);
  };

  const openWhatsapp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const text = encodeURIComponent('Halo, saya ingin bertanya mengenai jasa yang tercantum di SIPEDES.');
    window.open(`https://wa.me/${cleaned}?text=${text}`, '_blank');
  };

  const openMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  return (
    <div>
      {/* Header */}
      <section className="bg-forest-800 text-cream-50">
        <div className="container-app py-12">
          <div className="max-w-3xl">
            <div className="inline-block px-3 py-1 rounded-full bg-gold-500/20 text-gold-300 text-xs font-semibold mb-4 border border-gold-500/30">
              Direktori Warga
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">Jasa & Usaha Warga</h1>
            <p className="text-cream-200">
              Temukan jasa dan usaha warga Desa Sukamaju. Dari kuliner, kerajinan, jasa harian, hingga pertanian. Hubungi langsung pemilik usaha melalui WhatsApp.
            </p>
          </div>
        </div>
      </section>

      <section className="container-app py-10">
        {/* Filter & search */}
        <div className="card p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama/deskripsi usaha..."
              className="input flex-1 min-w-[200px]"
            />
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value === '' ? '' : Number(e.target.value));
                setPage(1);
              }}
              className="input sm:w-56"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button type="submit" className="btn-primary">Cari</button>
            {(search || categoryId !== '') && (
              <button type="button" onClick={handleReset} className="btn-secondary">Reset</button>
            )}
          </form>
        </div>

        {loading ? (
          <LoadingState message="Memuat usaha..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetch} />
        ) : items.length === 0 ? (
          <div className="card p-8">
            <EmptyState
              title="Belum ada usaha ditemukan"
              message="Coba ubah kata kunci atau filter kategori, atau hubungi kantor desa jika Anda ingin mendaftarkan usaha."
            />
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((b) => (
                <div
                  key={b.id}
                  onClick={() => navigate(`/jasa-usaha/${b.id}`)}
                  className="card card-hover cursor-pointer flex flex-col"
                >
                  <div className="aspect-video bg-gradient-to-br from-forest-200 to-cream-200 flex items-center justify-center">
                    {b.photoUrl ? (
                      <img src={b.photoUrl} alt={b.name} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-12 h-12 text-forest-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-forest-900 line-clamp-1">{b.name}</h3>
                      {b.categoryName && <span className="badge-gold flex-shrink-0">{b.categoryName}</span>}
                    </div>
                    <p className="text-xs text-forest-600 mb-2">Oleh: {b.ownerName ?? '-'}</p>
                    <p className="text-sm text-forest-700 line-clamp-2 flex-1">{b.description ?? '-'}</p>
                    {(b.rt || b.rw) && (
                      <p className="text-xs text-forest-500 mt-2">
                        {b.address ? `${truncate(b.address, 60)} - ` : ''}RT {b.rt ?? '-'}/RW {b.rw ?? '-'}
                      </p>
                    )}
                    <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                      {b.whatsappPublished && b.whatsapp && (
                        <button
                          onClick={() => openWhatsapp(b.whatsapp as string)}
                          className="btn-primary text-xs px-3 py-1.5 flex-1"
                        >
                          Hubungi
                        </button>
                      )}
                      {b.latitude != null && b.longitude != null && (
                        <button
                          onClick={() => openMaps(b.latitude as number, b.longitude as number)}
                          className="btn-secondary text-xs px-3 py-1.5 flex-1"
                        >
                          Lihat Lokasi
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </section>

      <section className="bg-cream-100 border-t border-cream-200">
        <div className="container-app py-8 text-center">
          <h2 className="text-lg font-bold text-forest-900">Punya usaha? Daftarkan di sini.</h2>
          <p className="text-sm text-forest-600 mt-1 mb-4">
            Warga terverifikasi dapat mendaftarkan jasa/usaha agar tampil di direktori publik.
          </p>
          <Link to="/register" className="btn-gold">Daftar Akun Warga</Link>
        </div>
      </section>
    </div>
  );
}

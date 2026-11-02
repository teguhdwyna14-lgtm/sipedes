// Detail Jasa & Usaha Warga (publik)

import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../lib/api';
import type { ResidentBusiness } from '@sipedes/shared';
import { LoadingState, ErrorState } from '../../components/ui';

export function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<ResidentBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/businesses/${id}`);
      if (res.data.success) {
        setItem(res.data.data as ResidentBusiness);
      } else {
        setError(res.data.message || 'Usaha tidak ditemukan');
      }
    } catch (err) {
      let msg = 'Usaha tidak ditemukan atau tidak tersedia untuk publik.';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const openWhatsapp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const text = encodeURIComponent('Halo, saya ingin bertanya mengenai jasa yang tercantum di SIPEDES.');
    window.open(`https://wa.me/${cleaned}?text=${text}`, '_blank');
  };

  const openMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  if (loading) return <LoadingState message="Memuat detail usaha..." />;
  if (error || !item) {
    return (
      <div className="container-app py-12">
        <ErrorState
          message={error ?? 'Usaha tidak ditemukan'}
          onRetry={fetch}
        />
        <div className="text-center mt-4">
          <Link to="/jasa-usaha" className="btn-secondary">&larr; Kembali ke Direktori</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <section className="bg-forest-800 text-cream-50">
        <div className="container-app py-10">
          <Link to="/jasa-usaha" className="inline-flex items-center text-sm text-gold-300 hover:text-gold-200 mb-4">
            &larr; Kembali ke Direktori
          </Link>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h1 className="text-3xl sm:text-4xl font-bold">{item.name}</h1>
            {item.categoryName && <span className="badge-gold">{item.categoryName}</span>}
          </div>
          <p className="text-cream-200">Pemilik: <span className="font-semibold">{item.ownerName ?? '-'}</span></p>
        </div>
      </section>

      <section className="container-app py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Photo */}
          <div className="lg:col-span-2">
            <div className="card overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-forest-200 to-cream-200 flex items-center justify-center">
                {item.photoUrl ? (
                  <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-16 h-16 text-forest-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                )}
              </div>
            </div>

            <div className="card p-6 mt-6">
              <h2 className="text-lg font-bold text-forest-900 mb-3">Deskripsi</h2>
              <p className="text-forest-700 whitespace-pre-line leading-relaxed">
                {item.description ?? 'Tidak ada deskripsi.'}
              </p>
            </div>
          </div>

          {/* Sidebar info */}
          <div>
            <div className="card p-6">
              <h2 className="text-lg font-bold text-forest-900 mb-4">Informasi Kontak</h2>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-forest-600">Pemilik</dt>
                  <dd className="font-semibold text-forest-900">{item.ownerName ?? '-'}</dd>
                </div>
                <div>
                  <dt className="text-forest-600">Alamat</dt>
                  <dd className="text-forest-900">{item.address ?? '-'}</dd>
                </div>
                <div>
                  <dt className="text-forest-600">RT / RW</dt>
                  <dd className="text-forest-900">{item.rt ?? '-'} / {item.rw ?? '-'}</dd>
                </div>
                {item.whatsappPublished && item.whatsapp && (
                  <div>
                    <dt className="text-forest-600">WhatsApp</dt>
                    <dd className="font-semibold text-forest-900">{item.whatsapp}</dd>
                  </div>
                )}
              </dl>

              <div className="mt-5 space-y-2">
                {item.whatsappPublished && item.whatsapp && (
                  <button
                    onClick={() => openWhatsapp(item.whatsapp as string)}
                    className="btn-primary w-full"
                  >
                    Hubungi via WhatsApp
                  </button>
                )}
                {item.latitude != null && item.longitude != null && (
                  <button
                    onClick={() => openMaps(item.latitude as number, item.longitude as number)}
                    className="btn-secondary w-full"
                  >
                    Lihat Lokasi (Google Maps)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
  );
}

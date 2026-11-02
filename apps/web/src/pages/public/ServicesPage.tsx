// Halaman daftar jenis layanan surat

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../lib/api';
import type { ServiceType } from '@sipedes/shared';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui';

export function ServicesPage() {
  const [services, setServices] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/public/service-types');
      if (res.data.success) {
        setServices(res.data.data?.items ?? []);
      } else {
        setError(res.data.message || 'Gagal memuat layanan');
      }
    } catch (err) {
      let msg = 'Gagal memuat layanan';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <div>
      {/* Header */}
      <section className="bg-forest-800 text-cream-50">
        <div className="container-app py-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Layanan Surat Online</h1>
          <p className="text-cream-200">Berbagai jenis layanan surat yang tersedia untuk warga desa.</p>
        </div>
      </section>

      <section className="container-app py-8">
        {/* Info box */}
        <div className="bg-gold-50 border border-gold-200 rounded-xl p-5 mb-8 flex items-start gap-3">
          <svg className="w-5 h-5 text-gold-700 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-forest-800">
              Untuk mengajukan permohonan surat, silakan login sebagai warga terverifikasi.
              Akun baru perlu diverifikasi petugas terlebih dahulu sebelum dapat mengajukan permohonan.
            </p>
            <div className="flex gap-2 mt-3">
              <Link to="/login" className="btn-primary">Masuk</Link>
              <Link to="/register" className="btn-outline">Daftar Akun</Link>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Memuat layanan..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetch} />
        ) : services.length === 0 ? (
          <EmptyState title="Belum ada layanan" message="Jenis layanan surat akan tampil di sini." />
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {services.map((s) => (
              <div key={s.id} className="card p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-forest-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-forest-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <span className="badge-blue">{s.code}</span>
                    </div>
                  </div>
                  {s.processingDays != null && (
                    <span className="text-xs text-forest-600">
                      Estimasi: <strong className="text-forest-800">{s.processingDays} hari</strong>
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-forest-900">{s.name}</h3>
                {s.description && (
                  <p className="text-sm text-forest-600 mt-2 leading-relaxed">{s.description}</p>
                )}
                {s.requirements && (
                  <div className="mt-4 pt-4 border-t border-cream-200">
                    <h4 className="text-sm font-semibold text-forest-800 mb-2">Persyaratan:</h4>
                    <ul className="space-y-1">
                      {s.requirements.split('\n').filter((r) => r.trim()).map((req, idx) => (
                        <li key={idx} className="text-sm text-forest-700 flex items-start gap-2">
                          <svg className="w-4 h-4 text-forest-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{req.replace(/^[-*]\s*/, '').trim()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

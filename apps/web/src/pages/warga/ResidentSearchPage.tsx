// Halaman Cari Warga (login-only) - dengan disambiguasi RT/RW & kepala KK

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../lib/api';
import type { ResidentSearchResult, HouseholdRole } from '@sipedes/shared';
import { LoadingState, EmptyState, ErrorState, Pagination } from '../../components/ui';

const PAGE_LIMIT = 10;

const roleLabel: Record<HouseholdRole, string> = {
  kepala: 'Kepala Keluarga',
  istri: 'Istri',
  anak: 'Anak',
  cucu: 'Cucu',
  orang_tua: 'Orang Tua',
  famili_lain: 'Famili Lain',
  pembantu: 'Pembantu',
  lainnya: 'Lainnya',
};

export function ResidentSearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [results, setResults] = useState<ResidentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetch = useCallback(async () => {
    if (!submittedQuery.trim()) return;
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const res = await api.get('/residents-search/search', {
        params: { q: submittedQuery.trim(), page, limit: PAGE_LIMIT },
      });
      if (res.data.success) {
        setResults(res.data.data?.items ?? []);
        setTotalPages(res.data.meta?.totalPages ?? 1);
      } else {
        setError(res.data.message || 'Gagal mencari warga');
      }
    } catch (err) {
      let msg = 'Gagal mencari warga';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [submittedQuery, page]);

  useEffect(() => {
    if (submittedQuery) fetch();
  }, [fetch, submittedQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setPage(1);
    setSubmittedQuery(query.trim());
  };

  const handleReset = () => {
    setQuery('');
    setSubmittedQuery('');
    setResults([]);
    setHasSearched(false);
    setError(null);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-forest-900">Cari Warga</h1>
        <p className="text-sm text-forest-600 mt-1">
          Cari warga Desa Sukamaju berdasarkan nama. Untuk membedakan warga dengan nama sama, perhatikan RT/RW dan kepala keluarga.
        </p>
      </div>

      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik nama warga..."
            className="input flex-1 min-w-[200px]"
            autoFocus
          />
          <button type="submit" className="btn-primary" disabled={loading}>Cari</button>
          {submittedQuery && (
            <button type="button" onClick={handleReset} className="btn-secondary">Reset</button>
          )}
        </form>
      </div>

      {!hasSearched ? (
        <div className="card p-8">
          <EmptyState
            title="Mulai mencari warga"
            message="Masukkan nama warga pada kolom pencarian di atas. Hasil pencarian akan menampilkan RT/RW dan kepala keluarga untuk membantu identifikasi."
          />
        </div>
      ) : loading ? (
        <LoadingState message="Mencari warga..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetch} />
      ) : results.length === 0 ? (
        <div className="card p-8">
          <EmptyState
            title="Tidak ada warga ditemukan"
            message={`Tidak ada hasil untuk "${submittedQuery}". Coba kata kunci lain.`}
          />
        </div>
      ) : (
        <>
          <p className="text-sm text-forest-600">
            Ditemukan {results.length} hasil untuk "<span className="font-semibold">{submittedQuery}</span>"
          </p>
          <div className="space-y-3">
            {results.map((r) => (
              <div
                key={r.id}
                onClick={() => navigate(`/warga/cari-warga/${r.id}`)}
                className="card card-hover p-4 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-forest-900">{r.fullName}</h3>
                    {/* Disambiguasi: hubungan dengan kepala KK */}
                    {r.headName && r.householdRole && (
                      <p className="text-sm text-forest-600 mt-0.5">
                        {roleLabel[r.householdRole]} dari KK {r.headName}
                      </p>
                    )}
                    {!r.headName && r.householdRole === 'kepala' && (
                      <p className="text-sm text-forest-600 mt-0.5">Kepala Keluarga</p>
                    )}
                    {/* Disambiguasi: RT/RW & dusun */}
                    <p className="text-xs text-forest-700 mt-1 font-medium">
                      RT {r.rt ?? '-'} / RW {r.rw ?? '-'}{r.dusun ? `, Dusun ${r.dusun}` : ''}
                    </p>
                    {r.phonePublished && r.phone && (
                      <p className="text-xs text-forest-500 mt-0.5">Telp: {r.phone}</p>
                    )}
                  </div>
                  <span className="btn-ghost text-sm flex-shrink-0">Lihat Profil &rarr;</span>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}

// Profil warga publik (yang diizinkan) by id

import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../lib/api';
import type { HouseholdRole, ResidentSearchResult, Household, HouseholdMember } from '@sipedes/shared';
import { LoadingState, ErrorState } from '../../components/ui';

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

const genderLabel = (g?: string | null): string => {
  if (g === 'L') return 'Laki-laki';
  if (g === 'P') return 'Perempuan';
  return '-';
};

// Profile response dari endpoint residents-search/:id
interface ResidentProfileResponse {
  resident: ResidentSearchResult;
  household?: Household & { members?: HouseholdMember[] };
}

export function ResidentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ResidentProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/residents-search/${id}`);
      if (res.data.success && res.data.data) {
        setData(res.data.data as ResidentProfileResponse);
      } else {
        setError(res.data.message || 'Profil warga tidak ditemukan');
      }
    } catch (err) {
      let msg = 'Profil warga tidak ditemukan atau tidak publik.';
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

  if (loading) return <LoadingState message="Memuat profil warga..." />;
  if (error || !data) {
    return (
      <div>
        <ErrorState message={error ?? 'Profil tidak ditemukan'} onRetry={fetch} />
        <div className="text-center mt-4">
          <Link to="/warga/cari-warga" className="btn-secondary">&larr; Kembali ke Pencarian</Link>
        </div>
      </div>
    );
  }

  const { resident, household } = data;
  const members = household?.members ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link to="/warga/cari-warga" className="inline-flex items-center text-sm text-forest-700 hover:text-forest-900 mb-2">
          &larr; Kembali ke Pencarian
        </Link>
        <h1 className="text-2xl font-bold text-forest-900">Profil Warga</h1>
      </div>

      {/* Kartu profil warga */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-forest-700 text-cream-50 flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {resident.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-forest-900">{resident.fullName}</h2>
            <p className="text-sm text-forest-600">{genderLabel(resident.gender)}</p>
            <p className="text-sm text-forest-700 mt-2">
              RT {resident.rt ?? '-'} / RW {resident.rw ?? '-'}{resident.dusun ? `, Dusun ${resident.dusun}` : ''}
            </p>
            {resident.householdRole && (
              <p className="text-sm text-forest-700 mt-1">
                Status: <span className="font-semibold">{roleLabel[resident.householdRole]}</span>
              </p>
            )}
            {resident.phonePublished && resident.phone && (
              <p className="text-sm text-forest-600 mt-1">Telp: {resident.phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Informasi Kartu Keluarga */}
      {household && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-forest-900 mb-4">Informasi Kartu Keluarga</h2>
          <dl className="grid sm:grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <dt className="text-forest-600">Nomor KK (disamarkan)</dt>
              <dd className="font-semibold text-forest-900">{household.kkNumberMasked ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-forest-600">Kepala Keluarga</dt>
              <dd className="font-semibold text-forest-900">{household.headName ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-forest-600">Alamat</dt>
              <dd className="text-forest-900">{household.address}</dd>
            </div>
            <div>
              <dt className="text-forest-600">RT / RW</dt>
              <dd className="text-forest-900">{household.rt ?? '-'} / {household.rw ?? '-'}</dd>
            </div>
            {household.dusun && (
              <div>
                <dt className="text-forest-600">Dusun</dt>
                <dd className="text-forest-900">{household.dusun}</dd>
              </div>
            )}
          </dl>

          <h3 className="font-semibold text-forest-900 mb-3">Anggota Keluarga</h3>
          {members.length === 0 ? (
            <p className="text-sm text-forest-600">Tidak ada data anggota keluarga.</p>
          ) : (
            <ul className="divide-y divide-cream-100">
              {members.map((m) => (
                <li key={m.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-forest-900">{m.fullName}</span>
                      {m.role === 'kepala' && <span className="badge-gold">Kepala KK</span>}
                    </div>
                    <p className="text-xs text-forest-600 mt-0.5">
                      {roleLabel[m.role]} - {genderLabel(m.gender)}
                    </p>
                    {m.phonePublished && m.phone && (
                      <p className="text-xs text-forest-500 mt-0.5">Telp: {m.phone}</p>
                    )}
                  </div>
                  <span className="text-xs text-forest-400 flex-shrink-0">
                    NIK: {m.nikMasked ?? '****'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="text-center">
        <Link to="/warga/cari-warga" className="btn-secondary">Kembali ke Pencarian</Link>
      </div>
    </div>
  );
}

// Kartu Keluarga saya (warga)

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../lib/api';
import type { Household, HouseholdMember, HouseholdRole } from '@sipedes/shared';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui';
import { formatDate, getStatusBadgeClass, statusLabel } from '../../lib/utils';

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

interface MyHouseholdResponse extends Household {
  members?: HouseholdMember[];
}

export function MyHouseholdPage() {
  const [data, setData] = useState<MyHouseholdResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const res = await api.get('/households/mine');
      if (res.data.success) {
        setData(res.data.data as MyHouseholdResponse);
      } else {
        setError(res.data.message || 'Gagal memuat KK');
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setNotFound(true);
      } else {
        let msg = 'Gagal memuat data KK';
        if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
        else if (err instanceof Error) msg = err.message;
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  if (loading) return <LoadingState message="Memuat Kartu Keluarga..." />;
  if (error) return <ErrorState message={error} onRetry={fetch} />;

  if (notFound) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-forest-900">Kartu Keluarga Saya</h1>
          <p className="text-sm text-forest-600 mt-1">Informasi KK tempat Anda terdaftar.</p>
        </div>
        <div className="card p-8">
          <EmptyState
            title="Belum terdaftar dalam KK"
            message="Anda belum terdaftar dalam Kartu Keluarga manapun. Hubungi kantor desa untuk didaftarkan."
            action={<Link to="/warga" className="btn-secondary">Kembali ke Dashboard</Link>}
          />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const members = data.members ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-forest-900">Kartu Keluarga Saya</h1>
        <p className="text-sm text-forest-600 mt-1">Informasi KK tempat Anda terdaftar sebagai anggota.</p>
      </div>

      {/* Info KK */}
      <div className="card p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-12 h-12 rounded-lg bg-forest-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-forest-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-forest-900">Kartu Keluarga</h2>
            <p className="text-sm text-forest-600">Nomor KK (disamarkan): {data.kkNumberMasked ?? '-'}</p>
          </div>
        </div>

        <dl className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-forest-600">Kepala Keluarga</dt>
            <dd className="font-semibold text-forest-900">{data.headName ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-forest-600">Jumlah Anggota</dt>
            <dd className="font-semibold text-forest-900">{data.memberCount ?? members.length} orang</dd>
          </div>
          <div>
            <dt className="text-forest-600">Alamat</dt>
            <dd className="text-forest-900">{data.address}</dd>
          </div>
          <div>
            <dt className="text-forest-600">RT / RW</dt>
            <dd className="text-forest-900">{data.rt ?? '-'} / {data.rw ?? '-'}</dd>
          </div>
          {data.dusun && (
            <div>
              <dt className="text-forest-600">Dusun</dt>
              <dd className="text-forest-900">{data.dusun}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Anggota keluarga */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-cream-200">
          <h2 className="text-lg font-bold text-forest-900">Anggota Keluarga</h2>
        </div>
        {members.length === 0 ? (
          <EmptyState title="Belum ada anggota" message="Data anggota keluarga belum tersedia." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-app">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Peran</th>
                  <th>Jenis Kelamin</th>
                  <th>Telp</th>
                  <th>Status</th>
                  <th>NIK (disamarkan)</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className={m.role === 'kepala' ? 'bg-gold-50' : ''}>
                    <td className="font-semibold text-forest-900">
                      {m.fullName}
                      {m.role === 'kepala' && <span className="badge-gold ml-2">Kepala KK</span>}
                    </td>
                    <td>{roleLabel[m.role]}</td>
                    <td>{genderLabel(m.gender)}</td>
                    <td className="text-forest-600">
                      {m.phonePublished && m.phone ? m.phone : '-'}
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(m.status)}>{statusLabel(m.status)}</span>
                    </td>
                    <td className="text-forest-500 font-mono text-xs">{m.nikMasked ?? '****'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-forest-500">
        Data KK dan NIK disamarkan demi privasi. Untuk data lengkap, hubungi kantor desa.
        {data.createdAt && ` KK terdaftar sejak ${formatDate(data.createdAt)}.`}
      </p>
    </div>
  );
}

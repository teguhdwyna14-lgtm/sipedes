// Halaman verifikasi warga (status pending) untuk staff/admin

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { api } from '../../lib/api';
import type { ResidentProfile } from '@sipedes/shared';
import { useToastStore } from '../../store/toastStore';
import { LoadingState, EmptyState, ErrorState, Modal, Pagination } from '../../components/ui';
import { formatDate, maskNik, maskPhone } from '../../lib/utils';

const PAGE_LIMIT = 10;

interface VerifyForm {
  status: 'active' | 'rejected';
  rejectionNote: string;
}

export function StaffVerifikasi() {
  const toast = useToastStore();
  const [items, setItems] = useState<ResidentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<ResidentProfile | null>(null);
  const [verifyForm, setVerifyForm] = useState<VerifyForm>({ status: 'active', rejectionNote: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/residents', { params: { status: 'pending', page, limit: PAGE_LIMIT } });
      if (res.data.success) {
        setItems(res.data.data?.items ?? []);
        setTotalPages(res.data.meta?.totalPages ?? 1);
      } else {
        setError(res.data.message || 'Gagal memuat data');
      }
    } catch (err) {
      let msg = 'Gagal memuat data warga';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const openVerify = (r: ResidentProfile) => {
    setSelected(r);
    setVerifyForm({ status: 'active', rejectionNote: '' });
  };

  const handleSubmit = async () => {
    if (!selected) return;
    if (verifyForm.status === 'rejected' && !verifyForm.rejectionNote.trim()) {
      toast.error('Alasan penolakan wajib diisi');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.patch(`/residents/${selected.id}/verify`, {
        status: verifyForm.status,
        rejectionNote: verifyForm.status === 'rejected' ? verifyForm.rejectionNote.trim() : undefined,
      });
      if (res.data.success) {
        toast.success(verifyForm.status === 'active' ? 'Warga berhasil diverifikasi' : 'Pendaftaran warga ditolak');
        setSelected(null);
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal memproses');
      }
    } catch (err) {
      let msg = 'Gagal memproses verifikasi';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-forest-900">Verifikasi Warga</h1>
        <p className="text-sm text-forest-600 mt-1">Daftar warga yang menunggu verifikasi.</p>
      </div>

      {loading ? (
        <LoadingState message="Memuat data..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetch} />
      ) : items.length === 0 ? (
        <div className="card p-8">
          <EmptyState title="Tidak ada warga menunggu verifikasi" message="Semua pendaftaran warga telah diproses." />
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="table-app">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>NIK</th>
                  <th>RT/RW</th>
                  <th>Telepon</th>
                  <th>Tanggal Daftar</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold text-forest-900">{r.fullName}</td>
                    <td className="font-mono text-sm">{maskNik(r.nik)}</td>
                    <td>{r.rt ?? '-'}/{r.rw ?? '-'}</td>
                    <td>{maskPhone(r.phone)}</td>
                    <td className="text-forest-600">{formatDate(r.createdAt)}</td>
                    <td className="text-right">
                      <button onClick={() => openVerify(r)} className="btn-primary text-sm">Verifikasi</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Verifikasi Warga" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="bg-cream-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-forest-600">Nama</div>
                  <div className="font-semibold text-forest-900">{selected.fullName}</div>
                </div>
                <div>
                  <div className="text-xs text-forest-600">NIK</div>
                  <div className="font-mono text-forest-900">{selected.nik ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-forest-600">No. KK</div>
                  <div className="font-mono text-forest-900">{selected.kkNumber ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-forest-600">Tanggal Lahir</div>
                  <div className="text-forest-900">{selected.birthDate ? formatDate(selected.birthDate) : '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-forest-600">RT/RW</div>
                  <div className="text-forest-900">{selected.rt ?? '-'}/{selected.rw ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-forest-600">Telepon</div>
                  <div className="text-forest-900">{selected.phone ?? '-'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-forest-600">Alamat</div>
                  <div className="text-forest-900">{selected.address ?? '-'}</div>
                </div>
              </div>
            </div>

            <div>
              <div className="label">Aksi Verifikasi</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setVerifyForm({ ...verifyForm, status: 'active' })}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors ${verifyForm.status === 'active' ? 'bg-forest-700 text-cream-50' : 'bg-cream-200 text-forest-800 hover:bg-cream-300'}`}
                >
                  Setujui
                </button>
                <button
                  onClick={() => setVerifyForm({ ...verifyForm, status: 'rejected' })}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors ${verifyForm.status === 'rejected' ? 'bg-red-600 text-white' : 'bg-cream-200 text-forest-800 hover:bg-cream-300'}`}
                >
                  Tolak
                </button>
              </div>
            </div>

            {verifyForm.status === 'rejected' && (
              <div>
                <label className="label" htmlFor="rejectionNote">Alasan Penolakan <span className="text-red-600">*</span></label>
                <textarea
                  id="rejectionNote"
                  rows={3}
                  value={verifyForm.rejectionNote}
                  onChange={(e) => setVerifyForm({ ...verifyForm, rejectionNote: e.target.value })}
                  className="input"
                  placeholder="Jelaskan alasan penolakan..."
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button onClick={() => setSelected(null)} className="btn-secondary flex-1">Batal</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Memproses...' : 'Konfirmasi'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

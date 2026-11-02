// Form ajukan permohonan surat baru

import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../lib/api';
import type { ServiceType, ServiceRequest } from '@sipedes/shared';
import { useToastStore } from '../../store/toastStore';
import { LoadingState, ErrorState } from '../../components/ui';

interface FormState {
  serviceTypeId: string;
  purpose: string;
  notes: string;
  attachment: File | null;
}

const EMPTY: FormState = { serviceTypeId: '', purpose: '', notes: '', attachment: null };

export function WargaPermohonanCreate() {
  const toast = useToastStore();
  const navigate = useNavigate();
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/public/service-types');
      if (res.data.success) {
        setServiceTypes(res.data.data?.items ?? []);
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
    fetchTypes();
  }, [fetchTypes]);

  const selectedType = serviceTypes.find((s) => s.id === Number(form.serviceTypeId));

  const validate = (): boolean => {
    const e: Partial<FormState> = {};
    if (!form.serviceTypeId) e.serviceTypeId = 'Jenis layanan wajib dipilih';
    if (!form.purpose.trim()) e.purpose = 'Keperluan wajib diisi';
    else if (form.purpose.trim().length < 10) e.purpose = 'Keperluan minimal 10 karakter';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        serviceTypeId: Number(form.serviceTypeId),
        purpose: form.purpose.trim(),
        notes: form.notes.trim() || undefined,
      };
      const res = await api.post('/services/requests', payload);
      if (!res.data.success) {
        toast.error(res.data.message || 'Gagal membuat permohonan');
        setSubmitting(false);
        return;
      }
      const created = res.data.data as ServiceRequest;

      // Upload attachment jika ada
      if (form.attachment) {
        try {
          const formData = new FormData();
          formData.append('file', form.attachment);
          await api.post(`/services/requests/${created.id}/attachments`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (uploadErr) {
          let msg = 'Lampiran gagal diunggah, namun permohonan telah dibuat';
          if (axios.isAxiosError(uploadErr)) msg = `${msg}: ${uploadErr.response?.data?.message ?? uploadErr.message}`;
          toast.warning(msg);
        }
      }

      toast.success('Permohonan berhasil dibuat');
      navigate('/warga/permohonan', { replace: true });
    } catch (err) {
      let msg = 'Gagal membuat permohonan';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState message="Memuat layanan..." />;
  if (error) return <ErrorState message={error} onRetry={fetchTypes} />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link to="/warga/permohonan" className="text-sm text-forest-600 hover:text-forest-900">&larr; Kembali</Link>
        <h1 className="text-2xl font-bold text-forest-900 mt-2">Ajukan Permohonan Surat</h1>
        <p className="text-sm text-forest-600 mt-1">Lengkapi formulir di bawah untuk mengajukan permohonan.</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="label" htmlFor="serviceTypeId">Jenis Layanan <span className="text-red-600">*</span></label>
          <select
            id="serviceTypeId"
            value={form.serviceTypeId}
            onChange={(e) => setForm({ ...form, serviceTypeId: e.target.value })}
            className={`input ${errors.serviceTypeId ? 'input-error' : ''}`}
          >
            <option value="">Pilih jenis layanan...</option>
            {serviceTypes.map((s) => (
              <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
            ))}
          </select>
          {errors.serviceTypeId && <p className="error-text">{errors.serviceTypeId}</p>}
        </div>

        {selectedType && (
          <div className="bg-cream-50 border border-cream-200 rounded-lg p-4 space-y-3">
            {selectedType.description && (
              <div>
                <div className="text-xs font-semibold text-forest-800">Deskripsi</div>
                <p className="text-sm text-forest-700">{selectedType.description}</p>
              </div>
            )}
            {selectedType.processingDays != null && (
              <div>
                <div className="text-xs font-semibold text-forest-800">Estimasi Proses</div>
                <p className="text-sm text-forest-700">{selectedType.processingDays} hari kerja</p>
              </div>
            )}
            {selectedType.requirements && (
              <div>
                <div className="text-xs font-semibold text-forest-800 mb-1">Persyaratan</div>
                <ul className="space-y-1">
                  {selectedType.requirements.split('\n').filter((r) => r.trim()).map((req, idx) => (
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
        )}

        <div>
          <label className="label" htmlFor="purpose">Keperluan <span className="text-red-600">*</span></label>
          <textarea
            id="purpose"
            rows={4}
            value={form.purpose}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            className={`input ${errors.purpose ? 'input-error' : ''}`}
            placeholder="Jelaskan keperluan pengajuan surat ini..."
          />
          {errors.purpose && <p className="error-text">{errors.purpose}</p>}
        </div>

        <div>
          <label className="label" htmlFor="notes">Catatan Tambahan</label>
          <textarea
            id="notes"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="input"
            placeholder="Catatan opsional untuk petugas"
          />
          <p className="help-text">Opsional</p>
        </div>

        <div>
          <label className="label" htmlFor="attachment">Lampiran</label>
          <input
            id="attachment"
            type="file"
            onChange={(e) => setForm({ ...form, attachment: e.target.files?.[0] ?? null })}
            className="input"
            accept="image/*,.pdf,.doc,.docx"
          />
          <p className="help-text">Opsional. Format: gambar, PDF, atau DOC. Maks. 5MB.</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? 'Memproses...' : 'Ajukan Permohonan'}
          </button>
          <Link to="/warga/permohonan" className="btn-secondary">Batal</Link>
        </div>
      </form>
    </div>
  );
}

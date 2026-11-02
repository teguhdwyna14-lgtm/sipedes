// Form buat pengaduan baru

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../lib/api';
import type { Complaint } from '@sipedes/shared';
import { useToastStore } from '../../store/toastStore';

const CATEGORIES = ['Infrastruktur', 'Kebersihan', 'Keamanan', 'Pelayanan', 'Lainnya'] as const;

interface FormState {
  title: string;
  description: string;
  category: string;
  isAnonymous: boolean;
}

const EMPTY: FormState = { title: '', description: '', category: '', isAnonymous: false };

export function WargaPengaduanCreate() {
  const toast = useToastStore();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  const validate = (): boolean => {
    const e: Partial<FormState> = {};
    if (!form.title.trim()) e.title = 'Judul wajib diisi';
    else if (form.title.trim().length < 5) e.title = 'Judul minimal 5 karakter';
    if (!form.description.trim()) e.description = 'Deskripsi wajib diisi';
    else if (form.description.trim().length < 20) e.description = 'Deskripsi minimal 20 karakter';
    if (!form.category) e.category = 'Kategori wajib dipilih';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        isAnonymous: form.isAnonymous,
      };
      const res = await api.post('/complaints', payload);
      if (res.data.success) {
        const created = res.data.data as Complaint;
        toast.success(`Pengaduan dibuat. Kode tracking: ${created.trackingCode}`);
        navigate('/warga/pengaduan', { replace: true });
      } else {
        toast.error(res.data.message || 'Gagal membuat pengaduan');
      }
    } catch (err) {
      let msg = 'Gagal membuat pengaduan';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link to="/warga/pengaduan" className="text-sm text-forest-600 hover:text-forest-900">&larr; Kembali</Link>
        <h1 className="text-2xl font-bold text-forest-900 mt-2">Buat Pengaduan Baru</h1>
        <p className="text-sm text-forest-600 mt-1">Sampaikan keluhan, laporan, atau aspirasi Anda.</p>
      </div>

      <div className="bg-gold-50 border border-gold-200 rounded-lg p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-gold-700 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-forest-800">
          Simpan kode tracking yang Anda terima setelah pengaduan dibuat.
          Kode ini dapat digunakan untuk melacak status pengaduan Anda.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="label" htmlFor="title">Judul Pengaduan <span className="text-red-600">*</span></label>
          <input
            id="title"
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={`input ${errors.title ? 'input-error' : ''}`}
            placeholder="Ringkasan singkat pengaduan"
          />
          {errors.title && <p className="error-text">{errors.title}</p>}
        </div>

        <div>
          <label className="label" htmlFor="category">Kategori <span className="text-red-600">*</span></label>
          <select
            id="category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className={`input ${errors.category ? 'input-error' : ''}`}
          >
            <option value="">Pilih kategori...</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {errors.category && <p className="error-text">{errors.category}</p>}
        </div>

        <div>
          <label className="label" htmlFor="description">Deskripsi <span className="text-red-600">*</span></label>
          <textarea
            id="description"
            rows={6}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={`input ${errors.description ? 'input-error' : ''}`}
            placeholder="Jelaskan pengaduan Anda dengan detail..."
          />
          {errors.description && <p className="error-text">{errors.description}</p>}
        </div>

        <div className="flex items-start gap-3">
          <input
            id="isAnonymous"
            type="checkbox"
            checked={form.isAnonymous}
            onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })}
            className="mt-1 w-4 h-4 rounded border-cream-300 text-forest-700 focus:ring-forest-500"
          />
          <div>
            <label htmlFor="isAnonymous" className="text-sm font-semibold text-forest-800 cursor-pointer">
              Kirim sebagai anonim
            </label>
            <p className="text-xs text-forest-600">Identitas Anda tidak akan ditampilkan secara publik</p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? 'Memproses...' : 'Kirim Pengaduan'}
          </button>
          <Link to="/warga/pengaduan" className="btn-secondary">Batal</Link>
        </div>
      </form>
    </div>
  );
}

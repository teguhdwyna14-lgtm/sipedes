// Form tambah/edit usaha warga

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../lib/api';
import type { BusinessCategory, ResidentBusiness } from '@sipedes/shared';
import { useToastStore } from '../../store/toastStore';
import { LoadingState, ErrorState } from '../../components/ui';
import { cn } from '../../lib/utils';

interface FormState {
  name: string;
  categoryId: number | '';
  description: string;
  whatsapp: string;
  whatsappPublished: boolean;
  address: string;
  rt: string;
  rw: string;
  photoUrl: string;
  latitude: string;
  longitude: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  categoryId: '',
  description: '',
  whatsapp: '',
  whatsappPublished: true,
  address: '',
  rt: '',
  rw: '',
  photoUrl: '',
  latitude: '',
  longitude: '',
};

interface FieldErrors {
  name?: string;
  categoryId?: string;
  whatsapp?: string;
  latitude?: string;
  longitude?: string;
}

export function WargaBusinessForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToastStore();
  const isEdit = !!id;

  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/businesses/${id}`);
      if (res.data.success && res.data.data) {
        const b = res.data.data as ResidentBusiness;
        setForm({
          name: b.name,
          categoryId: b.categoryId,
          description: b.description ?? '',
          whatsapp: b.whatsapp ?? '',
          whatsappPublished: b.whatsappPublished,
          address: b.address ?? '',
          rt: b.rt ?? '',
          rw: b.rw ?? '',
          photoUrl: b.photoUrl ?? '',
          latitude: b.latitude != null ? String(b.latitude) : '',
          longitude: b.longitude != null ? String(b.longitude) : '',
        });
      } else {
        setError(res.data.message || 'Usaha tidak ditemukan');
      }
    } catch (err) {
      let msg = 'Usaha tidak ditemukan';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCategories();
    if (isEdit) fetchDetail();
  }, [fetchCategories, fetchDetail, isEdit]);

  const validate = (): boolean => {
    const newErrors: FieldErrors = {};
    if (!form.name.trim()) newErrors.name = 'Nama usaha wajib diisi';
    if (!form.categoryId) newErrors.categoryId = 'Kategori wajib dipilih';
    if (form.whatsapp.trim()) {
      const cleaned = form.whatsapp.replace(/\D/g, '');
      if (cleaned.length < 10 || cleaned.length > 15) {
        newErrors.whatsapp = 'Nomor WhatsApp harus 10-15 digit angka';
      }
    }
    if (form.latitude.trim()) {
      const lat = Number(form.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) newErrors.latitude = 'Latitude tidak valid (-90 s/d 90)';
    }
    if (form.longitude.trim()) {
      const lng = Number(form.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) newErrors.longitude = 'Longitude tidak valid (-180 s/d 180)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        categoryId: Number(form.categoryId),
        description: form.description.trim() || undefined,
        whatsapp: form.whatsapp.trim() || undefined,
        whatsappPublished: form.whatsappPublished,
        address: form.address.trim() || undefined,
        rt: form.rt.trim() || undefined,
        rw: form.rw.trim() || undefined,
        photoUrl: form.photoUrl.trim() || undefined,
        latitude: form.latitude.trim() ? Number(form.latitude) : undefined,
        longitude: form.longitude.trim() ? Number(form.longitude) : undefined,
      };
      let res;
      if (isEdit && id) {
        res = await api.put(`/businesses/${id}`, payload);
      } else {
        res = await api.post('/businesses', payload);
      }
      if (res.data.success) {
        toast.success(isEdit ? 'Usaha berhasil diperbarui' : 'Usaha berhasil diajukan. Menunggu tinjauan admin.');
        navigate('/warga/usaha');
      } else {
        toast.error(res.data.message || 'Gagal menyimpan');
      }
    } catch (err) {
      let msg = 'Gagal menyimpan usaha';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Memuat data usaha..." />;
  if (error) return <ErrorState message={error} onRetry={fetchDetail} />;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/warga/usaha" className="inline-flex items-center text-sm text-forest-700 hover:text-forest-900 mb-2">
          &larr; Kembali ke Daftar Usaha
        </Link>
        <h1 className="text-2xl font-bold text-forest-900">{isEdit ? 'Edit Usaha' : 'Tambah Usaha'}</h1>
        <p className="text-sm text-forest-600 mt-1">
          {isEdit ? 'Perbarui informasi usaha Anda.' : 'Daftarkan jasa/usaha Anda agar tampil di direktori publik setelah disetujui admin.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="label" htmlFor="name">Nama Usaha <span className="text-red-600">*</span></label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={cn('input', errors.name && 'input-error')}
            placeholder="Contoh: Warung Bu Tini"
          />
          {errors.name && <p className="error-text">{errors.name}</p>}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="categoryId">Kategori <span className="text-red-600">*</span></label>
            <select
              id="categoryId"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value === '' ? '' : Number(e.target.value) })}
              className={cn('input', errors.categoryId && 'input-error')}
            >
              <option value="">Pilih kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.categoryId && <p className="error-text">{errors.categoryId}</p>}
          </div>

          <div>
            <label className="label" htmlFor="whatsapp">WhatsApp</label>
            <input
              id="whatsapp"
              type="text"
              inputMode="numeric"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              className={cn('input', errors.whatsapp && 'input-error')}
              placeholder="08xxxxxxxxxx"
            />
            {errors.whatsapp && <p className="error-text">{errors.whatsapp}</p>}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.whatsappPublished}
              onChange={(e) => setForm({ ...form, whatsappPublished: e.target.checked })}
              className="w-4 h-4 rounded border-cream-300 text-forest-700 focus:ring-forest-500"
            />
            <span className="text-sm text-forest-800">Tampilkan WhatsApp di direktori publik</span>
          </label>
        </div>

        <div>
          <label className="label" htmlFor="description">Deskripsi</label>
          <textarea
            id="description"
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input"
            placeholder="Jelaskan usaha/jasa Anda..."
          />
        </div>

        <div>
          <label className="label" htmlFor="address">Alamat</label>
          <input
            id="address"
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="input"
            placeholder="Alamat lengkap usaha"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="rt">RT</label>
            <input
              id="rt"
              type="text"
              value={form.rt}
              onChange={(e) => setForm({ ...form, rt: e.target.value })}
              className="input"
              placeholder="001"
            />
          </div>
          <div>
            <label className="label" htmlFor="rw">RW</label>
            <input
              id="rw"
              type="text"
              value={form.rw}
              onChange={(e) => setForm({ ...form, rw: e.target.value })}
              className="input"
              placeholder="002"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="photoUrl">URL Foto</label>
          <input
            id="photoUrl"
            type="url"
            value={form.photoUrl}
            onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
            className="input"
            placeholder="https://..."
          />
          <p className="help-text">Masukkan URL gambar usaha Anda.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="latitude">Latitude (opsional)</label>
            <input
              id="latitude"
              type="text"
              inputMode="decimal"
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              className={cn('input', errors.latitude && 'input-error')}
              placeholder="-6.200000"
            />
            {errors.latitude && <p className="error-text">{errors.latitude}</p>}
          </div>
          <div>
            <label className="label" htmlFor="longitude">Longitude (opsional)</label>
            <input
              id="longitude"
              type="text"
              inputMode="decimal"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              className={cn('input', errors.longitude && 'input-error')}
              placeholder="106.800000"
            />
            {errors.longitude && <p className="error-text">{errors.longitude}</p>}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Link to="/warga/usaha" className="btn-secondary flex-1 text-center">Batal</Link>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Menyimpan...' : isEdit ? 'Perbarui' : 'Ajukan Usaha'}
          </button>
        </div>
      </form>
    </div>
  );
}

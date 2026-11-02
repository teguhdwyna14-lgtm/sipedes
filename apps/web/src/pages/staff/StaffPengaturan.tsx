// Pengaturan identitas desa - admin only

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { api } from '../../lib/api';
import type { VillageSettings } from '@sipedes/shared';
import { useToastStore } from '../../store/toastStore';
import { LoadingState, ErrorState } from '../../components/ui';

interface SettingsForm {
  village_name: string;
  district: string;
  regency: string;
  province: string;
  address: string;
  postal_code: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
  history: string;
  vision: string;
  mission: string;
  geography: string;
  potential: string;
  working_hours: string;
  map_embed: string;
}

const EMPTY: SettingsForm = {
  village_name: '', district: '', regency: '', province: '', address: '',
  postal_code: '', phone: '', email: '', website: '', logo_url: '',
  history: '', vision: '', mission: '', geography: '', potential: '',
  working_hours: '', map_embed: '',
};

export function StaffPengaturan() {
  const toast = useToastStore();
  const [form, setForm] = useState<SettingsForm>(EMPTY);
  const [original, setOriginal] = useState<SettingsForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/village');
      if (res.data.success) {
        const data = res.data.data as VillageSettings;
        const mapped: SettingsForm = {
          village_name: data.village_name ?? '',
          district: data.district ?? '',
          regency: data.regency ?? '',
          province: data.province ?? '',
          address: data.address ?? '',
          postal_code: data.postal_code ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          website: data.website ?? '',
          logo_url: data.logo_url ?? '',
          history: data.history ?? '',
          vision: data.vision ?? '',
          mission: data.mission ?? '',
          geography: data.geography ?? '',
          potential: data.potential ?? '',
          working_hours: data.working_hours ?? '',
          map_embed: data.map_embed ?? '',
        };
        setForm(mapped);
        setOriginal(mapped);
      } else {
        setError(res.data.message || 'Gagal memuat pengaturan');
      }
    } catch (err) {
      let msg = 'Gagal memuat pengaturan';
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.village_name.trim()) {
      toast.error('Nama desa wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put('/village', form);
      if (res.data.success) {
        toast.success('Pengaturan desa berhasil disimpan');
        setOriginal(form);
      } else {
        toast.error(res.data.message || 'Gagal menyimpan');
      }
    } catch (err) {
      let msg = 'Gagal menyimpan pengaturan';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(form) !== JSON.stringify(original);

  if (loading) return <LoadingState message="Memuat pengaturan..." />;
  if (error) return <ErrorState message={error} onRetry={fetch} />;

  const field = (key: keyof SettingsForm, label: string, type = 'text', placeholder = '', help = '') => (
    <div>
      <label className="label" htmlFor={key}>{label}</label>
      <input
        id={key}
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="input"
        placeholder={placeholder}
      />
      {help && <p className="help-text">{help}</p>}
    </div>
  );

  const textarea = (key: keyof SettingsForm, label: string, rows = 4, placeholder = '', help = '') => (
    <div>
      <label className="label" htmlFor={key}>{label}</label>
      <textarea
        id={key}
        rows={rows}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="input"
        placeholder={placeholder}
      />
      {help && <p className="help-text">{help}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-forest-900">Pengaturan Desa</h1>
        <p className="text-sm text-forest-600 mt-1">Kelola identitas dan informasi desa.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Identitas */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-forest-900 mb-4">Identitas Desa</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {field('village_name', 'Nama Desa *', 'text', 'Sukamaju')}
            {field('district', 'Kecamatan', 'text', 'Kecamatan')}
            {field('regency', 'Kabupaten/Kota', 'text', 'Kabupaten')}
            {field('province', 'Provinsi', 'text', 'Provinsi')}
            {field('postal_code', 'Kode Pos', 'text', '12345')}
            {field('logo_url', 'URL Logo', 'url', 'https://...')}
            <div className="sm:col-span-2">
              {field('address', 'Alamat Kantor', 'text', 'Jl. ...')}
            </div>
          </div>
        </div>

        {/* Kontak */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-forest-900 mb-4">Kontak</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {field('phone', 'Telepon', 'tel', '021-1234567')}
            {field('email', 'Email', 'email', 'desa@contoh.com')}
            {field('website', 'Website', 'url', 'https://desa.id')}
            {field('working_hours', 'Jam Kerja', 'text', 'Senin-Jumat 08:00-15:00')}
          </div>
        </div>

        {/* Profil */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-bold text-forest-900">Profil Desa</h2>
          {textarea('history', 'Sejarah Desa', 6, 'Sejarah singkat desa...')}
          {textarea('vision', 'Visi', 3, 'Visi desa...')}
          {textarea('mission', 'Misi', 5, 'Misi desa (pisahkan dengan baris baru)...')}
          {textarea('geography', 'Kondisi Geografis', 5, 'Letak, batas wilayah, luas...')}
          {textarea('potential', 'Potensi Desa', 5, 'Potensi SDA, SDM, ekonomi...')}
        </div>

        {/* Peta */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-forest-900 mb-4">Peta Lokasi</h2>
          {textarea('map_embed', 'Embed Google Maps (iframe)', 4, '<iframe src="..." ...></iframe>', 'Tempel kode iframe dari Google Maps.')}
        </div>

        {/* Action */}
        <div className="flex items-center justify-end gap-3 sticky bottom-4">
          {hasChanges && (
            <span className="text-sm text-gold-700 bg-gold-50 border border-gold-200 px-3 py-1.5 rounded-lg">
              Ada perubahan belum disimpan
            </span>
          )}
          <button
            type="button"
            onClick={() => setForm(original)}
            disabled={!hasChanges || saving}
            className="btn-secondary"
          >
            Reset
          </button>
          <button type="submit" disabled={saving || !hasChanges} className="btn-primary">
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </form>
    </div>
  );
}

// CRUD jenis layanan surat untuk staff/admin

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { api } from '../../lib/api';
import type { ServiceType } from '@sipedes/shared';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { LoadingState, EmptyState, ErrorState, Modal, ConfirmDialog } from '../../components/ui';

interface TypeForm {
  code: string;
  name: string;
  description: string;
  requirements: string;
  processingDays: string;
  active: boolean;
}

const EMPTY_FORM: TypeForm = {
  code: '', name: '', description: '', requirements: '', processingDays: '3', active: true,
};

export function StaffLayanan() {
  const { isAdmin } = useAuthStore();
  const toast = useToastStore();
  const [items, setItems] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<ServiceType | null>(null);
  const [form, setForm] = useState<TypeForm>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<ServiceType | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/services/types/admin');
      if (res.data.success) {
        // Bisa berupa { items: ServiceType[] } (paginated) atau ServiceType[] (array langsung)
        const data = res.data.data;
        if (Array.isArray(data)) {
          setItems(data as ServiceType[]);
        } else if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
          setItems((data as { items: ServiceType[] }).items);
        } else {
          setItems([]);
        }
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

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (s: ServiceType) => {
    setEditing(s);
    setForm({
      code: s.code,
      name: s.name,
      description: s.description ?? '',
      requirements: s.requirements,
      processingDays: s.processingDays != null ? String(s.processingDays) : '',
      active: s.active,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast.error('Kode layanan wajib diisi');
      return;
    }
    if (!form.name.trim()) {
      toast.error('Nama layanan wajib diisi');
      return;
    }
    if (!form.requirements.trim()) {
      toast.error('Persyaratan wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        requirements: form.requirements,
        processingDays: form.processingDays ? Number(form.processingDays) : null,
        active: form.active,
      };
      let res;
      if (editing) {
        res = await api.put(`/services/types/${editing.id}`, payload);
      } else {
        res = await api.post('/services/types', payload);
      }
      if (res.data.success) {
        toast.success(editing ? 'Layanan diperbarui' : 'Layanan dibuat');
        setShowForm(false);
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal menyimpan');
      }
    } catch (err) {
      let msg = 'Gagal menyimpan layanan';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await api.delete(`/services/types/${deleting.id}`);
      if (res.data.success) {
        toast.success('Layanan dihapus');
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal menghapus');
      }
    } catch (err) {
      let msg = 'Gagal menghapus layanan';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest-900">Jenis Layanan Surat</h1>
          <p className="text-sm text-forest-600 mt-1">Kelola daftar jenis layanan surat yang tersedia.</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Layanan
        </button>
      </div>

      {loading ? (
        <LoadingState message="Memuat layanan..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetch} />
      ) : items.length === 0 ? (
        <div className="card p-8">
          <EmptyState title="Belum ada layanan" message="Klik 'Tambah Layanan' untuk membuat baru." />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-app">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama</th>
                <th>Estimasi</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td><span className="badge-blue">{s.code}</span></td>
                  <td className="font-semibold text-forest-900">{s.name}</td>
                  <td className="text-forest-600">{s.processingDays != null ? `${s.processingDays} hari` : '-'}</td>
                  <td>
                    {s.active ? <span className="badge-green">Aktif</span> : <span className="badge-gray">Nonaktif</span>}
                  </td>
                  <td className="text-right">
                    <button onClick={() => openEdit(s)} className="btn-ghost text-sm">Edit</button>
                    {isAdmin && (
                      <button
                        onClick={() => setDeleting(s)}
                        className="btn-ghost text-sm text-red-700 hover:bg-red-50"
                      >
                        Hapus
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Layanan' : 'Tambah Layanan'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="label" htmlFor="code">Kode <span className="text-red-600">*</span></label>
              <input
                id="code"
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="input"
                placeholder="SKTM"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">Nama Layanan <span className="text-red-600">*</span></label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="Surat Keterangan Tidak Mampu"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="description">Deskripsi</label>
            <textarea
              id="description"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input"
              placeholder="Deskripsi singkat layanan"
            />
          </div>

          <div>
            <label className="label" htmlFor="requirements">Persyaratan <span className="text-red-600">*</span></label>
            <textarea
              id="requirements"
              rows={5}
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
              className="input"
              placeholder="1. Fotokopi KTP&#10;2. Fotokopi KK&#10;3. ..."
            />
            <p className="help-text">Pisahkan tiap persyaratan dengan baris baru.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="processingDays">Estimasi Proses (hari)</label>
              <input
                id="processingDays"
                type="number"
                min={0}
                value={form.processingDays}
                onChange={(e) => setForm({ ...form, processingDays: e.target.value })}
                className="input"
                placeholder="3"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="w-4 h-4 rounded border-cream-300 text-forest-700 focus:ring-forest-500"
                />
                <span className="text-sm font-semibold text-forest-800">Layanan aktif</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Batal</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Hapus Layanan"
        message={`Anda yakin ingin menghapus layanan "${deleting?.name}"?`}
        confirmLabel="Hapus"
        danger
      />
    </div>
  );
}

// Kelola Lokasi Peta & File Peta (staff)

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { api } from '../../lib/api';
import type { MapLocation, MapLocationType, MapFile } from '@sipedes/shared';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { LoadingState, EmptyState, ErrorState, Modal, ConfirmDialog } from '../../components/ui';
import { formatFileSize, formatDate, getStatusBadgeClass } from '../../lib/utils';

const typeLabel: Record<MapLocationType, string> = {
  kantor_desa: 'Kantor Desa',
  fasilitas_umum: 'Fasilitas Umum',
  usaha_warga: 'Usaha Warga',
  batas_desa: 'Batas Desa',
  lainnya: 'Lainnya',
};

interface LocationForm {
  name: string;
  type: MapLocationType;
  description: string;
  latitude: string;
  longitude: string;
  address: string;
  icon: string;
  active: boolean;
}

const EMPTY_LOC_FORM: LocationForm = {
  name: '',
  type: 'lainnya',
  description: '',
  latitude: '',
  longitude: '',
  address: '',
  icon: '',
  active: true,
};

interface FileForm {
  title: string;
  description: string;
  attribution: string;
  file: File | null;
}

const EMPTY_FILE_FORM: FileForm = { title: '', description: '', attribution: '', file: null };

export function StaffMapLocations() {
  const { isAdmin } = useAuthStore();
  const toast = useToastStore();

  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [files, setFiles] = useState<MapFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Location form modal
  const [editingLoc, setEditingLoc] = useState<MapLocation | null>(null);
  const [locForm, setLocForm] = useState<LocationForm>(EMPTY_LOC_FORM);
  const [showLocForm, setShowLocForm] = useState(false);
  const [savingLoc, setSavingLoc] = useState(false);
  const [deletingLoc, setDeletingLoc] = useState<MapLocation | null>(null);

  // File form modal
  const [fileForm, setFileForm] = useState<FileForm>(EMPTY_FILE_FORM);
  const [showFileForm, setShowFileForm] = useState(false);
  const [savingFile, setSavingFile] = useState(false);
  const [deletingFile, setDeletingFile] = useState<MapFile | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [locRes, fileRes] = await Promise.all([
        api.get('/map/locations'),
        api.get('/map/files'),
      ]);
      if (locRes.data.success) {
        const list = locRes.data.data?.items ?? locRes.data.data ?? [];
        setLocations(Array.isArray(list) ? (list as MapLocation[]) : []);
      }
      if (fileRes.data.success) {
        const list = fileRes.data.data?.items ?? fileRes.data.data ?? [];
        setFiles(Array.isArray(list) ? (list as MapFile[]) : []);
      }
    } catch (err) {
      let msg = 'Gagal memuat data peta';
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

  // Location handlers
  const openCreateLoc = () => {
    setEditingLoc(null);
    setLocForm(EMPTY_LOC_FORM);
    setShowLocForm(true);
  };

  const openEditLoc = (l: MapLocation) => {
    setEditingLoc(l);
    setLocForm({
      name: l.name,
      type: l.type,
      description: l.description ?? '',
      latitude: String(l.latitude),
      longitude: String(l.longitude),
      address: l.address ?? '',
      icon: l.icon ?? '',
      active: l.active,
    });
    setShowLocForm(true);
  };

  const handleSaveLoc = async () => {
    if (!locForm.name.trim()) {
      toast.error('Nama lokasi wajib diisi');
      return;
    }
    const lat = Number(locForm.latitude);
    const lng = Number(locForm.longitude);
    if (locForm.latitude && (isNaN(lat) || lat < -90 || lat > 90)) {
      toast.error('Latitude tidak valid');
      return;
    }
    if (locForm.longitude && (isNaN(lng) || lng < -180 || lng > 180)) {
      toast.error('Longitude tidak valid');
      return;
    }
    if (!locForm.latitude || !locForm.longitude) {
      toast.error('Latitude & Longitude wajib diisi');
      return;
    }
    setSavingLoc(true);
    try {
      const payload = {
        name: locForm.name.trim(),
        type: locForm.type,
        description: locForm.description.trim() || undefined,
        latitude: lat,
        longitude: lng,
        address: locForm.address.trim() || undefined,
        icon: locForm.icon.trim() || undefined,
        active: locForm.active,
      };
      let res;
      if (editingLoc) {
        res = await api.put(`/map/locations/${editingLoc.id}`, payload);
      } else {
        res = await api.post('/map/locations', payload);
      }
      if (res.data.success) {
        toast.success(editingLoc ? 'Lokasi diperbarui' : 'Lokasi dibuat');
        setShowLocForm(false);
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal menyimpan lokasi');
      }
    } catch (err) {
      let msg = 'Gagal menyimpan lokasi';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      setSavingLoc(false);
    }
  };

  const handleDeleteLoc = async () => {
    if (!deletingLoc) return;
    try {
      const res = await api.delete(`/map/locations/${deletingLoc.id}`);
      if (res.data.success) {
        toast.success('Lokasi dihapus');
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal menghapus lokasi');
      }
    } catch (err) {
      let msg = 'Gagal menghapus lokasi';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    }
  };

  // File handlers
  const handleSaveFile = async () => {
    if (!fileForm.title.trim()) {
      toast.error('Judul file wajib diisi');
      return;
    }
    if (!fileForm.file) {
      toast.error('File wajib diunggah');
      return;
    }
    setSavingFile(true);
    try {
      const formData = new FormData();
      formData.append('title', fileForm.title.trim());
      formData.append('description', fileForm.description.trim());
      formData.append('attribution', fileForm.attribution.trim());
      formData.append('file', fileForm.file);
      const res = await api.post('/map/files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        toast.success('File peta diunggah');
        setShowFileForm(false);
        setFileForm(EMPTY_FILE_FORM);
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal mengunggah file');
      }
    } catch (err) {
      let msg = 'Gagal mengunggah file';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      setSavingFile(false);
    }
  };

  const handleDownload = async (file: MapFile) => {
    try {
      const res = await api.get(`/map/files/${file.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      let msg = 'Gagal mengunduh file';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    }
  };

  const handleDeleteFile = async () => {
    if (!deletingFile) return;
    try {
      const res = await api.delete(`/map/files/${deletingFile.id}`);
      if (res.data.success) {
        toast.success('File peta dihapus');
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal menghapus file');
      }
    } catch (err) {
      let msg = 'Gagal menghapus file';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    }
  };

  if (loading) return <LoadingState message="Memuat data peta..." />;
  if (error) return <ErrorState message={error} onRetry={fetch} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-forest-900">Lokasi & File Peta</h1>
        <p className="text-sm text-forest-600 mt-1">Kelola lokasi yang tampil di Peta Desa dan file peta untuk diunduh warga.</p>
      </div>

      {/* Locations section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-forest-900">Lokasi Peta</h2>
          <button onClick={openCreateLoc} className="btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Lokasi
          </button>
        </div>

        {locations.length === 0 ? (
          <div className="card p-8">
            <EmptyState title="Belum ada lokasi" message="Tambahkan lokasi yang akan tampil di Peta Desa." />
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="table-app">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Tipe</th>
                  <th>Koordinat</th>
                  <th>Alamat</th>
                  <th>Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((l) => (
                  <tr key={l.id}>
                    <td className="font-semibold text-forest-900">{l.name}</td>
                    <td><span className={getStatusBadgeClass('active')}>{typeLabel[l.type]}</span></td>
                    <td className="text-xs font-mono text-forest-600">{l.latitude.toFixed(5)}, {l.longitude.toFixed(5)}</td>
                    <td className="max-w-xs truncate text-forest-600">{l.address ?? '-'}</td>
                    <td>
                      <span className={l.active ? 'badge-green' : 'badge-gray'}>
                        {l.active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="text-right">
                      <button onClick={() => openEditLoc(l)} className="btn-ghost text-sm">Edit</button>
                      {isAdmin && (
                        <button
                          onClick={() => setDeletingLoc(l)}
                          className="btn-ghost text-sm text-red-700 hover:bg-red-50"
                        >Hapus</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Files section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-forest-900">File Peta (Download)</h2>
          <button onClick={() => setShowFileForm(true)} className="btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload File
          </button>
        </div>

        {files.length === 0 ? (
          <div className="card p-8">
            <EmptyState title="Belum ada file peta" message="Unggah file peta (PDF, gambar, dll) untuk diunduh warga." />
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="table-app">
              <thead>
                <tr>
                  <th>Judul</th>
                  <th>Nama File</th>
                  <th>Ukuran</th>
                  <th>Attribution</th>
                  <th>Diunggah</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id}>
                    <td className="font-semibold text-forest-900">{f.title}</td>
                    <td className="text-xs font-mono text-forest-600 truncate max-w-[200px]">{f.fileName}</td>
                    <td>{formatFileSize(f.fileSize)}</td>
                    <td className="text-forest-600">{f.attribution ?? '-'}</td>
                    <td className="text-forest-600">{formatDate(f.uploadedAt)}</td>
                    <td className="text-right">
                      <button onClick={() => handleDownload(f)} className="btn-ghost text-sm">Unduh</button>
                      {isAdmin && (
                        <button
                          onClick={() => setDeletingFile(f)}
                          className="btn-ghost text-sm text-red-700 hover:bg-red-50"
                        >Hapus</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Location form modal */}
      <Modal
        open={showLocForm}
        onClose={() => setShowLocForm(false)}
        title={editingLoc ? 'Edit Lokasi' : 'Tambah Lokasi'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="loc-name">Nama <span className="text-red-600">*</span></label>
            <input
              id="loc-name"
              type="text"
              value={locForm.name}
              onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
              className="input"
              placeholder="Kantor Desa Sukamaju"
            />
          </div>
          <div>
            <label className="label" htmlFor="loc-type">Tipe</label>
            <select
              id="loc-type"
              value={locForm.type}
              onChange={(e) => setLocForm({ ...locForm, type: e.target.value as MapLocationType })}
              className="input"
            >
              <option value="kantor_desa">Kantor Desa</option>
              <option value="fasilitas_umum">Fasilitas Umum</option>
              <option value="usaha_warga">Usaha Warga</option>
              <option value="batas_desa">Batas Desa</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="loc-desc">Deskripsi</label>
            <textarea
              id="loc-desc"
              rows={2}
              value={locForm.description}
              onChange={(e) => setLocForm({ ...locForm, description: e.target.value })}
              className="input"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="loc-lat">Latitude <span className="text-red-600">*</span></label>
              <input
                id="loc-lat"
                type="text"
                inputMode="decimal"
                value={locForm.latitude}
                onChange={(e) => setLocForm({ ...locForm, latitude: e.target.value })}
                className="input"
                placeholder="-6.200000"
              />
            </div>
            <div>
              <label className="label" htmlFor="loc-lng">Longitude <span className="text-red-600">*</span></label>
              <input
                id="loc-lng"
                type="text"
                inputMode="decimal"
                value={locForm.longitude}
                onChange={(e) => setLocForm({ ...locForm, longitude: e.target.value })}
                className="input"
                placeholder="106.800000"
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="loc-addr">Alamat</label>
            <input
              id="loc-addr"
              type="text"
              value={locForm.address}
              onChange={(e) => setLocForm({ ...locForm, address: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="loc-icon">Ikon (opsional)</label>
            <input
              id="loc-icon"
              type="text"
              value={locForm.icon}
              onChange={(e) => setLocForm({ ...locForm, icon: e.target.value })}
              className="input"
              placeholder="nama-ikon"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={locForm.active}
              onChange={(e) => setLocForm({ ...locForm, active: e.target.checked })}
              className="w-4 h-4 rounded border-cream-300 text-forest-700 focus:ring-forest-500"
            />
            <span className="text-sm text-forest-800">Aktif (tampil di peta publik)</span>
          </label>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowLocForm(false)} className="btn-secondary flex-1">Batal</button>
            <button onClick={handleSaveLoc} disabled={savingLoc} className="btn-primary flex-1">
              {savingLoc ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* File form modal */}
      <Modal
        open={showFileForm}
        onClose={() => setShowFileForm(false)}
        title="Upload File Peta"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="file-title">Judul <span className="text-red-600">*</span></label>
            <input
              id="file-title"
              type="text"
              value={fileForm.title}
              onChange={(e) => setFileForm({ ...fileForm, title: e.target.value })}
              className="input"
              placeholder="Peta Wilayah Desa Sukamaju 2024"
            />
          </div>
          <div>
            <label className="label" htmlFor="file-desc">Deskripsi</label>
            <textarea
              id="file-desc"
              rows={2}
              value={fileForm.description}
              onChange={(e) => setFileForm({ ...fileForm, description: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="file-attr">Attribution / Sumber</label>
            <input
              id="file-attr"
              type="text"
              value={fileForm.attribution}
              onChange={(e) => setFileForm({ ...fileForm, attribution: e.target.value })}
              className="input"
              placeholder="Pemerintah Desa Sukamaju"
            />
          </div>
          <div>
            <label className="label" htmlFor="file-input">File <span className="text-red-600">*</span></label>
            <input
              id="file-input"
              type="file"
              onChange={(e) => setFileForm({ ...fileForm, file: e.target.files?.[0] ?? null })}
              className="input"
            />
            <p className="help-text">Format yang didukung: PDF, gambar (PNG/JPG), GeoJSON.</p>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowFileForm(false)} className="btn-secondary flex-1">Batal</button>
            <button onClick={handleSaveFile} disabled={savingFile} className="btn-primary flex-1">
              {savingFile ? 'Mengunggah...' : 'Unggah'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deletingLoc}
        onClose={() => setDeletingLoc(null)}
        onConfirm={handleDeleteLoc}
        title="Hapus Lokasi"
        message={`Anda yakin ingin menghapus lokasi "${deletingLoc?.name}"?`}
        confirmLabel="Hapus"
        danger
      />

      <ConfirmDialog
        open={!!deletingFile}
        onClose={() => setDeletingFile(null)}
        onConfirm={handleDeleteFile}
        title="Hapus File Peta"
        message={`Anda yakin ingin menghapus file "${deletingFile?.title}"?`}
        confirmLabel="Hapus"
        danger
      />
    </div>
  );
}

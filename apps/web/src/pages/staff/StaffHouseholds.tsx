// CRUD Kartu Keluarga (admin/petugas)

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { api } from '../../lib/api';
import type { Household, HouseholdMember, HouseholdRole } from '@sipedes/shared';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { LoadingState, EmptyState, ErrorState, Pagination, Modal, ConfirmDialog } from '../../components/ui';
import { formatDate, getStatusBadgeClass, statusLabel } from '../../lib/utils';

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

interface HouseholdForm {
  kkNumber: string;
  address: string;
  rt: string;
  rw: string;
  dusun: string;
  notes: string;
}

const EMPTY_FORM: HouseholdForm = {
  kkNumber: '', address: '', rt: '', rw: '', dusun: '', notes: '',
};

interface AddMemberForm {
  residentId: string;
  role: HouseholdRole;
  isHead: boolean;
}

export function StaffHouseholds() {
  const { isAdmin } = useAuthStore();
  const toast = useToastStore();
  const [items, setItems] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Form modal
  const [editing, setEditing] = useState<Household | null>(null);
  const [form, setForm] = useState<HouseholdForm>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Detail modal
  const [detail, setDetail] = useState<Household & { members?: HouseholdMember[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Add member modal
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState<AddMemberForm>({
    residentId: '', role: 'anak', isHead: false,
  });
  const [savingMember, setSavingMember] = useState(false);

  // Delete confirmation
  const [deleting, setDeleting] = useState<Household | null>(null);

  // Remove member confirmation
  const [removingMember, setRemovingMember] = useState<{ householdId: number; member: HouseholdMember } | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/households', {
        params: { page, limit: PAGE_LIMIT, search: search || undefined },
      });
      if (res.data.success) {
        setItems(res.data.data?.items ?? []);
        setTotalPages(res.data.meta?.totalPages ?? 1);
      } else {
        setError(res.data.message || 'Gagal memuat KK');
      }
    } catch (err) {
      let msg = 'Gagal memuat KK';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (h: Household) => {
    setEditing(h);
    setForm({
      kkNumber: h.kkNumber ?? '',
      address: h.address,
      rt: h.rt ?? '',
      rw: h.rw ?? '',
      dusun: h.dusun ?? '',
      notes: '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.kkNumber.trim()) {
      toast.error('Nomor KK wajib diisi');
      return;
    }
    if (!form.address.trim()) {
      toast.error('Alamat wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        kkNumber: form.kkNumber.trim(),
        address: form.address.trim(),
        rt: form.rt.trim() || undefined,
        rw: form.rw.trim() || undefined,
        dusun: form.dusun.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      let res;
      if (editing) {
        res = await api.put(`/households/${editing.id}`, payload);
      } else {
        res = await api.post('/households', payload);
      }
      if (res.data.success) {
        toast.success(editing ? 'KK diperbarui' : 'KK dibuat');
        setShowForm(false);
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal menyimpan');
      }
    } catch (err) {
      let msg = 'Gagal menyimpan KK';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (h: Household) => {
    setDetail(h);
    setDetailLoading(true);
    try {
      const res = await api.get(`/households/${h.id}`);
      if (res.data.success && res.data.data) {
        setDetail(res.data.data as Household & { members?: HouseholdMember[] });
      }
    } catch (err) {
      let msg = 'Gagal memuat detail';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      toast.error(msg);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await api.delete(`/households/${deleting.id}`);
      if (res.data.success) {
        toast.success('KK dihapus');
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal menghapus');
      }
    } catch (err) {
      let msg = 'Gagal menghapus KK';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    }
  };

  const handleAddMember = async () => {
    if (!detail) return;
    if (!memberForm.residentId.trim()) {
      toast.error('ID Resident wajib diisi');
      return;
    }
    const residentId = Number(memberForm.residentId);
    if (isNaN(residentId) || residentId <= 0) {
      toast.error('ID Resident tidak valid');
      return;
    }
    setSavingMember(true);
    try {
      const res = await api.post(`/households/${detail.id}/members`, {
        residentId,
        role: memberForm.role,
        isHead: memberForm.isHead,
      });
      if (res.data.success) {
        toast.success('Anggota ditambahkan');
        setShowAddMember(false);
        setMemberForm({ residentId: '', role: 'anak', isHead: false });
        // refresh detail
        openDetail(detail);
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal menambah anggota');
      }
    } catch (err) {
      let msg = 'Gagal menambah anggota';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      setSavingMember(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removingMember) return;
    try {
      const res = await api.delete(`/households/${removingMember.householdId}/members/${removingMember.member.id}`);
      if (res.data.success) {
        toast.success('Anggota dihapus dari KK');
        if (detail && detail.id === removingMember.householdId) {
          openDetail(detail);
        }
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal menghapus anggota');
      }
    } catch (err) {
      let msg = 'Gagal menghapus anggota';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    }
  };

  const handleSetHead = async (householdId: number, memberId: number) => {
    try {
      const res = await api.patch(`/households/${householdId}/members/${memberId}/set-head`, {});
      if (res.data.success) {
        toast.success('Kepala keluarga diperbarui');
        if (detail && detail.id === householdId) {
          openDetail(detail);
        }
        fetch();
      } else {
        toast.error(res.data.message || 'Gagal mengubah kepala KK');
      }
    } catch (err) {
      let msg = 'Gagal mengubah kepala KK';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest-900">Kartu Keluarga</h1>
          <p className="text-sm text-forest-600 mt-1">Kelola data Kartu Keluarga warga.</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah KK
        </button>
      </div>

      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari alamat atau kepala keluarga..."
            className="input flex-1 min-w-[200px]"
          />
          <button type="submit" className="btn-primary">Cari</button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
              className="btn-secondary"
            >Reset</button>
          )}
        </form>
      </div>

      {loading ? (
        <LoadingState message="Memuat KK..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetch} />
      ) : items.length === 0 ? (
        <div className="card p-8">
          <EmptyState title="Belum ada KK" message="Klik 'Tambah KK' untuk membuat data KK baru." />
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="table-app">
              <thead>
                <tr>
                  <th>No. KK</th>
                  <th>Alamat</th>
                  <th>RT/RW</th>
                  <th>Dusun</th>
                  <th>Kepala KK</th>
                  <th>Anggota</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((h) => (
                  <tr key={h.id}>
                    <td className="font-mono text-xs">{h.kkNumber ?? '-'}</td>
                    <td className="max-w-xs truncate">{h.address}</td>
                    <td>{h.rt ?? '-'}/{h.rw ?? '-'}</td>
                    <td>{h.dusun ?? '-'}</td>
                    <td className="font-semibold text-forest-900">{h.headName ?? '-'}</td>
                    <td>{h.memberCount ?? '-'}</td>
                    <td className="text-right">
                      <button onClick={() => openDetail(h)} className="btn-ghost text-sm">Detail</button>
                      <button onClick={() => openEdit(h)} className="btn-ghost text-sm">Edit</button>
                      {isAdmin && (
                        <button
                          onClick={() => setDeleting(h)}
                          className="btn-ghost text-sm text-red-700 hover:bg-red-50"
                        >Hapus</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {/* Form modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit KK' : 'Tambah KK'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="kkNumber">Nomor KK <span className="text-red-600">*</span></label>
            <input
              id="kkNumber"
              type="text"
              value={form.kkNumber}
              onChange={(e) => setForm({ ...form, kkNumber: e.target.value })}
              className="input"
              placeholder="16 digit nomor KK"
            />
          </div>
          <div>
            <label className="label" htmlFor="address">Alamat <span className="text-red-600">*</span></label>
            <input
              id="address"
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="input"
              placeholder="Alamat lengkap"
            />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
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
            <div>
              <label className="label" htmlFor="dusun">Dusun</label>
              <input
                id="dusun"
                type="text"
                value={form.dusun}
                onChange={(e) => setForm({ ...form, dusun: e.target.value })}
                className="input"
                placeholder="Cibadak"
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="notes">Catatan</label>
            <textarea
              id="notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input"
              placeholder="Catatan internal (opsional)"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Batal</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Detail Kartu Keluarga"
        size="xl"
      >
        {detailLoading ? (
          <LoadingState message="Memuat detail..." />
        ) : detail ? (
          <div className="space-y-5">
            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-forest-600">No. KK</dt>
                <dd className="font-mono text-xs font-semibold">{detail.kkNumber ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-forest-600">Kepala Keluarga</dt>
                <dd className="font-semibold text-forest-900">{detail.headName ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-forest-600">Alamat</dt>
                <dd className="text-forest-900">{detail.address}</dd>
              </div>
              <div>
                <dt className="text-forest-600">RT/RW/Dusun</dt>
                <dd className="text-forest-900">{detail.rt ?? '-'}/{detail.rw ?? '-'}{detail.dusun ? ` - ${detail.dusun}` : ''}</dd>
              </div>
              {detail.createdAt && (
                <div>
                  <dt className="text-forest-600">Dibuat</dt>
                  <dd className="text-forest-900">{formatDate(detail.createdAt)}</dd>
                </div>
              )}
            </dl>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-forest-900">Anggota ({detail.members?.length ?? 0})</h3>
                <button
                  onClick={() => setShowAddMember(true)}
                  className="btn-secondary text-xs px-3 py-1.5"
                >+ Tambah Anggota</button>
              </div>
              {(!detail.members || detail.members.length === 0) ? (
                <EmptyState title="Belum ada anggota" />
              ) : (
                <table className="table-app">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Peran</th>
                      <th>Status</th>
                      <th className="text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.members.map((m) => (
                      <tr key={m.id}>
                        <td className="font-semibold text-forest-900">
                          {m.fullName}
                          {m.role === 'kepala' && <span className="badge-gold ml-2">Kepala</span>}
                        </td>
                        <td>{roleLabel[m.role]}</td>
                        <td><span className={getStatusBadgeClass(m.status)}>{statusLabel(m.status)}</span></td>
                        <td className="text-right">
                          {m.role !== 'kepala' && (
                            <button
                              onClick={() => handleSetHead(detail.id, m.id)}
                              className="btn-ghost text-xs"
                            >Set Kepala</button>
                          )}
                          <button
                            onClick={() => setRemovingMember({ householdId: detail.id, member: m })}
                            className="btn-ghost text-xs text-red-700 hover:bg-red-50"
                          >Hapus</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Add member modal */}
      <Modal
        open={showAddMember}
        onClose={() => setShowAddMember(false)}
        title="Tambah Anggota KK"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="residentId">ID Resident <span className="text-red-600">*</span></label>
            <input
              id="residentId"
              type="number"
              value={memberForm.residentId}
              onChange={(e) => setMemberForm({ ...memberForm, residentId: e.target.value })}
              className="input"
              placeholder="Masukkan ID resident"
            />
            <p className="help-text">Cari ID resident dari menu Data Warga.</p>
          </div>
          <div>
            <label className="label" htmlFor="memberRole">Peran dalam KK</label>
            <select
              id="memberRole"
              value={memberForm.role}
              onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value as HouseholdRole })}
              className="input"
            >
              <option value="kepala">Kepala Keluarga</option>
              <option value="istri">Istri</option>
              <option value="anak">Anak</option>
              <option value="cucu">Cucu</option>
              <option value="orang_tua">Orang Tua</option>
              <option value="famili_lain">Famili Lain</option>
              <option value="pembantu">Pembantu</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={memberForm.isHead}
              onChange={(e) => setMemberForm({ ...memberForm, isHead: e.target.checked })}
              className="w-4 h-4 rounded border-cream-300 text-forest-700 focus:ring-forest-500"
            />
            <span className="text-sm text-forest-800">Jadikan sebagai Kepala Keluarga</span>
          </label>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowAddMember(false)} className="btn-secondary flex-1">Batal</button>
            <button onClick={handleAddMember} disabled={savingMember} className="btn-primary flex-1">
              {savingMember ? 'Menyimpan...' : 'Tambah'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Hapus KK"
        message={`Anda yakin ingin menghapus KK "${deleting?.kkNumber}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        danger
      />

      <ConfirmDialog
        open={!!removingMember}
        onClose={() => setRemovingMember(null)}
        onConfirm={handleRemoveMember}
        title="Hapus Anggota"
        message={`Hapus "${removingMember?.member.fullName}" dari KK ini?`}
        confirmLabel="Hapus"
        danger
      />
    </div>
  );
}

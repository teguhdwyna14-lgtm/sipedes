// Helper utilities

import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatDate(date: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', opts ?? {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'baru saja';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} hari lalu`;
  return formatDate(d);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function maskNik(nik: string | null | undefined): string {
  if (!nik) return '-';
  if (nik.length <= 4) return '****';
  return nik.slice(0, 4) + '****' + nik.slice(-4);
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '-';
  if (phone.length <= 4) return '****';
  return phone.slice(0, 4) + '****' + phone.slice(-3);
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trim() + '...';
}

export function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    // user/resident status
    active: 'badge-green',
    pending: 'badge-gold',
    rejected: 'badge-red',
    disabled: 'badge-gray',
    // news/announcement status
    draft: 'badge-gray',
    published: 'badge-green',
    archived: 'badge-wood',
    // service request status
    diajukan: 'badge-blue',
    dalam_pemeriksaan: 'badge-gold',
    perlu_perbaikan: 'badge-wood',
    disetujui: 'badge-green',
    ditolak: 'badge-red',
    selesai: 'badge-green',
    // complaint status
    baru: 'badge-blue',
    diterima: 'badge-gold',
    diproses: 'badge-gold',
    ditutup: 'badge-gray',
  };
  return map[status] ?? 'badge-gray';
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: 'Aktif',
    pending: 'Menunggu',
    rejected: 'Ditolak',
    disabled: 'Nonaktif',
    draft: 'Draf',
    published: 'Dipublikasi',
    archived: 'Diarsipkan',
    diajukan: 'Diajukan',
    dalam_pemeriksaan: 'Dalam Pemeriksaan',
    perlu_perbaikan: 'Perlu Perbaikan',
    disetujui: 'Disetujui',
    ditolak: 'Ditolak',
    selesai: 'Selesai',
    baru: 'Baru',
    diterima: 'Diterima',
    diproses: 'Diproses',
  };
  return map[status] ?? status;
}

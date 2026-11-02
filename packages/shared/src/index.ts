// =====================================================
// SIPEDES - Shared Types
// Tipe bersama yang digunakan frontend & backend
// =====================================================

// ---------- Peran & Status ----------
export type UserRole = 'warga' | 'petugas' | 'admin';

export type UserStatus = 'pending' | 'active' | 'rejected' | 'disabled';

export type AuthRole = 'visitor' | 'warga' | 'petugas' | 'admin';

// ---------- User ----------
export interface User {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  phone?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser extends User {
  // Payload yang aman dikembalikan ke frontend setelah login
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  nik?: string;
  kkNumber?: string;
  birthDate?: string;
  address?: string;
  rt?: string;
  rw?: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  expiresIn: string;
  /** True bila user masih memakai password awal (tanggal lahir) & wajib ganti */
  mustChangePassword?: boolean;
}

// ---------- Resident Profile ----------
export interface ResidentProfile {
  id: number;
  userId: number;
  nik?: string | null;
  kkNumber?: string | null;
  fullName: string;
  birthDate?: string | null;
  gender?: 'L' | 'P' | null;
  address?: string | null;
  rt?: string | null;
  rw?: string | null;
  phone?: string | null;
  occupation?: string | null;
  status: UserStatus;
  verifiedById?: number | null;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------- Village Settings ----------
// Catatan: properti snake_case karena langsung dari DB row
export interface VillageSettings {
  id: number;
  village_name: string;
  district: string | null;
  regency: string | null;
  province: string | null;
  address: string | null;
  postal_code?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logo_url?: string | null;
  history?: string | null;
  vision?: string | null;
  mission?: string | null;
  geography?: string | null;
  potential?: string | null;
  working_hours?: string | null;
  map_embed?: string | null;
  updated_at: string;
}

// ---------- News ----------
export type NewsStatus = 'draft' | 'published' | 'archived';

export interface News {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  category?: string | null;
  imageUrl?: string | null;
  status: NewsStatus;
  authorId: number;
  authorName?: string;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewsListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: NewsStatus;
}

// ---------- Announcement ----------
export type AnnouncementStatus = 'draft' | 'published' | 'archived';

export interface Announcement {
  id: number;
  title: string;
  content: string;
  status: AnnouncementStatus;
  pinned: boolean;
  authorId: number;
  publishedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------- Service Types & Requests ----------
export type ServiceRequestStatus =
  | 'diajukan'
  | 'dalam_pemeriksaan'
  | 'perlu_perbaikan'
  | 'disetujui'
  | 'ditolak'
  | 'selesai';

export interface ServiceType {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  requirements: string;
  processingDays?: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRequest {
  id: number;
  requestNumber: string;
  serviceTypeId: number;
  serviceName?: string;
  userId: number;
  userFullName?: string;
  purpose: string;
  notes?: string | null;
  status: ServiceRequestStatus;
  rejectionReason?: string | null;
  processedById?: number | null;
  processedAt?: string | null;
  completedAt?: string | null;
  attachments?: ServiceRequestAttachment[];
  events?: ServiceRequestEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRequestAttachment {
  id: number;
  requestId: number;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface ServiceRequestEvent {
  id: number;
  requestId: number;
  fromStatus: ServiceRequestStatus | null;
  toStatus: ServiceRequestStatus;
  note?: string | null;
  createdById: number;
  createdByName?: string;
  createdAt: string;
}

// ---------- Complaint ----------
export type ComplaintStatus =
  | 'baru'
  | 'diterima'
  | 'diproses'
  | 'selesai'
  | 'ditutup';

export interface Complaint {
  id: number;
  trackingCode: string;
  userId: number;
  userFullName?: string;
  title: string;
  description: string;
  category?: string | null;
  status: ComplaintStatus;
  isAnonymous: boolean;
  updates?: ComplaintUpdate[];
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintUpdate {
  id: number;
  complaintId: number;
  status: ComplaintStatus;
  note?: string | null;
  createdById: number;
  createdByName?: string;
  createdAt: string;
}

// ---------- Document (Arsip) ----------
export interface DocumentRecord {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  ownerId?: number | null;
  requestId?: number | null;
  isPublic: boolean;
  uploadedById: number;
  createdAt: string;
  updatedAt: string;
}

// ---------- Activity Log ----------
export interface ActivityLog {
  id: number;
  userId?: number | null;
  action: string;
  entity?: string | null;
  entityId?: number | null;
  description: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

// ---------- API Response Wrapper ----------
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ---------- Dashboard Stats ----------
export interface DashboardStats {
  totalResidents: number;
  pendingVerifications: number;
  totalServiceRequests: number;
  pendingServiceRequests: number;
  completedServiceRequests: number;
  totalComplaints: number;
  openComplaints: number;
  totalNews: number;
  totalAnnouncements: number;
  recentServiceRequests?: ServiceRequest[];
  recentComplaints?: Complaint[];
  myServiceRequests?: number;
  myComplaints?: number;
}

// ---------- Notifikasi ----------
export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  link?: string | null;
  createdAt: string;
}

// =====================================================
// MODUL BARU - Revisi SIPEDES
// =====================================================

// ---------- Login NIK ----------
export interface NikLoginPayload {
  nik: string;
  password: string;
}

// ---------- Household (Kartu Keluarga) ----------
export interface Household {
  id: number;
  kkNumber?: string | null; // hanya untuk staff/admin
  kkNumberMasked?: string; // untuk warga: xxxx-xxxx
  address: string;
  rt?: string | null;
  rw?: string | null;
  dusun?: string | null;
  headResidentId?: number | null;
  headName?: string | null;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type HouseholdRole = 'kepala' | 'istri' | 'anak' | 'cucu' | 'orang_tua' | 'famili_lain' | 'pembantu' | 'lainnya';

export interface HouseholdMember {
  id: number;
  householdId: number;
  residentId: number;
  role: HouseholdRole;
  // Data turunan untuk display (tanpa data sensitif untuk warga)
  fullName: string;
  gender?: 'L' | 'P' | null;
  birthDate?: string | null;
  phone?: string | null;
  phonePublished: boolean;
  status: UserStatus;
  nikMasked?: string;
}

// ---------- Business Categories ----------
export interface BusinessCategory {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------- Resident Business (Jasa & Usaha Warga) ----------
export type BusinessStatus = 'pending' | 'approved' | 'rejected' | 'disabled';

export interface ResidentBusiness {
  id: number;
  ownerId: number; // resident_id
  ownerName?: string;
  ownerUserId?: number | null;
  categoryId: number;
  categoryName?: string;
  name: string;
  description?: string | null;
  whatsapp?: string | null;
  whatsappPublished: boolean;
  address?: string | null;
  rt?: string | null;
  rw?: string | null;
  photoUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: BusinessStatus;
  rejectionNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessListParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  status?: BusinessStatus;
  ownerId?: number;
}

// ---------- Map (Peta Desa) ----------
export type MapLocationType = 'kantor_desa' | 'fasilitas_umum' | 'usaha_warga' | 'batas_desa' | 'lainnya';

export interface MapLocation {
  id: number;
  name: string;
  type: MapLocationType;
  description?: string | null;
  latitude: number;
  longitude: number;
  address?: string | null;
  icon?: string | null;
  linkedBusinessId?: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MapFile {
  id: number;
  title: string;
  description?: string | null;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  attribution?: string | null;
  uploadedAt: string;
}

// ---------- Resident Search ----------
export interface ResidentSearchResult {
  id: number;
  fullName: string;
  gender?: 'L' | 'P' | null;
  rt?: string | null;
  rw?: string | null;
  dusun?: string | null;
  householdId?: number | null;
  headName?: string | null;
  householdRole?: HouseholdRole | null;
  phonePublished: boolean;
  phone?: string | null;
  status: UserStatus;
}

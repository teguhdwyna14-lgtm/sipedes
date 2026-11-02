// Dashboard controller - statistik ringkasan berbasis peran

import type { Request, Response } from 'express';
import { newsRepository } from '../repositories/newsRepository';
import { announcementRepository } from '../repositories/announcementRepository';
import { serviceRequestRepository } from '../repositories/serviceRepository';
import { complaintRepository } from '../repositories/complaintRepository';
import { userRepository } from '../repositories/userRepository';
import { residentRepository } from '../repositories/residentRepository';
import { ok } from '../utils/response';
import { asyncHandler } from '../middleware/error';

// Helper: cek apakah user adalah staff
function isStaff(role: string | undefined): boolean {
  return role === 'petugas' || role === 'admin';
}

// Helper: jumlahkan array of number
function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

// Daftar status untuk service requests & complaints
const SERVICE_REQUEST_STATUSES = ['diajukan', 'dalam_pemeriksaan', 'perlu_perbaikan', 'disetujui', 'ditolak', 'selesai'];
const COMPLAINT_STATUSES = ['baru', 'diterima', 'diproses', 'selesai', 'ditutup'];
const PENDING_SERVICE_STATUSES = ['diajukan', 'dalam_pemeriksaan', 'perlu_perbaikan', 'disetujui'];

export const dashboardController = {
  // Statistik dashboard berbasis peran
  stats: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return ok(res, null, 'OK');

    // ----- Statistik untuk warga (data pribadi) -----
    if (!isStaff(req.user.role)) {
      const userId = req.user.sub;
      const [myServiceRequests, myComplaints, recentRequests, recentComplaints] = await Promise.all([
        serviceRequestRepository.countByUser(userId),
        complaintRepository.countByUser(userId),
        serviceRequestRepository.list({ page: 1, limit: 5, userId }),
        complaintRepository.list({ page: 1, limit: 5, userId }),
      ]);
      return ok(res, {
        role: req.user.role,
        myServiceRequests,
        myComplaints,
        recentServiceRequests: recentRequests.rows,
        recentComplaints: recentComplaints.rows,
      }, 'OK');
    }

    // ----- Statistik global untuk staff/admin -----
    const [
      totalResidents,
      pendingVerifications,
      pendingUserVerifications,
      completedServiceRequests,
      openComplaints,
      recentRequests,
      recentComplaints,
      newsResult,
      announcementsResult,
      serviceStatusCounts,
      complaintStatusCounts,
    ] = await Promise.all([
      residentRepository.countByStatus('active'),
      residentRepository.countByStatus('pending'),
      userRepository.countByStatus('pending'),
      serviceRequestRepository.countByStatus('selesai'),
      complaintRepository.countOpen(),
      serviceRequestRepository.list({ page: 1, limit: 5 }),
      complaintRepository.list({ page: 1, limit: 5 }),
      newsRepository.list({ page: 1, limit: 1 }),
      announcementRepository.list({ page: 1, limit: 1 }),
      Promise.all(SERVICE_REQUEST_STATUSES.map((s) => serviceRequestRepository.countByStatus(s))),
      Promise.all(COMPLAINT_STATUSES.map((s) => complaintRepository.countByStatus(s))),
    ]);

    // Total = jumlah dari semua status
    const totalServiceRequests = sum(serviceStatusCounts);
    const totalComplaints = sum(complaintStatusCounts);

    // Pending service requests = jumlah dari status yang masih dalam proses
    const pendingServiceRequests = sum(
      PENDING_SERVICE_STATUSES.map((s, i) => {
        const idx = SERVICE_REQUEST_STATUSES.indexOf(s);
        return serviceStatusCounts[idx] ?? 0;
      })
    );

    return ok(res, {
      role: req.user.role,
      totalResidents,
      pendingVerifications,
      pendingUserVerifications,
      totalServiceRequests,
      pendingServiceRequests,
      completedServiceRequests,
      totalComplaints,
      openComplaints,
      totalNews: newsResult.total,
      totalAnnouncements: announcementsResult.total,
      recentServiceRequests: recentRequests.rows,
      recentComplaints: recentComplaints.rows,
    }, 'OK');
  }),
};

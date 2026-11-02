// Resident search controller
// Pencarian warga (login-only) dengan masking data sensitif

import type { Request, Response } from 'express';
import { getDb } from '../db/connection';
import type { QueryParams } from '../db/types';
import { householdRepository, type HouseholdMemberRow } from '../repositories/householdRepository';
import { ok, fail, notFound, paginated } from '../utils/response';
import { asyncHandler } from '../middleware/error';
import { parsePagination } from '../validators/common';

// -----------------------------------------------------
// Tipe hasil query pencarian
// -----------------------------------------------------

interface ResidentSearchRow {
  id: number;
  full_name: string;
  gender: 'L' | 'P' | null;
  rt: string | null;
  rw: string | null;
  dusun: string | null;
  household_id: number | null;
  household_role: string | null;
  head_name: string | null;
  phone: string | null;
  phone_published: number;
  status: string;
}

interface ResidentProfileRow {
  id: number;
  full_name: string;
  gender: 'L' | 'P' | null;
  birth_date: string | null;
  phone: string | null;
  phone_published: number;
  occupation: string | null;
  personal_rt: string | null;
  personal_rw: string | null;
  status: string;
  household_id: number | null;
  household_role: string | null;
  household_address: string | null;
  household_rt: string | null;
  household_rw: string | null;
  household_dusun: string | null;
  head_name: string | null;
}

// -----------------------------------------------------
// Helper: masking NIK
// -----------------------------------------------------

function maskNik(nik: string | null): string | null {
  if (!nik) return null;
  if (nik.length < 8) return '****';
  return `${nik.slice(0, 4)}********${nik.slice(-4)}`;
}

function maskKkNumber(kk: string | null): string | null {
  if (!kk) return null;
  if (kk.length < 8) return '****';
  return `${kk.slice(0, 4)}-****-${kk.slice(-4)}`;
}

// Format hasil pencarian (no NIK, no KK, phone only if published)
function formatSearchResult(row: ResidentSearchRow): Record<string, unknown> {
  return {
    id: row.id,
    fullName: row.full_name,
    gender: row.gender,
    rt: row.rt,
    rw: row.rw,
    dusun: row.dusun,
    householdId: row.household_id,
    householdRole: row.household_role,
    headName: row.head_name,
    phonePublished: row.phone_published === 1,
    phone: row.phone_published === 1 ? row.phone : null,
    status: row.status,
  };
}

// Format anggota KK untuk tampilan profil (mask NIK, phone only if published)
function formatMemberForProfile(member: HouseholdMemberRow): Record<string, unknown> {
  return {
    id: member.id,
    residentId: member.resident_id,
    role: member.role,
    isHead: member.is_head === 1,
    fullName: member.full_name,
    gender: member.gender,
    birthDate: member.birth_date,
    phone: member.phone_published === 1 ? member.phone : null,
    phonePublished: member.phone_published === 1,
    status: member.status,
    nikMasked: maskNik(member.nik),
  };
}

export const residentSearchController = {
  // ---------------------------------------------------
  // Pencarian warga by nama (auth)
  // ---------------------------------------------------
  search: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    // Batasi maksimal 100 hasil per halaman
    const safeLimit = Math.min(limit, 100);
    const q = (req.query.q as string | undefined)?.trim();
    if (!q || q.length < 2) {
      // Jika query kurang dari 2 karakter, kembalikan kosong
      return paginated(res, [], page, safeLimit, 0, 'OK');
    }

    const db = await getDb();
    // Pakai LIKE untuk pencarian parsial case-insensitive
    // SQLite: LIKE case-insensitive untuk ASCII by default
    // MySQL dengan utf8mb4: LIKE juga case-insensitive untuk ASCII
    const whereSql = `WHERE rp.status = 'active' AND (rp.full_name LIKE ?)`;
    const searchPattern = `%${q}%`;

    const countRows = await db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM resident_profiles rp ${whereSql}`,
      [searchPattern]
    );
    const total = countRows[0]?.count ?? 0;

    const offset = (page - 1) * safeLimit;
    const rows = await db.query<ResidentSearchRow>(
      `SELECT
         rp.id, rp.full_name, rp.gender,
         rp.phone, rp.phone_published, rp.status,
         rp.household_id, rp.household_role,
         h.rt AS rt, h.rw AS rw, h.dusun AS dusun,
         (SELECT rp2.full_name FROM resident_profiles rp2 WHERE rp2.id = h.head_resident_id) AS head_name
       FROM resident_profiles rp
       LEFT JOIN households h ON h.id = rp.household_id
       ${whereSql}
       ORDER BY rp.full_name ASC
       LIMIT ? OFFSET ?`,
      [searchPattern, safeLimit, offset] as QueryParams
    );

    return paginated(res, rows.map(formatSearchResult), page, safeLimit, total, 'OK');
  }),

  // ---------------------------------------------------
  // Ambil profil publik warga by id (auth)
  // Hanya untuk warga dengan status active. Tidak mengembalikan NIK/KK.
  // ---------------------------------------------------
  getProfile: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);

    const db = await getDb();
    const rows = await db.query<ResidentProfileRow>(
      `SELECT
         rp.id, rp.full_name, rp.gender, rp.birth_date,
         rp.phone, rp.phone_published, rp.occupation, rp.status,
         rp.rt AS personal_rt, rp.rw AS personal_rw,
         rp.household_id, rp.household_role,
         h.address AS household_address,
         h.rt AS household_rt, h.rw AS household_rw, h.dusun AS household_dusun,
         (SELECT rp2.full_name FROM resident_profiles rp2 WHERE rp2.id = h.head_resident_id) AS head_name
       FROM resident_profiles rp
       LEFT JOIN households h ON h.id = rp.household_id
       WHERE rp.id = ? AND rp.status = 'active'
       LIMIT 1`,
      [id]
    );
    const profile = rows[0];
    if (!profile) return notFound(res, 'Profil warga tidak ditemukan atau tidak aktif');

    // Bangun response
    const result: Record<string, unknown> = {
      id: profile.id,
      fullName: profile.full_name,
      gender: profile.gender,
      birthDate: profile.birth_date,
      occupation: profile.occupation,
      phonePublished: profile.phone_published === 1,
      phone: profile.phone_published === 1 ? profile.phone : null,
      status: profile.status,
      personalRt: profile.personal_rt,
      personalRw: profile.personal_rw,
    };

    // Sertakan info KK jika ada
    if (profile.household_id) {
      const members = await householdRepository.listMembers(profile.household_id);
      result.household = {
        id: profile.household_id,
        address: profile.household_address,
        rt: profile.household_rt,
        rw: profile.household_rw,
        dusun: profile.household_dusun,
        headName: profile.head_name,
        myRole: profile.household_role,
        kkNumberMasked: null, // akan diisi dari query terpisah
        members: members.map(formatMemberForProfile),
      };

      // Ambil kk_number untuk dimasking (warga hanya boleh lihat versi masked)
      const householdRows = await db.query<{ kk_number: string | null }>(
        'SELECT kk_number FROM households WHERE id = ? LIMIT 1',
        [profile.household_id]
      );
      if (householdRows[0]) {
        (result.household as Record<string, unknown>).kkNumberMasked = maskKkNumber(householdRows[0].kk_number);
      }
    } else {
      result.household = null;
    }

    return ok(res, result, 'OK');
  }),
};

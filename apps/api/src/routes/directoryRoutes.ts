import { Router } from 'express';
import { getDb } from '../db/connection';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { ok, fail } from '../utils/response';
export const directoryRouter = Router();
const staff = [authenticate, requireRole('admin','petugas')];
const digits = (v: unknown) => String(v ?? '').replace(/\D/g,'');
const wa = (v: unknown) => { const n=digits(v); return n.startsWith('0')?'62'+n.slice(1):n; };
directoryRouter.get('/categories', asyncHandler(async (_req,res)=>ok(res,await (await getDb()).query('SELECT id,name FROM business_categories ORDER BY name'))));
directoryRouter.get('/businesses', asyncHandler(async (req,res)=>{
 const q=String(req.query.q??'').slice(0,100); const category=Number(req.query.category)||0;
 const rows=await (await getDb()).query(`SELECT b.id,b.name,b.description,b.address,b.photo_url,b.latitude,b.longitude, c.name AS category, r.full_name AS owner, CASE WHEN b.whatsapp_public=1 THEN b.whatsapp ELSE NULL END AS whatsapp FROM resident_businesses b JOIN business_categories c ON c.id=b.category_id JOIN resident_profiles r ON r.id=b.owner_id WHERE b.status='published' AND (b.name LIKE ? OR r.full_name LIKE ? OR c.name LIKE ?) AND (?=0 OR b.category_id=?) ORDER BY b.created_at DESC LIMIT 50`,[...Array(3).fill('%'+q+'%'),category,category]);
 return ok(res,rows);
}));
directoryRouter.get('/businesses/:id',asyncHandler(async(req,res)=>{
 const rows=await (await getDb()).query('SELECT b.id,b.name,b.description,b.address,b.photo_url,b.latitude,b.longitude,c.name AS category,r.full_name AS owner,CASE WHEN b.whatsapp_public=1 THEN b.whatsapp ELSE NULL END AS whatsapp FROM resident_businesses b JOIN business_categories c ON c.id=b.category_id JOIN resident_profiles r ON r.id=b.owner_id WHERE b.id=? AND b.status=?',[req.params.id,'published']);return rows.length?ok(res,rows[0]):fail(res,'Tidak ditemukan',404);
}));
directoryRouter.get('/locations',asyncHandler(async(_req,res)=>ok(res,await (await getDb()).query('SELECT id,name,category,latitude,longitude FROM village_locations WHERE is_public=1'))));
directoryRouter.get('/residents/search',authenticate,asyncHandler(async(req,res)=>{
 const q=String(req.query.q??'').trim().slice(0,80);if(q.length<2)return fail(res,'Masukkan minimal 2 karakter',422);
 const rows=await (await getDb()).query(`SELECT r.id,r.full_name,r.rt,r.rw,hm.household_id,h.address,head.full_name AS head_name,hm.relationship FROM resident_profiles r LEFT JOIN household_members hm ON hm.resident_id=r.id LEFT JOIN households h ON h.id=hm.household_id LEFT JOIN resident_profiles head ON head.id=h.head_resident_id WHERE r.status='active' AND r.full_name LIKE ? ORDER BY r.full_name LIMIT 30`,['%'+q+'%']);return ok(res,rows);
}));
directoryRouter.get('/households/:id',authenticate,asyncHandler(async(req,res)=>{
 const db=await getDb();const h=await db.query('SELECT id,address,rt,rw FROM households WHERE id=?',[req.params.id]);if(!h.length)return fail(res,'Tidak ditemukan',404);
 const members=await db.query('SELECT r.id,r.full_name,hm.relationship FROM household_members hm JOIN resident_profiles r ON r.id=hm.resident_id WHERE hm.household_id=? AND r.status=?',[req.params.id,'active']);return ok(res,{household:h[0],members});
}));
directoryRouter.get('/admin/businesses',...staff,asyncHandler(async(_req,res)=>ok(res,await (await getDb()).query('SELECT b.*,c.name AS category,r.full_name AS owner FROM resident_businesses b JOIN business_categories c ON c.id=b.category_id JOIN resident_profiles r ON r.id=b.owner_id ORDER BY b.id DESC LIMIT 100'))));
directoryRouter.post('/businesses',authenticate,asyncHandler(async(req,res)=>{
 const {name,categoryId,description,address,whatsapp,whatsappPublic,latitude,longitude}=req.body??{};if(typeof name!=='string'||!name.trim()||name.length>150||!Number.isInteger(Number(categoryId)))return fail(res,'Data usaha tidak valid',422);
 const db=await getDb();const owner=await db.query<{id:number}>('SELECT id FROM resident_profiles WHERE user_id=? AND status=?',[req.user!.sub,'active']);if(!owner.length)return fail(res,'Profil warga belum terverifikasi',403);
 const phone=wa(whatsapp);if(phone&&!/^62[0-9]{8,13}$/.test(phone))return fail(res,'Nomor WhatsApp tidak valid',422);
 await db.execute('INSERT INTO resident_businesses (owner_id,category_id,name,description,address,whatsapp,whatsapp_public,latitude,longitude,status) VALUES (?,?,?,?,?,?,?,?,?,?)',[owner[0].id,Number(categoryId),name.trim(),String(description??'').slice(0,2000),String(address??'').slice(0,255),phone||null,whatsappPublic?1:0,latitude||null,longitude||null,'pending']);return ok(res,null,'Pengajuan usaha menunggu persetujuan',201);
}));
directoryRouter.patch('/admin/businesses/:id',...staff,asyncHandler(async(req,res)=>{
 const status=String(req.body?.status??'');if(!['pending','published','disabled'].includes(status))return fail(res,'Status tidak valid',422);
 await (await getDb()).execute('UPDATE resident_businesses SET status=? WHERE id=?',[status,req.params.id]);return ok(res,null,'Status diperbarui');
}));
directoryRouter.post('/admin/categories',...staff,asyncHandler(async(req,res)=>{
 const name=String(req.body?.name??'').trim();if(!name||name.length>100)return fail(res,'Nama kategori tidak valid',422);await (await getDb()).execute('INSERT INTO business_categories (name) VALUES (?)',[name]);return ok(res,null,'Kategori ditambahkan',201);
}));
directoryRouter.post('/admin/locations',...staff,asyncHandler(async(req,res)=>{
 const {name,category,latitude,longitude}=req.body??{};if(!name||!Number.isFinite(Number(latitude))||!Number.isFinite(Number(longitude))||Math.abs(Number(latitude))>90||Math.abs(Number(longitude))>180)return fail(res,'Lokasi tidak valid',422);
 await (await getDb()).execute('INSERT INTO village_locations (name,category,latitude,longitude) VALUES (?,?,?,?)',[String(name).slice(0,150),String(category??'').slice(0,80),Number(latitude),Number(longitude)]);return ok(res,null,'Lokasi ditambahkan',201);
}));

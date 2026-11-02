// =====================================================
// SIPEDES API Integration Tests (Revisi)
// Mencakup: login NIK, force change password, businesses,
// households, resident search, map, dan modul lama
// =====================================================

const http = require('http');

const BASE = process.env.API_URL || 'http://localhost:4000';
const API = BASE + '/api/v1';

let passed = 0;
let failed = 0;
const failures = [];

function log(msg) { console.log(msg); }
function pass(name) { passed++; console.log(`  [PASS] ${name}`); }
function fail(name, err) { failed++; failures.push({ name, err }); console.log(`  [FAIL] ${name}: ${err}`); }

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(API + path);
    const finalUrl = path.startsWith('/../') ? new URL(BASE + path.replace(/^\.\.\//, '')) : url;
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const req = http.request(
      { hostname: finalUrl.hostname, port: finalUrl.port, path: finalUrl.pathname + finalUrl.search, method, headers },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(chunks); } catch { /* bukan JSON */ }
          resolve({ status: res.statusCode, body: chunks, json });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

async function run() {
  log('');
  log('============================================');
  log('  SIPEDES API Integration Tests (Revisi)');
  log(`  Target: ${API}`);
  log('============================================');
  log('');

  // ============ Modul Lama ============

  log('Test 1: Health check');
  try {
    const res = await request('GET', '/../health');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.json.status === 'ok', 'Health status should be ok');
    pass('GET /health returns ok');
  } catch (e) { fail('GET /health', e.message); }

  log('Test 2: Public news list');
  try {
    const res = await request('GET', '/public/news?limit=3');
    assert(res.status === 200);
    assert(res.json.success === true);
    assert(res.json.data.items.length > 0, 'should have news items');
    pass(`GET /public/news returns ${res.json.data.items.length} items`);
  } catch (e) { fail('GET /public/news', e.message); }

  log('Test 3: Public announcements');
  try {
    const res = await request('GET', '/public/announcements');
    assert(res.status === 200);
    assert(res.json.success === true);
    pass('GET /public/announcements');
  } catch (e) { fail('GET /public/announcements', e.message); }

  log('Test 4: Public service types');
  try {
    const res = await request('GET', '/public/service-types');
    assert(res.status === 200);
    assert(res.json.data.items.length >= 5, 'should have at least 5 service types');
    pass(`GET /public/service-types returns ${res.json.data.items.length} types`);
  } catch (e) { fail('GET /public/service-types', e.message); }

  // ============ Login NIK (Modul Baru) ============

  log('Test 5: Login admin (email) untuk staff');
  let adminToken;
  try {
    const res = await request('POST', '/auth/login', { email: 'admin@sipedes.local', password: 'Admin12345' });
    assert(res.status === 200);
    assert(res.json.success === true);
    adminToken = res.json.data.token;
    pass('Admin email login successful');
  } catch (e) { fail('Admin email login', e.message); }

  log('Test 6: Login warga via NIK dengan password awal (tanggal lahir DDMMYYYY)');
  let wargaToken, wargaMustChange;
  try {
    const res = await request('POST', '/auth/login-nik', { nik: '3201010101900001', password: '01011990' });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.json.success === true, 'login should succeed');
    assert(res.json.data.mustChangePassword === true, 'mustChangePassword should be true on first login');
    wargaToken = res.json.data.token;
    wargaMustChange = res.json.data.mustChangePassword;
    pass('NIK login with birth-date password returns mustChangePassword=true');
  } catch (e) { fail('NIK login', e.message); }

  log('Test 7: Login NIK dengan password salah (pesan generik)');
  try {
    const res = await request('POST', '/auth/login-nik', { nik: '3201010101900001', password: 'salahpassword' });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.json.message === 'NIK atau kata sandi salah', 'Should return generic message');
    pass('Wrong password returns generic error (no NIK leak)');
  } catch (e) { fail('Wrong password generic error', e.message); }

  log('Test 8: Login NIK tidak terdaftar (pesan generik sama)');
  try {
    const res = await request('POST', '/auth/login-nik', { nik: '3201019999999999', password: '01011990' });
    assert(res.status === 401);
    assert(res.json.message === 'NIK atau kata sandi salah', 'Should return same generic message');
    pass('Unknown NIK returns same generic error');
  } catch (e) { fail('Unknown NIK generic error', e.message); }

  log('Test 9: Login NIK akun pending (harus ditolak)');
  try {
    const res = await request('POST', '/auth/login-nik', { nik: '3201010404900004', password: '04041990' });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    assert(res.json.success === false);
    pass('Pending account correctly rejected');
  } catch (e) { fail('Pending account rejection', e.message); }

  log('Test 10: Force change password wajib pada login pertama');
  try {
    const res = await request('POST', '/auth/force-change-password',
      { newPassword: 'BudiBaru123', confirmPassword: 'BudiBaru123' }, wargaToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.json.success === true);
    pass('Force change password successful');
  } catch (e) { fail('Force change password', e.message); }

  log('Test 11: Login ulang dengan password baru (mustChange=false)');
  let wargaToken2;
  try {
    const res = await request('POST', '/auth/login-nik', { nik: '3201010101900001', password: 'BudiBaru123' });
    assert(res.status === 200);
    assert(res.json.data.mustChangePassword === false, 'mustChangePassword should be false after change');
    wargaToken2 = res.json.data.token;
    pass('Login with new password works, mustChangePassword=false');
  } catch (e) { fail('Login with new password', e.message); }

  log('Test 12: Password lama (tanggal lahir) tidak lagi berfungsi setelah diganti');
  try {
    const res = await request('POST', '/auth/login-nik', { nik: '3201010101900001', password: '01011990' });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    pass('Old birth-date password correctly rejected after change');
  } catch (e) { fail('Old password rejection', e.message); }

  log('Test 13: Force change password kedua kali (harus gagal - sudah pernah)');
  try {
    const res = await request('POST', '/auth/force-change-password',
      { newPassword: 'Another123', confirmPassword: 'Another123' }, wargaToken2);
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    pass('Force change password rejected after first time');
  } catch (e) { fail('Force change second time rejection', e.message); }

  // ============ Resident Search (Modul Baru) ============

  log('Test 14: Resident search tanpa login (harus 401)');
  try {
    const res = await request('GET', '/residents-search/search?q=Ahmad');
    assert(res.status === 401);
    pass('Resident search correctly requires auth');
  } catch (e) { fail('Resident search auth check', e.message); }

  log('Test 15: Resident search dengan login - hasil nama sama dapat dibedakan');
  try {
    const res = await request('GET', '/residents-search/search?q=Ahmad', null, wargaToken2);
    assert(res.status === 200);
    assert(res.json.data.items.length >= 2, 'should return at least 2 results');
    // Verifikasi pembeda: setiap result punya headName & RT/RW
    for (const r of res.json.data.items) {
      assert(r.headName, 'should have headName for disambiguation');
      assert(r.rt, 'should have RT for disambiguation');
      assert(!r.nik, 'should NOT return NIK');
    }
    pass(`Resident search returns ${res.json.data.items.length} results with disambiguators`);
  } catch (e) { fail('Resident search results', e.message); }

  log('Test 16: Resident search tidak mengembalikan NIK');
  try {
    const res = await request('GET', '/residents-search/search?q=Budi', null, wargaToken2);
    assert(res.status === 200);
    for (const r of res.json.data.items) {
      assert(!('nik' in r) || r.nik === undefined, 'should not expose NIK field');
    }
    pass('Resident search does not expose NIK');
  } catch (e) { fail('NIK exposure check', e.message); }

  // ============ Households (KK) ============

  log('Test 17: Get my household (warga)');
  try {
    const res = await request('GET', '/households/mine', null, wargaToken2);
    assert(res.status === 200);
    assert(res.json.data.address, 'should have address');
    assert(res.json.data.kkNumberMasked, 'should have masked KK number');
    assert(!res.json.data.kkNumber || res.json.data.kkNumber.includes('****'), 'should NOT return full KK number to warga');
    assert(res.json.data.members.length >= 1, 'should have at least 1 member');
    pass(`My household: ${res.json.data.members.length} members, KK masked`);
  } catch (e) { fail('Get my household', e.message); }

  log('Test 18: Household members tidak mengekspos NIK ke warga');
  try {
    const res = await request('GET', '/households/mine', null, wargaToken2);
    for (const m of res.json.data.members) {
      // NIK harus masked atau tidak ada
      if (m.nik) {
        assert(m.nik.includes('****'), 'NIK must be masked');
      }
    }
    pass('Household members NIK properly masked');
  } catch (e) { fail('Household NIK masking', e.message); }

  // ============ Businesses (Jasa & Usaha) ============

  log('Test 19: Public business directory hanya menampilkan approved');
  try {
    const res = await request('GET', '/businesses?limit=20');
    assert(res.status === 200);
    for (const b of res.json.data.items) {
      assert(b.status === 'approved', `Business "${b.name}" should be approved, got ${b.status}`);
    }
    pass(`Public directory shows ${res.json.data.items.length} approved businesses only`);
  } catch (e) { fail('Public business directory', e.message); }

  log('Test 20: Business detail publik dengan WhatsApp');
  try {
    const list = await request('GET', '/businesses?limit=1');
    if (list.json.data.items.length > 0) {
      const id = list.json.data.items[0].id;
      const res = await request('GET', `/businesses/${id}`);
      assert(res.status === 200);
      assert(res.json.data.name, 'should have name');
      // Jika whatsappPublished true, whatsapp harus ada; jika false, harus null
      if (res.json.data.whatsappPublished === false) {
        assert(res.json.data.whatsapp === null, 'whatsapp must be null if not published');
      }
      pass(`Business detail: ${res.json.data.name} (whatsapp published: ${res.json.data.whatsappPublished})`);
    } else {
      pass('No businesses to test detail (skipped)');
    }
  } catch (e) { fail('Business detail', e.message); }

  log('Test 21: Business categories publik');
  try {
    const res = await request('GET', '/business-categories');
    assert(res.status === 200);
    assert(res.json.data.items.length >= 5, 'should have at least 5 categories');
    pass(`Business categories: ${res.json.data.items.length} active categories`);
  } catch (e) { fail('Business categories', e.message); }

  log('Test 22: Businesses/mine (warga)');
  try {
    const res = await request('GET', '/businesses/mine', null, wargaToken2);
    assert(res.status === 200);
    pass(`My businesses: ${res.json.data.items.length} items`);
  } catch (e) { fail('My businesses', e.message); }

  log('Test 23: Warga membuat usaha baru (status pending)');
  let newBizId;
  try {
    const cats = await request('GET', '/business-categories');
    const catId = cats.json.data.items[0].id;
    const res = await request('POST', '/businesses', {
      categoryId: catId,
      name: 'Usaha Test Otomatis ' + Date.now(),
      description: 'Usaha untuk pengujian',
      whatsapp: '6281200000099',
      whatsappPublished: true,
      address: 'Jl. Test',
      rt: '001', rw: '002',
    }, wargaToken2);
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.json.data.status === 'pending', 'New business should be pending');
    newBizId = res.json.data.id;
    pass(`Warga created business id=${newBizId} (status: pending)`);
  } catch (e) { fail('Create business', e.message); }

  log('Test 24: Usaha pending tidak tampil di direktori publik');
  try {
    const res = await request('GET', '/businesses?limit=100');
    const found = res.json.data.items.find((b) => b.id === newBizId);
    assert(!found, 'Pending business should NOT appear in public directory');
    pass('Pending business correctly hidden from public');
  } catch (e) { fail('Pending business hidden', e.message); }

  log('Test 25: Admin approve business');
  try {
    const res = await request('PATCH', `/businesses/${newBizId}/status`, { status: 'approved' }, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    pass('Admin approved business');
  } catch (e) { fail('Approve business', e.message); }

  log('Test 26: Usaha approved sekarang tampil di direktori publik');
  try {
    const res = await request('GET', '/businesses?limit=100');
    const found = res.json.data.items.find((b) => b.id === newBizId);
    assert(found, 'Approved business should appear in public directory');
    pass('Approved business now visible publicly');
  } catch (e) { fail('Approved business visible', e.message); }

  // ============ Map ============

  log('Test 27: Public map locations');
  try {
    const res = await request('GET', '/map/locations');
    assert(res.status === 200);
    assert(res.data !== null);
    assert(res.json.data.length >= 3, 'should have at least 3 locations');
    pass(`Map locations: ${res.json.data.length} active locations`);
  } catch (e) { fail('Map locations', e.message); }

  log('Test 28: Public map files list');
  try {
    const res = await request('GET', '/map/files');
    assert(res.status === 200);
    assert(res.json.data.items.length >= 1, 'should have at least 1 file');
    pass(`Map files: ${res.json.data.items.length} files available`);
  } catch (e) { fail('Map files list', e.message); }

  log('Test 29: Download map file (stream)');
  try {
    const files = await request('GET', '/map/files');
    const fileId = files.json.data.items[0].id;
    const res = await new Promise((resolve, reject) => {
      http.get(`${API}/map/files/${fileId}/download`, (r) => {
        let buf = Buffer.alloc(0);
        r.on('data', (c) => (buf = Buffer.concat([buf, c])));
        r.on('end', () => resolve({ status: r.statusCode, headers: r.headers, body: buf }));
      }).on('error', reject);
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.headers['content-disposition'], 'should have Content-Disposition');
    assert(res.body.length > 0, 'should have file content');
    pass(`Downloaded map file: ${res.body.length} bytes`);
  } catch (e) { fail('Map file download', e.message); }

  // ============ Akses Horizontal ============

  log('Test 30: Warga tidak bisa akses admin endpoints');
  try {
    const res = await request('GET', '/households', null, wargaToken2);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    pass('Warga correctly denied admin household list');
  } catch (e) { fail('Warga denied admin endpoint', e.message); }

  log('Test 31: Warga tidak bisa melihat pengaduan warga lain');
  try {
    // Complaint id=1 milik Siti (seeded)
    const res = await request('GET', '/complaints/1', null, wargaToken2);
    assert(res.status === 403 || res.status === 404, `Expected 403/404, got ${res.status}`);
    pass('Horizontal access prevention works');
  } catch (e) { fail('Horizontal access prevention', e.message); }

  // ============ Dashboard ============

  log('Test 32: Dashboard stats admin');
  try {
    const res = await request('GET', '/dashboard/stats', null, adminToken);
    assert(res.status === 200);
    assert(res.json.data.totalResidents !== undefined);
    pass(`Admin dashboard: ${res.json.data.totalResidents} residents, ${res.json.data.totalServiceRequests} requests`);
  } catch (e) { fail('Admin dashboard', e.message); }

  log('Test 33: Dashboard stats warga');
  try {
    const res = await request('GET', '/dashboard/stats', null, wargaToken2);
    assert(res.status === 200);
    pass('Warga dashboard stats accessible');
  } catch (e) { fail('Warga dashboard', e.message); }

  // ============ Village Settings ============

  log('Test 34: Village settings publik');
  try {
    const res = await request('GET', '/village');
    assert(res.status === 200);
    assert(res.json.data.village_name, 'should have village_name');
    pass(`Village: ${res.json.data.village_name}`);
  } catch (e) { fail('Village settings', e.message); }

  // ============ Results ============
  log('');
  log('============================================');
  log('  HASIL PENGUJIAN');
  log('============================================');
  log(`  Total : ${passed + failed}`);
  log(`  PASS  : ${passed}`);
  log(`  FAIL  : ${failed}`);
  log('============================================');
  if (failures.length > 0) {
    log('');
    log('Failures:');
    failures.forEach((f) => log(`  - ${f.name}: ${f.err}`));
  }
  log('');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(2);
});

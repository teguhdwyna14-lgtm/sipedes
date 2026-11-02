// App - root component dengan routing

import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import { PublicLayout } from './components/layout/PublicLayout';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { useAuthStore } from './store/authStore';
import { ForceChangePasswordPage } from './pages/auth/ForceChangePasswordPage';

// Public pages
import { HomePage } from './pages/public/HomePage';
import { ProfilePage } from './pages/public/ProfilePage';
import { NewsListPage } from './pages/public/NewsListPage';
import { NewsDetailPage } from './pages/public/NewsDetailPage';
import { AnnouncementsPage } from './pages/public/AnnouncementsPage';
import { ServicesPage } from './pages/public/ServicesPage';
import { ContactPage } from './pages/public/ContactPage';
import { BusinessDirectoryPage } from './pages/public/BusinessDirectoryPage';
import { BusinessDetailPage } from './pages/public/BusinessDetailPage';
import { VillageMapPage } from './pages/public/VillageMapPage';
import { NotFoundPage } from './pages/errors/NotFoundPage';

// Auth pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Warga pages
import { WargaDashboard } from './pages/warga/WargaDashboard';
import { WargaPermohonanList } from './pages/warga/WargaPermohonanList';
import { WargaPermohonanCreate } from './pages/warga/WargaPermohonanCreate';
import { WargaPengaduanList } from './pages/warga/WargaPengaduanList';
import { WargaPengaduanCreate } from './pages/warga/WargaPengaduanCreate';
import { WargaDokumen } from './pages/warga/WargaDokumen';
import { WargaProfil } from './pages/warga/WargaProfil';
import { WargaBusinessList } from './pages/warga/WargaBusinessList';
import { WargaBusinessForm } from './pages/warga/WargaBusinessForm';
import { ResidentSearchPage } from './pages/warga/ResidentSearchPage';
import { ResidentProfilePage } from './pages/warga/ResidentProfilePage';
import { MyHouseholdPage } from './pages/warga/MyHouseholdPage';

// Staff pages
import { StaffDashboard } from './pages/staff/StaffDashboard';
import { StaffVerifikasi } from './pages/staff/StaffVerifikasi';
import { StaffWarga } from './pages/staff/StaffWarga';
import { StaffPermohonan } from './pages/staff/StaffPermohonan';
import { StaffPengaduan } from './pages/staff/StaffPengaduan';
import { StaffBerita } from './pages/staff/StaffBerita';
import { StaffPengumuman } from './pages/staff/StaffPengumuman';
import { StaffLayanan } from './pages/staff/StaffLayanan';
import { StaffDokumen } from './pages/staff/StaffDokumen';
import { StaffPengaturan } from './pages/staff/StaffPengaturan';
import { StaffHouseholds } from './pages/staff/StaffHouseholds';
import { StaffBusinesses } from './pages/staff/StaffBusinesses';
import { StaffMapLocations } from './pages/staff/StaffMapLocations';

function App() {
  const { token, fetchProfile } = useAuthStore();

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token, fetchProfile]);

  return (
    <Routes>
      {/* Public layout */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/profil" element={<ProfilePage />} />
        <Route path="/berita" element={<NewsListPage />} />
        <Route path="/berita/:slug" element={<NewsDetailPage />} />
        <Route path="/pengumuman" element={<AnnouncementsPage />} />
        <Route path="/layanan" element={<ServicesPage />} />
        <Route path="/kontak" element={<ContactPage />} />
        <Route path="/jasa-usaha" element={<BusinessDirectoryPage />} />
        <Route path="/jasa-usaha/:id" element={<BusinessDetailPage />} />
        <Route path="/peta" element={<VillageMapPage />} />
      </Route>

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/force-change-password" element={<ForceChangePasswordPage />} />

      {/* Warga dashboard */}
      <Route path="/warga" element={<DashboardLayout allowedRoles={['warga']} />}>
        <Route index element={<WargaDashboard />} />
        <Route path="permohonan" element={<WargaPermohonanList />} />
        <Route path="permohonan/baru" element={<WargaPermohonanCreate />} />
        <Route path="pengaduan" element={<WargaPengaduanList />} />
        <Route path="pengaduan/baru" element={<WargaPengaduanCreate />} />
        <Route path="dokumen" element={<WargaDokumen />} />
        <Route path="profil" element={<WargaProfil />} />
        <Route path="usaha" element={<WargaBusinessList />} />
        <Route path="usaha/baru" element={<WargaBusinessForm />} />
        <Route path="usaha/:id/edit" element={<WargaBusinessForm />} />
        <Route path="cari-warga" element={<ResidentSearchPage />} />
        <Route path="cari-warga/:id" element={<ResidentProfilePage />} />
        <Route path="keluarga" element={<MyHouseholdPage />} />
      </Route>

      {/* Staff dashboard */}
      <Route path="/staff" element={<DashboardLayout allowedRoles={['petugas', 'admin']} />}>
        <Route index element={<StaffDashboard />} />
        <Route path="verifikasi" element={<StaffVerifikasi />} />
        <Route path="warga" element={<StaffWarga />} />
        <Route path="permohonan" element={<StaffPermohonan />} />
        <Route path="pengaduan" element={<StaffPengaduan />} />
        <Route path="berita" element={<StaffBerita />} />
        <Route path="pengumuman" element={<StaffPengumuman />} />
        <Route path="layanan" element={<StaffLayanan />} />
        <Route path="dokumen" element={<StaffDokumen />} />
        <Route path="pengaturan" element={<StaffPengaturan />} />
        <Route path="keluarga" element={<StaffHouseholds />} />
        <Route path="usaha" element={<StaffBusinesses />} />
        <Route path="peta" element={<StaffMapLocations />} />
      </Route>

      {/* 404 */}
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}

export default App;

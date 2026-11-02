// Footer publik

import { Link } from 'react-router-dom';
import { useVillageSettings } from '../../hooks/useVillageSettings';

export function Footer() {
  const { settings } = useVillageSettings();

  return (
    <footer className="bg-forest-900 text-cream-200 mt-auto">
      <div className="container-app py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Identitas */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gold-500 flex items-center justify-center font-bold text-forest-950">
                SP
              </div>
              <div>
                <div className="font-display font-bold text-cream-50">SIPEDES</div>
                <div className="text-xs text-cream-400">Desa {settings?.village_name ?? 'Sukamaju'}</div>
              </div>
            </div>
            <p className="text-sm text-cream-300 leading-relaxed">
              {settings?.address ?? '-'}
              <br />
              {settings?.district}, {settings?.regency}
              <br />
              {settings?.province} {settings?.postal_code}
            </p>
          </div>

          {/* Tautan */}
          <div>
            <h4 className="font-semibold text-cream-50 mb-4">Tautan</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-gold-300 transition-colors">Beranda</Link></li>
              <li><Link to="/profil" className="hover:text-gold-300 transition-colors">Profil Desa</Link></li>
              <li><Link to="/berita" className="hover:text-gold-300 transition-colors">Berita</Link></li>
              <li><Link to="/pengumuman" className="hover:text-gold-300 transition-colors">Pengumuman</Link></li>
              <li><Link to="/layanan" className="hover:text-gold-300 transition-colors">Layanan Surat</Link></li>
              <li><Link to="/kontak" className="hover:text-gold-300 transition-colors">Kontak</Link></li>
            </ul>
          </div>

          {/* Kontak */}
          <div>
            <h4 className="font-semibold text-cream-50 mb-4">Kontak</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>{settings?.phone ?? '-'}</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>{settings?.email ?? '-'}</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{settings?.working_hours ?? 'Senin-Jumat: 08.00-15.00'}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-forest-800 mt-8 pt-6 text-center text-xs text-cream-400">
          <p>&copy; {new Date().getFullYear()} Pemerintah Desa {settings?.village_name ?? 'Sukamaju'}. Dikembangkan untuk tujuan akademik.</p>
          <p className="mt-1">SIPEDES - Sistem Informasi dan Pelayanan Desa</p>
        </div>
      </div>
    </footer>
  );
}

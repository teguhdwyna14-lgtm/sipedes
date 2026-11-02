// Header publik dengan navigasi responsif

import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, user, isStaff, logout } = useAuthStore();
  const navigate = useNavigate();

  const publicLinks = [
    { to: '/', label: 'Beranda' },
    { to: '/jasa-usaha', label: 'Jasa & Usaha' },
    { to: '/peta', label: 'Peta Desa' },
    { to: '/profil', label: 'Profil Desa' },
    { to: '/berita', label: 'Berita' },
    { to: '/pengumuman', label: 'Pengumuman' },
    { to: '/layanan', label: 'Layanan' },
    { to: '/kontak', label: 'Kontak' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const dashboardLink = isStaff ? '/staff' : '/warga';

  return (
    <header className="sticky top-0 z-50 bg-forest-800 text-cream-50 shadow-md">
      {/* Top strip */}
      <div className="bg-forest-950 text-cream-200 text-xs">
        <div className="container-app flex items-center justify-between py-1.5">
          <span className="hidden sm:inline">Pemerintah Desa Sukamaju - Sistem Informasi & Pelayanan Desa</span>
          <span className="sm:hidden">Desa Sukamaju</span>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link to={dashboardLink} className="hover:text-gold-300 transition-colors">
                  Dashboard ({user?.fullName})
                </Link>
                <button onClick={handleLogout} className="hover:text-gold-300 transition-colors">Keluar</button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-gold-300 transition-colors">Masuk</Link>
                <Link to="/register" className="hover:text-gold-300 transition-colors">Daftar</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container-app">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold-500 flex items-center justify-center font-bold text-forest-950 text-lg shadow-md">
              SP
            </div>
            <div>
              <div className="font-display font-bold text-lg leading-tight">SIPEDES</div>
              <div className="text-[10px] text-cream-300 leading-tight">Sistem Informasi & Pelayanan Desa</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive ? 'bg-forest-700 text-gold-300' : 'text-cream-100 hover:bg-forest-700 hover:text-cream-50'
                  )
                }
                end={link.to === '/'}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-md hover:bg-forest-700 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="lg:hidden pb-4 space-y-1">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'block px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive ? 'bg-forest-700 text-gold-300' : 'text-cream-100 hover:bg-forest-700'
                  )
                }
                end={link.to === '/'}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}

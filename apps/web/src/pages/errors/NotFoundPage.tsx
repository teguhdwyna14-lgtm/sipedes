// Halaman 404 - tidak ditemukan

import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-forest-800 to-forest-950 p-4">
      <div className="text-center max-w-md">
        <div className="text-9xl font-bold text-gold-500 mb-4">404</div>
        <div className="w-24 h-1 bg-gold-500 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-cream-50 mb-3">Halaman Tidak Ditemukan</h1>
        <p className="text-cream-300 mb-8">
          Maaf, halaman yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>
        <Link to="/" className="btn-gold">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}

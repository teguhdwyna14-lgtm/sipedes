// Halaman Profil Desa - sejarah, visi-misi, geografi, potensi

import { useVillageSettings } from '../../hooks/useVillageSettings';
import { LoadingState } from '../../components/ui';

export function ProfilePage() {
  const { settings, loading } = useVillageSettings();

  if (loading) return <LoadingState />;

  const villageName = settings?.village_name ?? 'Sukamaju';
  const district = settings?.district ?? '';
  const regency = settings?.regency ?? '';
  const province = settings?.province ?? '';

  return (
    <div>
      {/* Hero kecil */}
      <section className="relative bg-forest-800 text-cream-50 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-forest-900/80 to-forest-700/40" />
        <div className="container-app relative py-16 sm:py-20">
          <div className="max-w-3xl">
            <div className="inline-block px-3 py-1 rounded-full bg-gold-500/20 text-gold-300 text-xs font-semibold mb-4 border border-gold-500/30">
              Profil Desa
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
              Desa {villageName}
            </h1>
            <p className="text-lg text-cream-200 leading-relaxed">
              {district && <>{district}, </>}
              {regency && <>{regency}, </>}
              {province}
            </p>
          </div>
        </div>
      </section>

      {/* Konten */}
      <section className="container-app py-12">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Sejarah */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-forest-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-forest-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-forest-900">Sejarah Desa</h2>
            </div>
            <div className="text-forest-700 leading-relaxed whitespace-pre-line text-sm">
              {settings?.history?.trim() || 'Sejarah desa belum tersedia.'}
            </div>
          </div>

          {/* Visi & Misi */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-gold-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-forest-900">Visi & Misi</h2>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-forest-800 mb-1">Visi</h3>
              <p className="text-forest-700 leading-relaxed text-sm whitespace-pre-line">
                {settings?.vision?.trim() || 'Visi desa belum tersedia.'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-forest-800 mb-1">Misi</h3>
              <p className="text-forest-700 leading-relaxed text-sm whitespace-pre-line">
                {settings?.mission?.trim() || 'Misi desa belum tersedia.'}
              </p>
            </div>
          </div>

          {/* Kondisi Geografis */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-wood-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-wood-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-forest-900">Kondisi Geografis</h2>
            </div>
            <p className="text-forest-700 leading-relaxed text-sm whitespace-pre-line">
              {settings?.geography?.trim() || 'Informasi geografis belum tersedia.'}
            </p>
          </div>

          {/* Potensi Desa */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-forest-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-forest-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-forest-900">Potensi Desa</h2>
            </div>
            <p className="text-forest-700 leading-relaxed text-sm whitespace-pre-line">
              {settings?.potential?.trim() || 'Informasi potensi desa belum tersedia.'}
            </p>
          </div>
        </div>

        {/* Info alamat lengkap */}
        <div className="card p-6 mt-6 bg-forest-50 border-forest-200">
          <h2 className="text-lg font-bold text-forest-900 mb-4">Alamat Lengkap</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-forest-600">Desa</span>
              <p className="font-semibold text-forest-900">{villageName}</p>
            </div>
            <div>
              <span className="text-forest-600">Kecamatan</span>
              <p className="font-semibold text-forest-900">{district || '-'}</p>
            </div>
            <div>
              <span className="text-forest-600">Kabupaten/Kota</span>
              <p className="font-semibold text-forest-900">{regency || '-'}</p>
            </div>
            <div>
              <span className="text-forest-600">Provinsi</span>
              <p className="font-semibold text-forest-900">{province || '-'}</p>
            </div>
            {settings?.postal_code && (
              <div>
                <span className="text-forest-600">Kode Pos</span>
                <p className="font-semibold text-forest-900">{settings.postal_code}</p>
              </div>
            )}
            {settings?.address && (
              <div className="sm:col-span-2">
                <span className="text-forest-600">Alamat Kantor</span>
                <p className="font-semibold text-forest-900">{settings.address}</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// Peta Desa interaktif menggunakan Leaflet (react-leaflet)

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { api } from '../../lib/api';
import type { MapLocation, MapFile } from '@sipedes/shared';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui';
import { formatFileSize, formatDate, getStatusBadgeClass, statusLabel } from '../../lib/utils';

// Perbaiki ikon default marker Leaflet (known issue dengan bundler)
L.Marker.prototype.options.icon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Komponen untuk fly-to marker dari luar peta
function FlyToController({ target, mapRef }: { target: { lat: number; lng: number; id: number } | null; mapRef: React.MutableRefObject<L.Map | null> }) {
  useEffect(() => {
    if (target && mapRef.current) {
      mapRef.current.flyTo([target.lat, target.lng], 16, { duration: 1.2 });
    }
  }, [target, mapRef]);
  return null;
}

const typeLabel: Record<string, string> = {
  kantor_desa: 'Kantor Desa',
  fasilitas_umum: 'Fasilitas Umum',
  usaha_warga: 'Usaha Warga',
  batas_desa: 'Batas Desa',
  lainnya: 'Lainnya',
};

export function VillageMapPage() {
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [files, setFiles] = useState<MapFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; id: number } | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [locRes, fileRes] = await Promise.all([
        api.get('/map/locations'),
        api.get('/map/files'),
      ]);
      if (locRes.data.success) {
        const list = locRes.data.data?.items ?? locRes.data.data ?? [];
        setLocations(Array.isArray(list) ? (list as MapLocation[]) : []);
      }
      if (fileRes.data.success) {
        const list = fileRes.data.data?.items ?? fileRes.data.data ?? [];
        setFiles(Array.isArray(list) ? (list as MapFile[]) : []);
      }
    } catch (err) {
      let msg = 'Gagal memuat peta';
      if (axios.isAxiosError(err)) msg = err.response?.data?.message ?? err.message;
      else if (err instanceof Error) msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Tentukan pusat peta: prioritaskan kantor_desa, fallback ke lokasi pertama
  const center: [number, number] = (() => {
    const kantorDesa = locations.find((l) => l.type === 'kantor_desa');
    if (kantorDesa) return [kantorDesa.latitude, kantorDesa.longitude];
    if (locations.length > 0) return [locations[0].latitude, locations[0].longitude];
    // Default: Indonesia
    return [-6.2, 106.8];
  })();

  const handleLocationClick = (loc: MapLocation) => {
    setFlyTarget({ lat: loc.latitude, lng: loc.longitude, id: loc.id });
  };

  const openInGoogleMaps = () => {
    window.open(`https://www.google.com/maps?q=${center[0]},${center[1]}`, '_blank');
  };

  const handleDownload = async (file: MapFile) => {
    try {
      const res = await api.get(`/map/files/${file.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : 'Gagal mengunduh file';
      setError(msg);
    }
  };

  if (loading) return <LoadingState message="Memuat peta..." />;
  if (error) return <ErrorState message={error} onRetry={fetch} />;

  return (
    <div>
      {/* Header */}
      <section className="bg-forest-800 text-cream-50">
        <div className="container-app py-12">
          <div className="max-w-3xl">
            <div className="inline-block px-3 py-1 rounded-full bg-gold-500/20 text-gold-300 text-xs font-semibold mb-4 border border-gold-500/30">
              Peta Desa
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">Peta Desa Sukamaju</h1>
            <p className="text-cream-200">
              Jelajahi lokasi penting desa: kantor desa, fasilitas umum, batas wilayah, dan usaha warga. Klik marker untuk informasi detail.
            </p>
          </div>
        </div>
      </section>

      <section className="container-app py-10">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="card overflow-hidden">
              <div style={{ height: '500px', width: '100%' }}>
                <MapContainer
                  center={center}
                  zoom={14}
                  style={{ height: '100%', width: '100%' }}
                  ref={(m) => { mapRef.current = m; }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  {locations.map((loc) => (
                    <Marker
                      key={loc.id}
                      position={[loc.latitude, loc.longitude]}
                    >
                      <Popup>
                        <div className="min-w-[200px]">
                          <div className="flex items-center gap-2 mb-2">
                            <strong>{loc.name}</strong>
                            <span className={getStatusBadgeClass('active')}>{typeLabel[loc.type] ?? loc.type}</span>
                          </div>
                          {loc.description && <p className="text-xs mb-2">{loc.description}</p>}
                          {loc.address && <p className="text-xs text-gray-600">{loc.address}</p>}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  <FlyToController target={flyTarget} mapRef={mapRef} />
                </MapContainer>
              </div>
              <div className="p-3 text-xs text-forest-600 border-t border-cream-200 bg-cream-50">
                &copy; OpenStreetMap contributors. Peta ini bersifat indikatif. Untuk batas wilayah resmi, hubungi kantor desa.
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Daftar lokasi */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-forest-900">Daftar Lokasi</h2>
                <button onClick={openInGoogleMaps} className="btn-secondary text-xs px-3 py-1.5">
                  Buka di Google Maps
                </button>
              </div>
              {locations.length === 0 ? (
                <EmptyState title="Belum ada lokasi" />
              ) : (
                <ul className="space-y-2 max-h-[300px] overflow-y-auto">
                  {locations.map((loc) => (
                    <li key={loc.id}>
                      <button
                        onClick={() => handleLocationClick(loc)}
                        className="w-full text-left p-3 rounded-lg hover:bg-cream-50 border border-cream-200 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-forest-900">{loc.name}</span>
                          <span className={getStatusBadgeClass('active')}>{typeLabel[loc.type] ?? loc.type}</span>
                        </div>
                        {loc.address && <p className="text-xs text-forest-600 mt-1">{loc.address}</p>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Download peta */}
            <div className="card p-5">
              <h2 className="text-lg font-bold text-forest-900 mb-4">Download Peta</h2>
              {files.length === 0 ? (
                <EmptyState title="Belum ada file peta" />
              ) : (
                <ul className="space-y-2">
                  {files.map((f) => (
                    <li key={f.id} className="p-3 border border-cream-200 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-forest-900 truncate">{f.title}</p>
                          {f.description && <p className="text-xs text-forest-600 mt-0.5">{f.description}</p>}
                          <p className="text-xs text-forest-500 mt-1">
                            {f.fileName} - {formatFileSize(f.fileSize)}
                          </p>
                          {f.attribution && <p className="text-xs text-forest-500 mt-0.5">Sumber: {f.attribution}</p>}
                          <p className="text-xs text-forest-400 mt-0.5">Diunggah: {formatDate(f.uploadedAt)}</p>
                        </div>
                        <button
                          onClick={() => handleDownload(f)}
                          className="btn-primary text-xs px-3 py-1.5 flex-shrink-0"
                        >
                          Unduh
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="btn-ghost">&larr; Kembali ke Beranda</Link>
        </div>
      </section>
    </div>
  );
}

// Halaman kontak desa dengan form pesan (frontend only)

import { useState } from 'react';
import { useVillageSettings } from '../../hooks/useVillageSettings';
import { useToastStore } from '../../store/toastStore';
import { LoadingState } from '../../components/ui';

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const EMPTY_FORM: ContactForm = { name: '', email: '', subject: '', message: '' };

export function ContactPage() {
  const { settings, loading } = useVillageSettings();
  const toast = useToastStore();
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<ContactForm>>({});

  const validate = (): boolean => {
    const newErrors: Partial<ContactForm> = {};
    if (!form.name.trim()) newErrors.name = 'Nama wajib diisi';
    if (!form.email.trim()) {
      newErrors.email = 'Email wajib diisi';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Format email tidak valid';
    }
    if (!form.subject.trim()) newErrors.subject = 'Subjek wajib diisi';
    if (!form.message.trim()) newErrors.message = 'Pesan wajib diisi';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    // Frontend-only: simulasikan pengiriman
    setTimeout(() => {
      setSubmitting(false);
      toast.success('Pesan terkirim. Tim kami akan menghubungi Anda segera.');
      setForm(EMPTY_FORM);
    }, 600);
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <section className="bg-forest-800 text-cream-50">
        <div className="container-app py-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Hubungi Kami</h1>
          <p className="text-cream-200">Sampaikan pertanyaan, saran, atau aspirasi Anda kepada pemerintah desa.</p>
        </div>
      </section>

      <section className="container-app py-10">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Info kontak */}
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-xl font-bold text-forest-900 mb-4">Informasi Kontak</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-forest-700 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <div className="text-sm font-semibold text-forest-800">Alamat Kantor</div>
                    <p className="text-sm text-forest-700 mt-0.5">
                      {settings?.address ?? 'Alamat belum tersedia'}
                      {settings?.postal_code && `, ${settings.postal_code}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-forest-700 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <div>
                    <div className="text-sm font-semibold text-forest-800">Telepon</div>
                    <p className="text-sm text-forest-700 mt-0.5">{settings?.phone ?? '-'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-forest-700 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <div className="text-sm font-semibold text-forest-800">Email</div>
                    <p className="text-sm text-forest-700 mt-0.5">{settings?.email ?? '-'}</p>
                  </div>
                </div>

                {settings?.website && (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-forest-700 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <div>
                      <div className="text-sm font-semibold text-forest-800">Website</div>
                      <a href={settings.website} className="text-sm text-forest-700 hover:text-forest-900 mt-0.5" target="_blank" rel="noreferrer">
                        {settings.website}
                      </a>
                    </div>
                  </div>
                )}

                {settings?.working_hours && (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-forest-700 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <div className="text-sm font-semibold text-forest-800">Jam Kerja</div>
                      <p className="text-sm text-forest-700 mt-0.5 whitespace-pre-line">{settings.working_hours}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {settings?.map_embed && (
              <div className="card overflow-hidden">
                <div className="aspect-video w-full" dangerouslySetInnerHTML={{ __html: settings.map_embed }} />
              </div>
            )}
          </div>

          {/* Form pesan */}
          <div className="card p-6">
            <h2 className="text-xl font-bold text-forest-900 mb-4">Kirim Pesan</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="name">Nama Lengkap</label>
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`input ${errors.name ? 'input-error' : ''}`}
                  placeholder="Nama Anda"
                />
                {errors.name && <p className="error-text">{errors.name}</p>}
              </div>

              <div>
                <label className="label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  placeholder="email@contoh.com"
                />
                {errors.email && <p className="error-text">{errors.email}</p>}
              </div>

              <div>
                <label className="label" htmlFor="subject">Subjek</label>
                <input
                  id="subject"
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className={`input ${errors.subject ? 'input-error' : ''}`}
                  placeholder="Subjek pesan"
                />
                {errors.subject && <p className="error-text">{errors.subject}</p>}
              </div>

              <div>
                <label className="label" htmlFor="message">Pesan</label>
                <textarea
                  id="message"
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className={`input ${errors.message ? 'input-error' : ''}`}
                  placeholder="Tulis pesan Anda di sini..."
                />
                {errors.message && <p className="error-text">{errors.message}</p>}
              </div>

              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? 'Mengirim...' : 'Kirim Pesan'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

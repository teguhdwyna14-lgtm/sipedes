// Hook untuk mengambil village settings dari API

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { VillageSettings } from '@sipedes/shared';

let cachedSettings: VillageSettings | null = null;

export function useVillageSettings() {
  const [settings, setSettings] = useState<VillageSettings | null>(cachedSettings);
  const [loading, setLoading] = useState(!cachedSettings);

  useEffect(() => {
    if (cachedSettings) return;
    let mounted = true;
    api.get('/village')
      .then((res) => {
        if (mounted && res.data.success && res.data.data) {
          cachedSettings = res.data.data as VillageSettings;
          setSettings(cachedSettings);
        }
      })
      .catch(() => { /* silent */ })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return { settings, loading };
}

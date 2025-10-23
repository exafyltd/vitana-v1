import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getLocalStorageItem, setLocalStorageItem } from '@/lib/localStorage';

export type ShortsDensity = 'cozy' | 'compact' | 'gallery';

const DENSITY_PRESETS: Record<ShortsDensity, { cardW: string; gap: string; fontScale: number }> = {
  cozy: { cardW: '300px', gap: '24px', fontScale: 1.0 },
  compact: { cardW: '260px', gap: '20px', fontScale: 0.92 },
  gallery: { cardW: '220px', gap: '16px', fontScale: 0.88 },
};

export function useShortsDensity() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlDensity = searchParams.get('density') as ShortsDensity | null;
  
  const [density, setDensityState] = useState<ShortsDensity>(() => {
    // Priority: URL > localStorage > default
    if (urlDensity && ['cozy', 'compact', 'gallery'].includes(urlDensity)) {
      return urlDensity;
    }
    const saved = getLocalStorageItem('global', 'mediaHub', 'shortsDensity');
    return (saved as ShortsDensity) || 'cozy';
  });

  const setDensity = (newDensity: ShortsDensity) => {
    setDensityState(newDensity);
    setLocalStorageItem('global', 'mediaHub', 'shortsDensity', newDensity);
    
    // Update URL
    const newParams = new URLSearchParams(searchParams);
    newParams.set('density', newDensity);
    setSearchParams(newParams, { replace: true });
  };

  // Sync from URL changes (e.g., back/forward navigation)
  useEffect(() => {
    if (urlDensity && ['cozy', 'compact', 'gallery'].includes(urlDensity) && urlDensity !== density) {
      setDensityState(urlDensity);
      setLocalStorageItem('global', 'mediaHub', 'shortsDensity', urlDensity);
    }
  }, [urlDensity]);

  const preset = DENSITY_PRESETS[density];

  return {
    density,
    setDensity,
    cardWidth: preset.cardW,
    gap: preset.gap,
    fontScale: preset.fontScale,
  };
}

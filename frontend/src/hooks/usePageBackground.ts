import { useState, useEffect } from 'react';

export type PageBackgroundType = 'none' | 'gradient' | 'image';

export interface PageBackgroundConfig {
  type: PageBackgroundType;
  gradientColor1: string; // Inner / Center color
  gradientColor2: string; // Outer / Edge color
  imageUrl: string;
  imageBrightness: number; // -100 to +100, 0 is normal
}

export const DEFAULT_PAGE_BG: PageBackgroundConfig = {
  type: 'none',
  gradientColor1: '#3b1d54',
  gradientColor2: '#0f0717',
  imageUrl: '',
  imageBrightness: 0,
};

export const usePageBackground = (pageKey: string) => {
  const storageKey = `alpaca_page_bg_${pageKey}`;

  const [bgConfig, setBgConfig] = useState<PageBackgroundConfig>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return { ...DEFAULT_PAGE_BG, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_PAGE_BG;
  });

  const saveBgConfig = (newConfig: PageBackgroundConfig) => {
    setBgConfig(newConfig);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newConfig));
      // Dispatch storage event so tabs sync
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Failed to save page background configuration', e);
    }
  };

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setBgConfig({ ...DEFAULT_PAGE_BG, ...JSON.parse(saved) });
        } else {
          setBgConfig(DEFAULT_PAGE_BG);
        }
      } catch {
        // fallback
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [storageKey]);

  return { bgConfig, saveBgConfig, setBgConfig };
};

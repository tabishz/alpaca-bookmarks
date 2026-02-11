import { useState, useEffect } from 'react';

export type Theme = 'dracula' | 'andromeda' | 'github-dark' | 'synthwave' | 'cute-pink' | 'snazzy-light';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('app_theme');
    return (saved as Theme) || 'dracula';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  return { theme, setTheme };
};

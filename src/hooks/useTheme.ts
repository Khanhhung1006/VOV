import { useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';

export function useTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'light' || saved === 'dark' || saved === 'auto') ? saved : 'dark';
  });

  const [activeTheme, setActiveTheme] = useState<'light' | 'dark'>('dark');

  // Handle active theme logic based on time
  useEffect(() => {
    const updateActiveTheme = () => {
      if (themeMode === 'auto') {
        const hour = new Date().getHours();
        const isDaytime = hour >= 6 && hour < 18;
        setActiveTheme(isDaytime ? 'light' : 'dark');
      } else {
        setActiveTheme(themeMode);
      }
    };

    updateActiveTheme();

    let intervalId: NodeJS.Timeout | undefined;
    if (themeMode === 'auto') {
      // Check every minute if we need to switch theme
      intervalId = setInterval(updateActiveTheme, 60000);
    }

    localStorage.setItem('theme', themeMode);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [themeMode]);

  // Apply to DOM
  useEffect(() => {
    const root = window.document.documentElement;
    if (activeTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [activeTheme]);

  return { theme: themeMode, setTheme: setThemeMode };
}

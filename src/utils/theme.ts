export type ThemeName = 'default' | 'dark-alt';

const THEME_STORAGE_KEY = 'theme';

/**
 * Aktiviert die gewünschte Farbpalette, indem die passende Theme-Klasse
 * bzw. das data-Attribut am Root-Element gesetzt wird. Alle Komponenten
 * beziehen Farben über CSS-Variablen, deshalb reicht das Umschalten der
 * Klasse, um die Palette zu wechseln.
 */
export const applyTheme = (theme: ThemeName): void => {
  const root = document.documentElement;

  if (theme === 'dark-alt') {
    root.classList.add('theme-dark-alt');
    root.setAttribute('data-theme', 'dark-alt');
    return;
  }

  root.classList.remove('theme-dark-alt');
  root.removeAttribute('data-theme');
};

export const setTheme = (theme: ThemeName): void => {
  applyTheme(theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
};

export const getStoredTheme = (): ThemeName | null => {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'dark-alt' || stored === 'default' ? stored : null;
};

export const resolveInitialTheme = (): ThemeName => {
  const storedTheme = getStoredTheme();

  if (storedTheme) {
    return storedTheme;
  }

  const prefersDarkAlt = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDarkAlt ? 'dark-alt' : 'default';
};

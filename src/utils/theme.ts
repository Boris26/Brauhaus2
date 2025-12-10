export type ThemeName = 'default' | 'dark-alt';

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

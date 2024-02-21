import { useAtom } from 'jotai'
import { darkModeAtom } from '@/atoms/themeAtom';
import { useEffect } from 'react';
import { Theme } from '@carbon/react';

export default function ForgeTheme({children}) {
  const [darkMode, setDarkMode] = useAtom(darkModeAtom)
  const theme = darkMode ? 'g100' : 'g10'

  // Adds transition state and removes it on the HTML base
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let html = document.querySelector('body');
      html.classList.add('theme-mode-transition');
      setTimeout(() => {
        html.classList.remove('theme-mode-transition');
      }, 200);
    }
  }, [theme])

  // Binds to the `prefers-color-scheme` system change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', () => setDarkMode(true));
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('change', () => setDarkMode(true))
      }
    }
  }, []);

  return (
    <Theme theme={theme}>
      {children}
    </Theme>
  );
}
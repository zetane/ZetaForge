import { GlobalTheme, Theme } from '@carbon/react';
import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemePreferenceContext = createContext({
	theme: 'g10',
	setTheme: () => null,
});

export function useThemePreference() {
	return useContext(ThemePreferenceContext);
}

export function ThemePreference({ children }) {
	const [theme, setTheme] = useState('g10');
	const value = {
		theme,
		setTheme,
	};

	useEffect(() => {
		if (typeof window !== 'undefined') {
			const setPreferedColorScheme = () => {
				var html = document.querySelector('html');
				html.classList.add('theme-mode-transition');
				setTimeout(() => {
					html.classList.remove('theme-mode-transition');
				}, 200);
				if (
					localStorage.theme === 'g100' ||
					(!('theme' in localStorage) &&
						window.matchMedia('(prefers-color-scheme: dark)').matches)
				) {
					html.setAttribute('data-carbon-theme', 'g100');
					setTheme('g100');
				} else {
					html.setAttribute('data-carbon-theme', 'g10');
					setTheme('g10');
				}
			};

			window.addEventListener('storage', (event) => {
				setPreferedColorScheme();
			});
			window
				.matchMedia('(prefers-color-scheme: dark)')
				.addEventListener('change', (event) => {
					setPreferedColorScheme();
				});
			setPreferedColorScheme();
		}
	}, [theme]);

	return (
		<main>
			<ThemePreferenceContext.Provider value={value}>
				<Theme theme={theme}>{children}</Theme>
			</ThemePreferenceContext.Provider>
		</main>
	);
}

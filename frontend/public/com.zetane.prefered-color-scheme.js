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
	} else {
		html.setAttribute('data-carbon-theme', 'g10');
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

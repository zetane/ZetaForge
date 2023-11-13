import { ThemePreference } from '@/components/ThemePreference';
import '@/styles/globals.scss';
import {
	Button,
	Content,
	Header,
	HeaderName,
	SkipToContent,
	Theme,
} from '@carbon/react';

export default function App({ Component, pageProps }) {
	return (
		<ThemePreference>
			<Theme
				theme={'g100'}
				as={Header}
				aria-label='Zetaforge'>
				<Header aria-label='Zetaforge'>
					<SkipToContent />
					<HeaderName
						prefix=''
						className='select-none'>
						Zetaforge
					</HeaderName>
				</Header>
			</Theme>
			<div className='absolute top-0 pt-[5rem] w-screen h-screen px-8 pb-8'>
				<Component {...pageProps} />
			</div>
		</ThemePreference>
	);
}

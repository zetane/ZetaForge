import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
	return (
		<Html lang='en'>
			<Head>
				<script
					src='com.zetane.prefered-color-scheme.js'
					defer
				/>
				<meta
					name='theme-color'
					content='#161616'></meta>
			</Head>
			<body>
				<Main />
				<NextScript />
			</body>
		</Html>
	);
}

'use client';

import { useEffect } from 'react';

export default function Forge() {
	useEffect(() => {
		console.log(window);
		document.getElementById('forge').innerHTML = `hello`;
	}, []);

	return (
		<div>
			FORGE
			<div id='forge'></div>
		</div>
	);
}

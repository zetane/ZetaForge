//THIS IS THE IMPLEMENTATION OF getMAC() library, in
// nodejs: https://www.npmjs.com/package/getmac


import { networkInterfaces } from 'os'
import { exec } from 'child_process' 
const macRegex = /(?:[a-z0-9]{1,2}[:-]){5}[a-z0-9]{1,2}/i
const zeroRegex = /(?:[0]{1,2}[:-]){5}[0]{1,2}/


/**
 * Get the first proper MAC address
 * @param iface If provided, restrict MAC address fetching to this interface
 */
export default function getMAC(iface) {
	const list = networkInterfaces()
	if (iface) {
		const parts = list[iface]
		if (!parts) {
			throw new Error(`interface ${iface} was not found`)
		}
		for (const part of parts) {
			if (zeroRegex.test(part.mac) === false) {
				return [part.mac, '', parts]
			}
		}
		throw new Error(`interface ${iface} had no valid mac addresses`)
	} else {
		const sortedList = Object.entries(list).sort( ([keyA], [keyB]) => keyA.localeCompare(keyB))
		console.log(sortedList.length)
		console.log(sortedList)
		for (const [key, parts] of sortedList) {
			// for some reason beyond me, this is needed to satisfy typescript
			// fix https://github.com/bevry/getmac/issues/100
			if (!parts) continue
			for (const part of parts) {
				if (zeroRegex.test(part.mac) === false) {
					console.log("CHECK NETWORK NAME ", key)
					return [part.mac, key, part]
				}
			}
		}
	}
	throw new Error('failed to get the MAC address')
}
// const list = networkInterfaces()

// const sortedList = Object.entries(list).sort( ([keyA], [keyB]) => keyA.localeCompare(keyB))


// for (const [key, parts] of sortedList) {
// 	console.log(key)
// 	for(const part of parts) {
// 		console.log(part)
// 	}
// }

/** Check if the input is a valid MAC address */
export function isMAC(macAddress) {
	return macRegex.test(macAddress)
}

getMAC()
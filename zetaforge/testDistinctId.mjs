import { networkInterfaces } from 'os'
import sha256 from "sha256";

const macRegex = /(?:[a-z0-9]{1,2}[:-]){5}[a-z0-9]{1,2}/i
const zeroRegex = /(?:[0]{1,2}[:-]){5}[0]{1,2}/

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
		for (const [key, parts] of Object.entries(list)) {
			// for some reason beyond me, this is needed to satisfy typescript
			// fix https://github.com/bevry/getmac/issues/100
			
			if (!parts) continue
			for (const part of parts) {
				if (zeroRegex.test(part.mac) === false) {
					return [part.mac, key, part]
				}
			}
		}
	}
	throw new Error('failed to get the MAC address')
}

const result = getMAC()

let iface = undefined
if(process.argv.length > 2) {
	iface = process.argv[2];
}

try {
	let result = getMAC(iface)
	
	const [macAddress, key, part] = getMAC(iface);
	let macAsBigInt = BigInt(`0x${macAddress.split(":").join("")}`);

	// Check if the MAC address is universally administered
	const isUniversallyAdministered =
	  (macAsBigInt & BigInt(0x020000000000)) === BigInt(0);

	// If not universally administered, set the multicast bit
	if (!isUniversallyAdministered) {
	  macAsBigInt |= BigInt(0x010000000000);
	}
	
	const distinctId = sha256(macAsBigInt.toString());
	
	result = [...result, macAsBigInt.toString(), distinctId]
	console.log(JSON.stringify(result))
  } catch (error) {
	console.log(
	  "Can't generate distinct_id for mixpanel. Using default distinct_id",
	);
	console.log(error);
  }
// console.log(JSON.stringify(result))
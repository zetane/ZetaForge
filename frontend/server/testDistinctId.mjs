import { networkInterfaces } from 'os'
import sha256 from "sha256";
import getMAC from "./getMac.mjs"

const macRegex = /(?:[a-z0-9]{1,2}[:-]){5}[a-z0-9]{1,2}/i
const zeroRegex = /(?:[0]{1,2}[:-]){5}[0]{1,2}/



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
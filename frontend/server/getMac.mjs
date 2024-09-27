//THIS IS THE IMPLEMENTATION OF getMAC() library, in
// nodejs: https://www.npmjs.com/package/getmac


import { networkInterfaces } from 'os'
import { exec } from 'child_process' 
import si from "systeminformation"

const macRegex = /(?:[a-z0-9]{1,2}[:-]){5}[a-z0-9]{1,2}/i
const zeroRegex = /(?:[0]{1,2}[:-]){5}[0]{1,2}/


/**
 * Get the first proper MAC address
 * @param iface If provided, restrict MAC address fetching to this interface
 */
export default async function getMAC(iface) {
	const list = await si.networkInterfaces()
	
		
	const sortedList = list.sort((a,b) => a.ifaceName.localeCompare(b.ifaceName))
		

	for(iface of sortedList) {
		if(zeroRegex.test(iface.mac) === false && iface.mac !== "") {
			return [iface.mac, iface.ifaceName] 
		}
		
	}
	throw new Error('failed to get the MAC address')
}


/** Check if the input is a valid MAC address */
export function isMAC(macAddress) {
	return macRegex.test(macAddress)
}

// getMAC()
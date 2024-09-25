import { networkInterfaces } from 'os'
import {findalldevs} from 'pcap'

const list = networkInterfaces({all: 'true'})

// console.log(findalldevs())
console.log(list)
console.log(Object.keys(list).length)
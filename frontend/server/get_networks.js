import { networkInterfaces } from 'os'
import {findalldevs} from 'pcap'
import shell from "shelljs"
import si from "systeminformation"


const list = networkInterfaces({all: 'true'})

// console.log(si.networkInterfaces())

si.networkInterfaces( (ifaces) => {
    console.log(ifaces)
    console.log(ifaces.length)
})


// shell.ls("/sys/class/net")
// // console.log(findalldevs())
// // console.log(list)
// // console.log(Object.keys(list).length)
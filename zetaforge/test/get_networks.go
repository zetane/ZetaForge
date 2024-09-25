package main

import (
    "fmt"
    "net"
)

func main() {
    ifaces, err := net.Interfaces()
    if err != nil {
        fmt.Println("Error:", err)
        return
    }

    // Slice to store interfaces with assigned addresses
    var interfacesWithAddresses []net.Interface

    for _, iface := range ifaces {
        // Retrieve addresses associated with the interface
        addrs, err := iface.Addrs()
        if err != nil {
            fmt.Println("Error fetching addresses for", iface.Name, ":", err)
            continue
        }

        // If the interface has addresses, add it to the list
        if len(addrs) > 0 {
            interfacesWithAddresses = append(interfacesWithAddresses, iface)
        }
    }

    // Print interfaces that have assigned addresses
    fmt.Println("Interfaces with assigned addresses:")
	var i = 0
    for _, iface := range interfacesWithAddresses {
        i = i + 1
		fmt.Printf("Name: %s, HardwareAddr: %s\n", iface.Name, iface.HardwareAddr)
        addrs, _ := iface.Addrs()
        for _, addr := range addrs {
            fmt.Printf("  Address: %v\n", addr)
        }
    }
	fmt.Println(i)
}
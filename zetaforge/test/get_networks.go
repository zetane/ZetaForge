package main
import (
	"net"
	"fmt"
)


func main() {
	ifaces, _ := net.Interfaces()
	for _, iface := range ifaces {
		fmt.Printf("Name: %s, HardwareAddr: %s, Flags: %v\n", iface.Name, iface.HardwareAddr, iface.Flags)
	}
}
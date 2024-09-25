package main

import (
	"net"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"log"
	"math/big"
	"flag"
	"sort"

)


func generateDistinctID(iface ...string) string {
	var macInt *big.Int
	var err error
	
	if(len(iface) > 0) {
		_, macInt, err = getMACAddress(iface[0])
	} else {
		_, macInt, err = getMACAddress()
	}

	if err != nil {
		log.Printf("Mixpanel error; err=%v", err)
	}

	macAsString := macInt.String()
	hash := sha256.New()
	hash.Write([]byte(macAsString))
	hashedResult := hash.Sum(nil)
	distinctID := hex.EncodeToString(hashedResult)
	return distinctID
}

func macAddressToDecimal(mac string) (*big.Int, error) {
	// Remove colons from the MAC address
	macWithoutColons := strings.ReplaceAll(mac, ":", "")

	// Convert MAC address string to big.Int
	macAsBigInt, success := new(big.Int).SetString(macWithoutColons, 16)
	if !success {
		return nil, fmt.Errorf("failed to convert MAC to big.Int")
	}

	// Check if the MAC address is universally administered (bit 1 of first byte is 0)
	universallyAdministered := new(big.Int).And(macAsBigInt, big.NewInt(0x020000000000)).Cmp(big.NewInt(0)) == 0

	// If not universally administered, set the multicast bit
	if !universallyAdministered {
		macAsBigInt.Or(macAsBigInt, big.NewInt(0x010000000000))
	}

	return macAsBigInt, nil
}


func getMACAddress(ifaceName ...string) (string, *big.Int, error) {
	// return value: MAC address of the device as a string and a big.Int. In the case of failure, returns zero as big.Int.
	var ifaceToCheck *net.Interface
	var err error

	if len(ifaceName) > 0 {
		// Check if a specific interface name was passed
		ifaceToCheck, err = net.InterfaceByName(ifaceName[0])
		if err != nil {
			return "", nil, fmt.Errorf("could not find interface %s: %v", ifaceName[0], err)
		}
		// Ensure the interface has a hardware address
		if len(ifaceToCheck.HardwareAddr) == 0 {
			return "", nil, fmt.Errorf("no MAC address found for interface %s", ifaceName[0])
		}
		macAddress := ifaceToCheck.HardwareAddr.String()
		macInt, err := macAddressToDecimal(macAddress)
		if err != nil {
			return "", nil, err
		}
		return macAddress, macInt, nil
	}

	// If no specific interface is passed, continue with the default behavior
	interfaces, err := net.Interfaces()
	if err != nil {
		return "", nil, err
	}
	
	sort.Slice(interfaces, func(i, j int) bool {
		return interfaces[i].Name < interfaces[j].Name
	})
    var interfacesWithAddresses []net.Interface


	for _, iface := range interfaces {
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

	sort.Slice(interfacesWithAddresses, func(i, j int) bool {
		return interfacesWithAddresses[i].Name < interfacesWithAddresses[j].Name
	})

	// Find the first non-loopback interface with a hardware address
	for _, iface := range interfacesWithAddresses {
		if iface.Flags&net.FlagLoopback == 0 && len(iface.HardwareAddr) > 0 {
			macAddress := iface.HardwareAddr.String()
			macInt, err := macAddressToDecimal(macAddress)
			if err != nil {
				return "", nil, err
			}
			return macAddress, macInt, nil
		}
	}

	return "", new(big.Int).SetInt64(0), fmt.Errorf("unable to determine distinct_id, using default distinct_id")
}


func main() {
	ifaceName := flag.String("iface", "", "Name of the network interface (optional)")

	// Parse the command-line arguments
	flag.Parse()

	if *ifaceName != "" {
		_, macInt, _ := getMACAddress(*ifaceName)
		fmt.Println(macInt)
		fmt.Println(generateDistinctID(*ifaceName))
	} else {
		_, macInt, _  := getMACAddress()
		fmt.Println(macInt)
		fmt.Println(generateDistinctID())
	}


	

}
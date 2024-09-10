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
	macWithoutColons := strings.ReplaceAll(mac, ":", "")

	macBytes, err := hex.DecodeString(macWithoutColons)
	if err != nil {
		return nil, err
	}

	// Convert the byte slice to a BigInt
	macAsBigInt := new(big.Int).SetBytes(macBytes)

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

	// Find the first non-loopback interface with a hardware address
	for _, iface := range interfaces {
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


	// _, mac, _ := getMACAddress()
	// fmt.Println(mac.String())
	// fmt.Println(generateDistinctID())

	// _, mac_iface, _ := getMACAddress("en0")
	// fmt.Println(mac_iface)

}
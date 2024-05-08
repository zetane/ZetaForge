package main

import ("math/big"
"net"
"context"
"strings"
"os"
"crypto/sha256"
"encoding/hex"
"encoding/json"
"fmt"
"log"
"github.com/kaganAtZetane/mixpanel-go"
"runtime"
)



func generateDistinctID() (string) {
	_, macInt, err := getMACAddress()
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

func getMACAddress() (string, *big.Int, error) {

	// return value: big Int, which is MAC address of the device. In the case of Failure, we return zero, as big Int.

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

	return "", new(big.Int).SetInt64(int64(0)), fmt.Errorf("unable to determine distinct_id, using default distinct_id")
}



type MixpanelJsonConfig struct {
	ZetaforgeIsDev bool  `json:"ZetaforgeIsDev"`
}

type MixpanelClient struct{
	Client 	*mixpanel.ApiClient
	DistinctID string
	Token string
	Enabled bool
	IsDev bool
}

func InitMixpanelClient(token string, ctx context.Context) *MixpanelClient {
	client := mixpanel.NewApiClient(token)
	file, err := os.ReadFile("config.json")
	
	var isDev bool
	var enabled bool
	if err != nil {
		//theoratically, the code should never reach at this statement, since long before, a lack of config.json will throw an exception
        fmt.Println("Error opening file:", err)
        enabled = false
	}

	var raw map[string]json.RawMessage
	
    if err := json.Unmarshal(file, &raw); err != nil {
        log.Fatalf("Failed to parse JSON: %v", err)
		enabled = false
    }

	var mixpanelConfig MixpanelJsonConfig

	//if the field is not provided, then is_dev is set to be true
	if raw["ZetaforgeIsDev"] != nil {
        
        if err := json.Unmarshal(raw["ZetaforgeIsDev"], &isDev); err != nil {
            log.Fatalf("Failed to parse ZetaforgeIsDev field: %v", err)
        }
        mixpanelConfig.ZetaforgeIsDev = isDev
		//if the field is not provided in config.json, then we automatically set it to true
    } else {
        mixpanelConfig.ZetaforgeIsDev = true
    }


	
	distinctID := generateDistinctID()
	var mixpanelClient *MixpanelClient
	mixpanelClient = &MixpanelClient{
		Client: client,
		DistinctID: distinctID,
		Token: token,
		Enabled: enabled,
		IsDev: mixpanelConfig.ZetaforgeIsDev,
	}
	mixpanelClient.SetPeopleProperties(ctx,  map[string]any{ "$ip": 1})
	return mixpanelClient
}

func (m *MixpanelClient) SetPeopleProperties(ctx context.Context, userProperties map[string]any) error {
	if !m.Enabled {
		return nil
	}
	var finalProperties = make(map[string]any)

	os := runtime.GOOS
	if os == "darwin" {
		os = "Mac OS X"
	}

	for k,v := range userProperties {
		finalProperties[k] = v
	}
	finalProperties["$os"] = os

	user := mixpanel.NewPeopleProperties(m.DistinctID, finalProperties)
	err := m.Client.PeopleSet(ctx, []*mixpanel.PeopleProperties{user})
	if err != nil {
		log.Printf("Mixpanel error; err=%v", err)
		m.Enabled = false
	}
	return err
}


func (m *MixpanelClient) TrackEvent(ctx context.Context, eventName string, properties map[string]any) error {
	if !m.Enabled {
		return nil
	}
	var finalProperties = make(map[string]any)
	os := runtime.GOOS
	if os == "darwin" {
		os = "Mac OS X"
	}

	for k,v := range properties {
		finalProperties[k] = v
	}
	finalProperties["distinct_id"] = m.DistinctID
	finalProperties["$os"] = os
	finalProperties["is_dev"] = m.IsDev

	
	event := m.Client.NewEvent(eventName, m.DistinctID, finalProperties)
	err := m.Client.Track(ctx, []*mixpanel.Event{event})
	if err != nil {
		log.Printf("Mixpanel error; err=%v", err)
		m.Enabled = false
	}
	return err
}


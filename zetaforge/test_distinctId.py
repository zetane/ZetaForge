from my_uuid import getnode
import _uuid
from hashlib import sha256
import platform
import subprocess
import json
import unittest
from getmac import get_mac_address as built_in_mac
from pathlib import Path
from generate_distinct_id import get_mac as get_mac_py
import os
import psutil
node_path = Path(__file__).parent.parent / "frontend" / "server"
go_path = Path(__file__).parent / "test"
print("RUNNING FOR THE PLATFORM ", platform.system(), " WITH THE ARCHITECTURE ", platform.architecture())



def get_mac_and_distinctId_in_go(iface=None):

    try:
        if iface:
            result = subprocess.run(
                ["go", "run", "main.go", "--iface", iface],
                capture_output=True,
                text=True,
                check=True,
                cwd= go_path
            )
        else:
            result = subprocess.run(
                ["go", "run", "main.go"],
                capture_output=True,
                text=True,
                check=True,
                cwd= go_path)
            
        
        mac_data = result.stdout.splitlines()
       
        return mac_data
    except subprocess.CalledProcessError as e:
        print(f"Error running GO script: {e}")
        print(f"GO stderr: {e.stderr}")



def get_mac_address_in_node(iface=None):
    # Run the Node.js script using subprocess
    try:
        if iface:
            result = subprocess.run(
                ['node', 'testDistinctId.mjs', iface],  # Assuming getMAC.mjs is in the current directory
                capture_output=True,
                text=True,
                check=True,
                cwd= node_path
            )
        else:
            result = subprocess.run(
                ['node', 'testDistinctId.mjs'],  # Assuming getMAC.mjs is in the current directory
                capture_output=True,
                text=True,
                check=True,
                cwd=node_path
            )

        
        # print(result.stdout)
        # Parse the JSON output from the Node.js script
        print(result.stdout)
        mac_data = json.loads(result.stdout)
        
        return mac_data
    except subprocess.CalledProcessError as e:
        print(f"Error running Node.js script: {e}")
        print(f"Node.js stderr: {e.stderr}")


def mac_to_bigint(mac):
    # Remove colons and convert to a BigInt (integer in Python)
    mac_as_hex = mac.replace(":", "")
    mac_as_hex = mac_as_hex.replace("-", "")
    mac_as_hex = mac_as_hex.lower()

    return int(mac_as_hex, 16)

def is_universally_administered(mac_bigint):
    # Check if the MAC address is universally administered
    return (mac_bigint & 0x020000000000) == 0

def set_multicast_bit(mac_bigint):
    # Set the multicast bit if it's not universally administered
    return mac_bigint | 0x010000000000

def sha256_hash(value):
    # Generate SHA-256 hash from the integer value
    return sha256(value.encode()).hexdigest()

def get_mac_adddress_python_lib(iface=None, func=built_in_mac):    
    # mac = func(iface=iface)
    # if(type(mac) == list):
    #     mac = mac[0]
    mac = None
    if func.__name__ == 'get_mac':
        mac = func(iface=iface)[0]
    else:
        mac = func(interface=iface)
    

    mac_as_bigint = mac_to_bigint(mac)
    # Check if the MAC address is universally administered
    if not is_universally_administered(mac_as_bigint):
        # Set the multicast bit
        mac_as_bigint = set_multicast_bit(mac_as_bigint)

    return mac_as_bigint
    # Convert the MAC BigInt to a string and generate the SHA-256 hash
    distinct_id = sha256_hash(str(mac_as_bigint))
    return distinct_id


class TESTMACAddressWithPythonLibrary(unittest.TestCase):
    
    
    def test_python_implementation(self):
        iface = None
        # pyiface = None
        # if platform.system() == 'Darwin':
        #     iface = 'en0'
        # elif platform.system() == 'Windows':
        #     iface = 'Wi-Fi'
        #     pyiface = 'Ethernet'
        # elif platform.system() == 'Linux':
        #     iface = 'eth0'
        
        [mac_go, distinct_id_go] = get_mac_and_distinctId_in_go()
        
        mac_address_py = get_mac_adddress_python_lib(iface=iface, func=get_mac_py)
        [node_js_part_mac, _, networkinfo, MAC_address, distinct_id] = get_mac_address_in_node()

        print("MAC ADDRESS FOR NODEJS IS ", MAC_address)
        print("MAC ADDRESS FOR PYTHON IS", mac_address_py)
        print("MAC ADDRESS FOR GO IS ", mac_go)

        print("DISTINCT ID FOR NODEJS IS ", distinct_id)
        print("DISTINCT ID FOR PYTHON IS ", sha256(str(mac_address_py).encode() ).hexdigest())
        print("DISTINCT ID FOR GO IS ", distinct_id_go)
        self.assertEqual(MAC_address, str(mac_address_py), "MAC ADDRESSES MUST BE EQUAL")
        self.assertEqual(MAC_address, mac_go)
        
        self.assertEqual(distinct_id, sha256(str(mac_address_py).encode() ).hexdigest(), "MAC ADDRESSES MUST BE EQUAL")
        self.assertEqual(distinct_id, distinct_id_go)


        


        











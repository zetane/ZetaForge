from my_uuid import getnode
import _uuid
from hashlib import sha256
import platform
import subprocess
import json
import unittest
from getmac import get_mac_address as built_in_mac
from pathlib import Path
import os

node_path = Path(__file__).parent.parent / "frontend" / "server"
go_path = Path(__file__).parent / "test"
print(go_path)

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
        print("CHECK MAC DATA")
        print(result.stdout)
        mac_data = json.loads(result.stdout)
        
        return mac_data
    except subprocess.CalledProcessError as e:
        print(f"Error running Node.js script: {e}")
        print(f"Node.js stderr: {e.stderr}")


def mac_to_bigint(mac):
    # Remove colons and convert to a BigInt (integer in Python)
    mac_as_hex = mac.replace(":", "")
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

def get_mac_adddress_python_lib(iface=None):    
    mac = built_in_mac(interface=iface)
    mac_as_bigint = mac_to_bigint(mac)
    # Check if the MAC address is universally administered
    if not is_universally_administered(mac_as_bigint):
        # Set the multicast bit
        mac_as_bigint = set_multicast_bit(mac_as_bigint)

    return mac_as_bigint
    # Convert the MAC BigInt to a string and generate the SHA-256 hash
    distinct_id = sha256_hash(str(mac_as_bigint))
    return distinct_id

        
class TestMACAddress(unittest.TestCase):
    def test_mac_address(self):
        print("RUNNING FOR THE PLATFORM ", platform.system(), " WITH THE ARCHITECTURE ", platform.architecture())
        
        # Python part
        seed, getter = getnode()
        print("GETTER IN PYTHON LIBRARY FOR THE PLATFORM ", getter)
        print("MAC ADDRESS GENERATED IN PYTHON LIBRARY IS ", seed)
        
        distinct_id_py = sha256(str(seed).encode('utf-8')).hexdigest()
        print("FINAL DISTINCT ID IN PYTHON LIBRARY IS " + distinct_id_py)
        
        # Node.js part
        [node_js_part_mac, iface, networkinfo, MAC_address, distinct_id] = get_mac_address_in_node()
        
        print("MAC ADDDRESS(NOT BIG INT) IN PYTHON LIBRARY IS ", node_js_part_mac)
        print("IFACE FOR NODEJS IS", iface)
        print("NETWORK INFO IN NODEJS IS ", networkinfo)
        print("MAC AS BIG INT IN NODEJS IS", MAC_address)
        print("DISTINCT ID GENERATED IN NODEJS IS ", distinct_id)
        
        print("BUILT_IN GET MAC ADDRESS ", built_in_mac('en0'))
        # Unit tests to compare Python and Node.js results
        self.assertEqual(seed, int(MAC_address), "The seed in Python and MAC_address in Node.js should be equal")
        self.assertEqual(distinct_id_py, distinct_id, "The distinct_id in Python and Node.js should be equal")



class TESTMACAddressWithPythonLibrary(unittest.TestCase):
    def test_libraries(self):
        mac_address_py = get_mac_adddress_python_lib()
        [mac_go, distinct_id_go] = get_mac_and_distinctId_in_go()
        [node_js_part_mac, iface, networkinfo, MAC_address, distinct_id] = get_mac_address_in_node()

        self.assertEqual(MAC_address, str(mac_address_py))
        self.assertEqual(MAC_address, mac_go)

        self.assertEqual(distinct_id, sha256(str(mac_address_py).encode() ).hexdigest())
        self.assertEqual(distinct_id, distinct_id_go)
    def test_libraries_with_interface(self):
        iface = None
        pyiface = None
        if platform.system() == 'Darwin':
            iface = 'en0'
        elif platform.system() == 'Windows':
            iface = 'WiFi'
            pyiface = 'Ethernet'
        elif platform.system() == 'Linux':
            iface = 'eth0'
        
        [mac_go, distinct_id_go] = get_mac_and_distinctId_in_go(iface=iface)

        #if fails in windows, try with pyiface
        #windows error, even with pyiface
        mac_address_py = get_mac_adddress_python_lib(iface=iface)

        #windows error with iface
        [node_js_part_mac, iface, networkinfo, MAC_address, distinct_id] = get_mac_address_in_node(iface=iface)
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


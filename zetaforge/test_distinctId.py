from my_uuid import getnode
import _uuid
from hashlib import sha256
import platform
import subprocess
import json
import unittest

def get_mac_address():
    # Run the Node.js script using subprocess
    try:
        result = subprocess.run(
            ['node', 'testDistinctId.mjs'],  # Assuming getMAC.mjs is in the current directory
            capture_output=True,
            text=True,
            check=True
        )
        
        print(result.stdout)
        # Parse the JSON output from the Node.js script
        mac_data = json.loads(result.stdout)
        return mac_data
    except subprocess.CalledProcessError as e:
        print(f"Error running Node.js script: {e}")
        print(f"Node.js stderr: {e.stderr}")
        
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
        [node_js_part_mac, iface, networkinfo, MAC_address, distinct_id] = get_mac_address()
        
        print("MAC ADDDRESS(NOT BIG INT) IN PYTHON LIBRARY IS ", node_js_part_mac)
        print("IFACE FOR NODEJS IS", iface)
        print("NETWORK INFO IN NODEJS IS ", networkinfo)
        print("MAC AS BIG INT IN NODEJS IS", MAC_address)
        print("DISTINCT ID GENERATED IN NODEJS IS ", distinct_id)
        
        # Unit tests to compare Python and Node.js results
        self.assertEqual(seed, int(MAC_address), "The seed in Python and MAC_address in Node.js should be equal")
        self.assertEqual(distinct_id_py, distinct_id, "The distinct_id in Python and Node.js should be equal")

# print("RUNNING FOR THE PLATFORM ",  platform.system(), " WITH THE ARCHITECTURE ",  platform.architecture())

# seed, getter = getnode()

# print("GETTER IN PYTHON LIBRARY FOR THE PLATFORM ", )

# print("MAC ADDRESS GENERATED IN PYTHON LIBRARY IS ", seed)

# distinct_id_py = sha256(str(seed).encode('utf-8')).hexdigest()

# print("FINAL DISTINCT ID IN PYTHON LIBRARY IS " + distinct_id_py)

# [node_js_part_mac, iface, networkinfo, MAC_address, distinct_id] = get_mac_address()




# print("MAC ADDDRESS(NOT BIG INT) IN PYTHON LIBRARY IS ", node_js_part_mac)
# print("IFACE FOR NODEJS IS", iface)
# print("NETWORK INFO IN NODEJS IS ", networkinfo)
# print("MAC AS BIG INT IN NODEJS IS", MAC_address)
# print("DISTINCT ID GENERATED IN NODEJS IS ", distinct_id)
import re
import psutil
import socket

# Regex patterns to filter MAC addresses
mac_regex = re.compile(r"(?:[a-zA-Z0-9]{1,2}[:-]){5}[a-zA-Z0-9]{1,2}")
zero_regex = re.compile(r"(?:[0]{1,2}[:-]){5}[0]{1,2}")
interfaces = psutil.net_if_addrs()

# sorted_interfaces = dict(sorted(interfaces.items(), key=lambda item: item[0]))
# for key, addrs in sorted_interfaces.items():
#         print(key)
#         # print(addrs)
#         for add in addrs:
            
#             print("ADDRESS FOR KEY ", key, " is " , add.address)
#             print("FAMILY ", add.family)


def get_mac(iface=None):
    interfaces = psutil.net_if_addrs()
    interfaces_with_addresses = dict()

# Iterate through the interfaces
    for iface_name, iface_addresses in interfaces.items():
        # Check if there are any addresses assigned to the interface
        # print(len(iface_addresses))
        for add in iface_addresses:
            print(add.address)

        has_address = any(addr.family in (socket.AF_INET, socket.AF_INET6) and addr.address for addr in iface_addresses)

        if has_address:
            interfaces_with_addresses[iface_name] = iface_addresses
    
    print("CHECK LEN")
    print(len(interfaces_with_addresses))
    
    sorted_interfaces = dict(sorted(interfaces_with_addresses.items(), key=lambda item: item[0]))
    # print("CHECK LEN")
    # print(len(sorted_interfaces))
    # print(interfaces)
    # If a specific interface is provided
    if iface:
        if iface not in interfaces:
            raise ValueError(f"Interface {iface} was not found")
        
        for addr in interfaces[iface]:
            if addr.family == psutil.AF_LINK and not zero_regex.match(addr.address):
                return [addr.address, iface, interfaces[iface]]
        raise ValueError(f"Interface {iface} had no valid MAC addresses")
    
    # If no interface is provided, iterate over all interfaces
    for key, addrs in sorted_interfaces.items():
        
        for addr in addrs:
            if addr.family == psutil.AF_LINK and not zero_regex.match(addr.address):
                print("CHECK RETURN VALUES")
                print(key)
                print(addr.address)

                return [addr.address, key, addrs]
    
    # If no valid MAC address is found
    raise ValueError('Failed to get the MAC address')





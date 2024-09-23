import re
import psutil


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
    sorted_interfaces = dict(sorted(interfaces.items(), key=lambda item: item[0]))

    # print(interfaces)
    # If a specific interface is provided
    if iface:
        print("SHOULDNT BE HERE")
        if iface not in interfaces:
            raise ValueError(f"Interface {iface} was not found")
        
        for addr in interfaces[iface]:
            if addr.family == psutil.AF_LINK and not zero_regex.match(addr.address):
                return [addr.address, iface, interfaces[iface]]
        raise ValueError(f"Interface {iface} had no valid MAC addresses")
    
    # If no interface is provided, iterate over all interfaces
    print(sorted_interfaces.items())
    for key, addrs in sorted_interfaces.items():
        
        for addr in addrs:
            if addr.family == psutil.AF_LINK and not zero_regex.match(addr.address):
                print("CHECK RETURN VALUES")
                print(key)
                print(addr.address)

                return [addr.address, key, addrs]
    
    # If no valid MAC address is found
    raise ValueError('Failed to get the MAC address')




get_mac()
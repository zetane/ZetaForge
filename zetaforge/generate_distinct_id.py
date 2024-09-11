import re
import psutil


# Regex patterns to filter MAC addresses
mac_regex = re.compile(r"(?:[a-zA-Z0-9]{1,2}[:-]){5}[a-zA-Z0-9]{1,2}")
zero_regex = re.compile(r"(?:[0]{1,2}[:-]){5}[0]{1,2}")

def get_mac(iface=None):
    interfaces = psutil.net_if_addrs()
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
    for key, addrs in interfaces.items():
        for addr in addrs:
            if addr.family == psutil.AF_LINK and not zero_regex.match(addr.address):
                return [addr.address, key, addrs]
    
    # If no valid MAC address is found
    raise ValueError('Failed to get the MAC address')




import requests


def compute(endpoint,authtoken):

    get_requests = [
        "v1/campaigns", 
        "v1/campaigns/{campaignId}", 
        "v1/campaigns/{campaignId}/budget", 
        "v1/campaigns/{campaignId}/jobCount", 
        "v1/campaigns/{campaignId}/properties"  
    ]

    post_requests = [
        "v1/campaigns"
    ]

    patch_requests = [
        "v1/campaigns/{campaignId}", 
        "v1/campaigns/{campaignId}/budget"
    ]


    url = f"https://apis.indeed.com/{endpoint}"

    headers = {
        'Authorization': f'Bearer {authtoken}',
        'Content-Type': 'application/json'
    }

    response = "Hello World"

    # Check request type and perform the corresponding request
    if endpoint in get_requests:
        response = requests.get(url, headers=headers)
    elif endpoint in post_requests:
        response = requests.post(url, headers=headers)
    elif endpoint in patch_requests:
        response = requests.put(url, headers=headers)
    else:
        return "Endpoint not recognized or unsupported."
    
    print("final: ", response.text)


    # Check if the request was successful
    # if response.status_code == 200:
    #     return {'final' : response.text}  # Return the response body as text
    # else:
    #     return {'final' : {response.status_code} - {response.text}}
    
    return {'final': response.text}

def test():
    """Test the compute function."""
    endpoint = "v1/campaigns"  # User's requested endpoint
    authtoken = "your_authtoken_here"  # Example OAuth token

    final = compute(endpoint, authtoken)
    print(final)
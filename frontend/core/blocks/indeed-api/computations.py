import requests
import json
import re

def get_access_token(client_id : str , secret : str) -> str:
    url = "https://apis.indeed.com/oauth/v2/tokens"
    payload = f'grant_type=client_credentials&client_id={client_id}&client_secret={secret}&scope=employer_access employer.advertising.campaign.read employer.advertising.account.read'
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    }

    response = requests.request("POST", url, headers=headers, data=payload)

    print("RESPONSE: ", response.json())

    if 'access_token' not in response.json():
        raise Exception("Error getting access token: ", response.json())
    return response.json()['access_token']
                                                      

def compute(endpoint : str , client_id : str , secret : str):
    endpoint = endpoint.strip('"')

    if "|" in endpoint: # body is provided and the delimeter is "|"
        endpoint, body = endpoint.split("|", 1)
        # print("BODY: ", body)
        # print("typeof body: ", type(body))
        
        body = re.sub(r'(\w+)(?=\s*:)', r'"\1"', body)

        body = re.sub(r':\s*([^"\d{[].*?)(?=[,}])', r': "\1"', body)
        
        try:
            body = json.loads(body)
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON: {e}")
            body = None
    else:
        body = None

    access_token = None
    try:
        access_token = get_access_token(client_id.strip('"'), secret.strip('"'))
    except Exception as e:
        return {"response" : str(e)}
    
    req_type = endpoint.split(':')[0].lower()
    path = endpoint.split(':')[1].lower()
    
    url = f"https://apis.indeed.com/{path}"
    # url = f"http://host.docker.internal:3000/{path}" # for local testing server running at localhost:3000

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    
    response = None

    print("posting request to: ", url)
    print("Body: " , body)

    if req_type in ['get', 'g']:
        response = requests.get(url, headers=headers , json=body)
    elif req_type in ['post', 'p']:
        response = requests.post(url, headers=headers , json=body)
    elif req_type in ['patch', 'p']:
        response = requests.patch(url, headers=headers , json=body)
    
    if response is None:
        response = "EMPTY RESPONSE" #just to keep it constent with string return type
    elif response.status_code == 403:
        response = {"error": "Forbidden", "details": response.text}
    elif response.status_code != 200:
        response = json.dumps({"error": "Error", "details": response.text , "status_code": response.status_code})

    try:
        response = response.json()
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}")
        return {'response': response}
    except Exception as e:
        print(f"Error: {e}")
        return {'response': response}
    
    return {'response': response}


def test():
    """Test the compute function."""
    endpoint = '"v1/campaigns"'  # Example with extra quotes
    client_id = '"client_id"'
    secret = '"secret"'

    response = compute(endpoint, client_id=client_id, secret=secret)
    print(response)
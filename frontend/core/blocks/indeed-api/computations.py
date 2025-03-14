import requests
import json
import re

def get_access_token(client_id : str , secret : str) -> str:
    """
    The function sends a POST request to retrieve an access token using client
    credentials for Indeed API authentication.

    Args:
        client_id (str): client_id from indeed

        secret (str): secret from indeed

    Raises:
        Exception: if getting access token fails

    Returns:
        str: the access token.
    """
    url = "https://apis.indeed.com/oauth/v2/tokens"
    payload = f'grant_type=client_credentials&client_id={client_id}&client_secret={secret}&scope=employer_access'
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
    }

    response = requests.request("POST" , url , headers = headers , data = payload)

    print("RESPONSE from get_access_token: " , response.json())

    if 'access_token' not in response.json():
        raise Exception("Error getting access token: " , response.json())
    return response.json()['access_token']



def get_emloyers(access_token : str) -> json:
    """
    This sends a GET request to the Indeed API endpoint
    "https://secure.indeed.com/v2/api/appinfo" returns the JSON response.
    
    :param access_token: The `access_token` parameter is a string that represents the authorization
    token needed to access the Indeed API. This token is used to authenticate and authorize the user to
    make requests to the API on behalf of the user or application. It is typically obtained after the
    user or application is authenticated and granted access to
    :type access_token: str
    :return: The function `get_emloyers` makes a GET request to the specified URL with the provided
    access token in the headers. It then prints the JSON response and returns the JSON response data.

    Args:
        access_token (str): access_token from get_access_token function

    Returns:
        json: dict of employers details. Sample output: {
                                                            "employers": [
                                                                {
                                                                    "id": "ID",
                                                                    "name": "Hello World"
                                                                },
                                                                {
                                                                    "id": "ID 2",
                                                                    "name": "Hello World 2"
                                                                }
                                                            ]
                                                        }
    """
    url = "https://secure.indeed.com/v2/api/appinfo"
    headers = {
        'Authorization': f'Bearer {access_token}',
    }

    response = requests.request("GET" , url, headers=headers)

    print("RESPONSE from get_emloyers: " , response.json())
    return response.json()



def get_employer_access_token(client_id : str , secret : str , scope : str , employer_id : str) -> str:
    """The function sends a POST request to retrieve an access token using with right scope and right employer id.

    Args:
        client_id (str): the client_id from indeed
        secret (str): the secret from indeed
        scope (str): scope assigned dynamically based on the endpoint
        employer_id (str): the employer id from get_emloyers function

    Raises:
        Exception: if getting access token fails

    Returns:
        str: the access token.
    """
    url = "https://apis.indeed.com/oauth/v2/tokens"
    payload = f'grant_type=client_credentials&client_id={client_id}&client_secret={secret}&scope={scope}&employer={employer_id}'
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
    }

    response = requests.request("POST" , url , headers = headers , data = payload)

    print("RESPONSE: ", response.json())

    if 'access_token' not in response.json():
        raise Exception("Error getting access token: ", response.json())
    
    return response.json()['access_token']
                                                      

def compute(endpoint : str , client_id : str , secret : str):
    """
    The function takes in an endpoint, client ID, and secret, retrieves access tokens,
    determines access levels based on the endpoint, makes a request to the endpoint with the appropriate
    access token, and returns the response.

    Args:
        endpoint (str): endpoint to make the request to, e.g., "GET:v1/campaigns" , access would decide the type of request
        client_id (str): client ID from INDEED
        secret (str): secret from INDEED

    Returns:
        _type_: returns a dictionary containing the JSON response from the API
                request made to the specified endpoint using the provided client ID, secret, and access token. The
                response is formatted with an indentation of 4 spaces.
    """

    endpoint = endpoint.strip('"')

    access_token = get_access_token(client_id.strip('"') , secret.strip('"'))
    employers_details = get_emloyers(access_token)
    employer_id = employers_details["employers"][0]['id'] ## we can make it user input, still in query with Micah
    
    accesses = "employer_access"

    # Account Management:
    if(("budget" in endpoint) and ("accoount" in endpoint)):
        accesses += " employer.advertising.account"
    elif(("post" in endpoint or "POST" in endpoint) and "subaccounts" in endpoint):
        accesses += " employer.advertising.subaccount"
    elif("patch" in endpoint or "PATCH" in endpoint and "account/budget" in endpoint):
        accesses += " employer.advertising.account"
    elif("subaccount" in endpoint):
        accesses += " employer.advertising.subaccount.read"
    elif("account" in endpoint or "apiquotausage" in endpoint):
        accesses += " employer.advertising.account.read"


    # Campaign management:
    if(("post" in endpoint or "POST" in endpoint or "patch" in endpoint or "PATCH" in endpoint) and ("campaign" in endpoint)):
        accesses += " employer.advertising.campaign"
    elif(("campaign" in endpoint) and ("stats" not in endpoint)):
        accesses += " employer.advertising.campaign.read"
        

    # Report management
    if("stats" in endpoint):
        accesses += " employer.advertising.campaign_report.read"

    ## tested against all the endpoints in the documentation

    print("Accesses : " , accesses)

    employer_access_token = get_employer_access_token(client_id.strip('"') , secret.strip('"') , accesses , employer_id)

    
    if "|" in endpoint: # body is provided and the delimeter is "|"
        endpoint , body = endpoint.split("|" , 1)
        # print("BODY: ", body)
        # print("typeof body: ", type(body))
        
        body = re.sub(r'(\w+)(?=\s*:)' , r'"\1"' , body)

        body = re.sub(r':\s*([^"\d{[].*?)(?=[,}])' , r': "\1"' , body)
        
        try:
            body = json.loads(body)
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON: {e}")
            body = None
    else:
        body = None
    
    req_type = endpoint.split(':')[0].lower()
    path = endpoint.split(':')[1].lower()
    
    url = f"https://apis.indeed.com/ads/{path}"
    # url = f"http://host.docker.internal:3000/{path}" # for local testing server running at localhost:3000

    headers = {
        'Authorization': f'Bearer {employer_access_token}',
    }

    response = None

    print("posting request to: ", url)
    print("Body: " , body)

    if req_type in ['get' , 'g']:
        response = requests.get(url , headers = headers , json = body)
    elif req_type in ['post' , 'p']:
        response = requests.post(url , headers = headers , json = body)
    elif req_type in ['patch' , 'p']:
        response = requests.patch(url , headers = headers , json = body)

    print("type of RESPONSE: " , type(response))
    
    if response is None:
        response = {"error" : "EMPTY RESPONSE"}
    
    print("RESPONSE: ", response)

    return {'response': json.dumps(response.json() , indent = 4)}



def test():
    """Test the compute function."""
    endpoint = '"v1/campaigns"'  # Example with extra quotes
    client_id = '"client_id"'
    secret = '"secret"'

    response = compute(endpoint , client_id = client_id , secret = secret)
    print(response)
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import os

# If modifying these SCOPES, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

def authenticate():
    """Authenticate the user via Google OAuth2.

    This function handles the authentication process for Google APIs,
    retrieving or refreshing the access tokens.

    Returns:
        creds: Credentials object with authorized user data.
    """
    creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first time.
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    return creds


def compute(item_type):
    """Fetches files or folders from Google Drive based on item type.

    Inputs:
        item_type (str): The type of items to fetch from Google Drive, can be either 'files' or 'folders'.

    Outputs:
        result_list (list): A list of dictionaries containing 'name' and 'id' of the items fetched from Google Drive.
        item_type (str): The type of items fetched, either 'files' or 'folders'.

    Requirements:
        Authenticated access to Google Drive API.
    """
    creds = authenticate()
    service = build('drive', 'v3', credentials=creds)
    
    # Set the query based on item_type
    if item_type == 'files':
        query = "mimeType != 'application/vnd.google-apps.folder'"
    elif item_type == 'folders':
        query = "mimeType = 'application/vnd.google-apps.folder'"
    else:
        raise ValueError("Invalid item type. Use 'files' or 'folders'.")
    
    # Fetch the list of items (files or folders) in the user's Google Drive
    results = service.files().list(q=query, pageSize=10, fields="files(id, name)").execute()
    items = results.get('files', [])

    result_list = []
    if items:
        # Create a list of item names and their IDs
        for item in items:
            result_list.append({"name": item['name'], "id": item['id']})
    
    return {"result_list": result_list, "item_type": item_type}


def test():
    """Test the compute function."""

    print("Running test")

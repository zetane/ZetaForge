import requests
import pandas as pd
import json
import os

def fetch_schema(api_url, api_key, introspection_query):
    """Fetch the schema from the StackAdapt GraphQL API using introspection."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    response = requests.post(api_url, json={"query": introspection_query}, headers=headers)

    if response.status_code == 200:
        return response.json().get('data', {}).get('__schema', {}).get('types', [])
    else:
        print(f"Failed to retrieve schema: {response.status_code} - {response.text}")
        return []

def process_schema(types):
    """Process the GraphQL schema data to extract field details."""
    field_details = []

    for t in types:
        type_name = t.get('name')
        type_kind = t.get('kind')
        fields = t.get('fields')

        if fields:
            for field in fields:
                field_name = field.get('name')
                field_type = field.get('type', {}).get('name') or field.get('type', {}).get('ofType', {}).get('name')
                field_kind = field.get('type', {}).get('kind') or field.get('type', {}).get('ofType', {}).get('kind')
                field_description = field.get('description')

                field_details.append({
                    'Type Name': type_name,
                    'Type Kind': type_kind,
                    'Field Name': field_name,
                    'Field Type': field_type,
                    'Field Kind': field_kind,
                    'Field Description': field_description
                })

    df = pd.DataFrame(field_details)
    return df

def save_to_csv(df, filename):
    """Save the DataFrame to a CSV file."""
    output_dir = os.path.dirname(filename)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)

    df.to_csv(filename, index=False)
    print(f"All schema fields saved to '{filename}'")

def compute(api_url, api_key, introspection_query, filename):
    """Compute and handle the schema retrieval, processing, and saving."""
    types = fetch_schema(api_url, api_key, introspection_query)
    if types:
        df = process_schema(types)
        save_to_csv(df, filename)

        # Convert DataFrame to a dictionary for serialization
        df_dict = df.to_dict(orient='records')

        return {'dataframe': df_dict, 'csv_file': filename}
    else:
        return {'dataframe': None, 'csv_file': None}


def test():
    """Test the compute function."""

    print("Running test")

import json
import requests
import time
from yaspin import yaspin

class Zetaforge:
  def __init__(self, base_url='http://localhost:8080', token=None) -> None:
    """ The constructor of Zetaforge Class

		Args:
				base_url (str): ideal is anvil.zetaforge.com: . Defaults to 'http://localhost:8080'.
				token (str): Pipeline Token. Defaults to None.
		"""
    self.base_url = base_url
    self.token = token

  def run(self, uuid:str, hash:str, inputs:dict) -> dict:
    """ Runs the pipeline

		Args:
				uuid (str): uuid of your pipeline
				hash (str): hash of your pipeline
				inputs (dict): {kay : value} format of your pipeline inputs

		Raises:
				Exception: any exceptions running a pipeline.

		Returns:
				dict: The results
		"""

    execute_url = f"{self.base_url}/pipeline/{uuid}/{hash}/execute"
    headers = {
      'Content-Type': 'application/json',
    }
    
    if self.token:
      headers['Authorization'] = f"Bearer {self.token}"

    try:
      # Start execution
      execute_response = requests.post(execute_url, json={'inputs': inputs}, headers=headers)
      execute_response.raise_for_status()
      execute_data = execute_response.json()
      print("Execution started with:")
      print("Organization:", execute_data.get('Organization'))
      print("Created:", execute_data.get('Created'))
      print("ExecutionTime:", execute_data.get('ExecutionTime'))
      print("Uuid:", execute_data.get('Uuid'))
      print("Hash:", execute_data.get('Hash'))
      print("Execution:", execute_data.get('Execution'))
      print("\n\n")

      # Poll for execution status
      execute_id = execute_data['Execution']
      status_url = f"{self.base_url}/execution/{execute_id}"
      prev_status = ''
      frame_index = 0
      spinner_frames = ['.', '..', '...', '....']

      with yaspin(text="Processing", color="yellow") as spinner:
        while True:
          response = requests.get(status_url, headers=headers)
          response.raise_for_status()
          response_data = response.json()
          if prev_status != response_data['Status']:
            prev_status = response_data['Status']
            spinner.text = f"Current status: {prev_status}"

          if response_data['Status'] == 'Failed':
            raise Exception('Execution failed.')

          if response_data['Status'] not in ['Pending', 'Running']:
            break
          spinner.text = f"Processing {spinner_frames[frame_index]}"
          frame_index = (frame_index + 1) % len(spinner_frames)

          time.sleep(0.4)

      print("Execution Completed")

      # Parse and return results
      result_to_parse = response_data.get('Results')
      data = json.loads(result_to_parse) if isinstance(result_to_parse, str) else result_to_parse

      # Extract outputs and strip parameters
      outputs = {}
      for block_id, block in data.get('pipeline', {}).items():
        if block.get('events') and block['events'].get('outputs'):
          outputs[block_id] = block['events']['outputs']
        if block.get('action') and block['action'].get('parameters'):
          del block['action']['parameters']
      
      return json.dumps(outputs, indent=2)

    except requests.RequestException as error:
      self.print_header("Error Occurred")
      print(f"Error during execution:")
      print(f"Status: {error.response.status_code if error.response else 'N/A'}")
      print(f"Status Text: {error.response.reason if error.response else 'N/A'}")
      print(f"Data: {error.response.text if error.response else 'N/A'}")
      print(f"Message: {str(error)}")

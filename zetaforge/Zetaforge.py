from typing import Optional, Dict, Any
import json
import requests
import time
from yaspin import yaspin
import logging

class Zetaforge:
    def __init__(self, base_url='http://localhost:8080', token=None) -> None:
        self.base_url = base_url.rstrip('/')  # Remove trailing slash if present
        self.token = token
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[logging.FileHandler('zetaforge.log'), logging.StreamHandler()]
        )
        self.logger = logging.getLogger('zetaforge')

    def _make_request(self, method: str, url: str, **kwargs) -> requests.Response:
        """Make HTTP request with proper error handling"""
        try:
            response = requests.request(method, url, **kwargs)
            response.raise_for_status()
            return response
        except requests.exceptions.ConnectionError as e:
            self.logger.error(f"Connection error to {url}: {str(e)}")
            raise
        except requests.exceptions.Timeout as e:
            self.logger.error(f"Timeout connecting to {url}: {str(e)}")
            raise
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Request failed to {url}: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                self.logger.error(f"Response status: {e.response.status_code}")
                self.logger.error(f"Response body: {e.response.text}")
            raise

    def _safe_json_loads(self, data: Any) -> Any:
        """Safely parse JSON data"""
        if isinstance(data, dict):
            return data
        if not isinstance(data, str):
            return data
        try:
            return json.loads(data)
        except json.JSONDecodeError as e:
            self.logger.error(f"JSON decode error: {str(e)}")
            self.logger.error(f"Problematic data: {data[:200]}...")  # Log first 200 chars
            raise

    def run(self, uuid: str, hash: str, inputs: Dict[str, Any]) -> str:
        """Run a pipeline with improved error handling and logging"""
        if not uuid or not hash:
            raise ValueError("UUID and hash must be provided")
            
        # Normalize URLs
        execute_url = f"{self.base_url}/pipeline/{uuid}/{hash}/execute"
        
        # Setup headers
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f"Bearer {self.token}"

        try:
            # Start execution
            self.logger.info(f"Starting pipeline execution: {uuid}")
            execute_response = self._make_request('POST', execute_url, 
                                                json={'inputs': inputs}, 
                                                headers=headers,
                                                timeout=30)
            
            execute_data = execute_response.json()
            
            # Keep the original console output for user feedback
            print("Execution started with:")
            print("Organization:", execute_data.get('Organization'))
            print("Created:", execute_data.get('Created'))
            print("ExecutionTime:", execute_data.get('ExecutionTime'))
            print("Uuid:", execute_data.get('Uuid'))
            print("Hash:", execute_data.get('Hash'))
            print("Execution:", execute_data.get('Execution'))
            print("\n\n")
            
            execution_id = execute_data.get('Execution')
            
            if not execution_id:
                raise ValueError("No execution ID received from server")
                
            self.logger.info(f"Execution ID: {execution_id}")
            
            # Poll for execution status
            status_url = f"{self.base_url}/execution/{execution_id}"
            prev_status = ''
            frame_index = 0
            spinner_frames = ['.', '..', '...', '....']
            max_retries = 3
            retry_count = 0
            response_data = None
            
            with yaspin(text="Processing", color="yellow") as spinner:
                while True:
                    try:
                        response = self._make_request('GET', status_url, 
                                                    headers=headers,
                                                    timeout=30)
                        retry_count = 0  # Reset counter on successful request
                        
                        response_data = response.json()
                        current_status = response_data.get('Status')
                        
                        if not current_status:
                            raise ValueError("No status received from server")
                            
                        if current_status != prev_status:
                            prev_status = current_status
                            spinner.text = f"Current status: {current_status}"
                            self.logger.info(f"Status changed to: {current_status}")
                            
                        if current_status == 'Failed':
                            error_msg = response_data.get('Error', 'Unknown error')
                            self.logger.error(f"Execution failed: {error_msg}")
                            raise Exception(f'Execution failed: {error_msg}')
                            
                        if current_status not in ['Pending', 'Running']:
                            break
                            
                        spinner.text = f"Processing {spinner_frames[frame_index]}"
                        frame_index = (frame_index + 1) % len(spinner_frames)
                        
                    except (requests.exceptions.RequestException, ValueError) as e:
                        retry_count += 1
                        if retry_count > max_retries:
                            raise
                        self.logger.warning(f"Retry {retry_count}/{max_retries} after error: {str(e)}")
                        time.sleep(1)  # Wait before retry
                        
                    time.sleep(0.4)  # Status check interval
            
            # Add additional polling for Results field
            max_result_retries = 5
            result_retry_count = 0
            
            while result_retry_count < max_result_retries:
                response = self._make_request('GET', status_url, headers=headers, timeout=30)
                response_data = response.json()
                
                if response_data.get('Results'):
                    break
                    
                result_retry_count += 1
                if result_retry_count < max_result_retries:
                    time.sleep(1)  # Wait a second between retries
                
            self.logger.info("Execution completed successfully")
            print("Execution Completed")
            
            # Process results
            results = response_data.get('Results')
            if not results:
                self.logger.warning("No results found in response after retries")
                return json.dumps({})
            
            
            if isinstance(results, str):
                results = self._safe_json_loads(results)
                
            outputs = {}
            if isinstance(results, dict) and results.get('pipeline'):
                for block_id, block in results['pipeline'].items():
                    if block.get('events') and block['events'].get('outputs'):
                        outputs[block_id] = block['events']['outputs']
            
            return json.dumps(outputs, indent=2)
            
        except Exception as e:
            self.logger.error(f"Unexpected error during execution: {str(e)}")
            raise


import unittest
from zetaforge import Zetaforge

class TestZetaforge(unittest.TestCase):
    def setUp(self):
        self.api = Zetaforge(base_url="https://anvil.zetaforge.com:" , token="YOUR_PIPELINE_API_TOKEN")

    def test_run_success(self):
        uuid = 'YOUR_PIPELINE_UUID'
        hash = 'YOUR_PIPELINE_HASH'
        
        inputs = {
    			"role": "\"You are a very mean spirited naturalist.\"",
					"prompt": "\"Write an article about tigers\"",
					"api_key": "\"your_api_key_here\"",
				}
        
        output = self.api.run(uuid, hash, inputs)
        print("Output:" ,output)
        self.assertIsInstance(output, str)

    def test_run_failure(self):
        uuid = 'invalid_uuid'
        hash = 'invalid_hash'
        inputs = {}
        with self.assertRaises(Exception):
            self.api.run(uuid, hash, inputs)

if __name__ == '__main__':
    unittest.main()
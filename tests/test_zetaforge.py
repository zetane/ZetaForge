import unittest
from Zetaforge.Zetaforge import Zetaforge

class TestZetaforge(unittest.TestCase):
    def setUp(self):
        self.api = Zetaforge(base_url="https://stage.zetaforge.com:" , token="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ6ZXRhbmUifQ.gF5z6TirXdIY4PlTwIp9k-lIgAU9SIb0D1SbCO0XuAsDGjNvfhmxxaG5UIEMLoaM1_KymIykmwC7PmSgn-TPCg")

    def test_run_success(self):
        uuid = 'pipeline-jscttuq3dpkn'
        hash = '151e2db91949eaab1ce1f32f7aba98e6ea636d2c'
        
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
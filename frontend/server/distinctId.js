export const distinctIdGenerator = 
`
import uuid
from hashlib import sha256


def generate_distinct_id():
    seed = 0
    try:
        seed = uuid.getnode()
    except:
        seed = 0
            
    distinct_id = sha256(str(seed).encode('utf-8')).hexdigest()
    return distinct_id

if __name__ == "__main__":
    print(generate_distinct_id())`
    
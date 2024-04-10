import mixpanel
import uuid
from hashlib import sha256

class MixpanelClient:

    def __init__(self, token, enabled=True):
        self.enabled = enabled
        self.token = token
        try:
            self.mp = mixpanel.Mixpanel(token)
        except Exception as err:
            print("Exception occurred while initializing the mixpanel instance.")
            print(err)
            self.enabled = False
            return
        self.distinct_id = self.generate_distinct_id()
        self.set_people()
        
    
    def set_people(self):
        if self.enabled:
            try:
                user = {"$first_name": self.distinct_id, '$last_name': self.distinct_id}
                self.mp.people_set(self.distinct_id, user, meta={})
            except Exception as err:
                print("Error happened while setting user profile. Disabling mixpanel")
                print(err)
                self.enabled = False

    def track_event(self, event, props={}):
        if self.enabled:
            try:
                self.mp.track(self.distinct_id, event, props)
            except Exception as err:
                print("Cannot track the event. Disabling mixpanel")
                print(err)
                self.enabled = False

    def generate_distinct_id(self):
        seed = 0
        try:
            seed = uuid.getnode()
        except:
            seed = 0
            
        distinct_id = sha256(str(seed).encode('utf-8')).hexdigest()
        return distinct_id

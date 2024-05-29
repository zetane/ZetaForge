from .mixpanel import Mixpanel
import uuid
from hashlib import sha256
import platform
import os
from pathlib import Path
import json
#mixpanel client is created in different parts of the code, using singleton design pattern to prevent creating multiple 
#instance.

class Singleton(type):
    _instances = {}
    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super(Singleton, cls).__call__(*args, **kwargs)
        return cls._instances[cls]
class MixpanelClient():

    def __init__(self, token, enabled=True, is_dev=False):
        self.enabled = enabled
        self.token = token
        os_ = platform.system()
        self.is_dev = is_dev

        self.os = os_
        if os_ == 'Darwin':
            self.os = 'Mac OS X'
        
        try:
            self.mp = Mixpanel(token)
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
                self.mp.people_set_once(self.distinct_id, {'$os': self.os})
            except Exception as err:
                print("Error happened while setting user profile. Disabling mixpanel")
                print(err)
                self.enabled = False

    def track_event(self, event, props={}):
        if self.enabled:
            try:
                self.mp.track(self.distinct_id, event, {**props, 'is_dev':self.is_dev, '$os': self.os})
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

    def set_env(self,env):
        self.is_dev = env

mixpanel_client =  MixpanelClient('4c09914a48f08de1dbe3dc4dd2dcf90d')
            

    

import mixpanel from 'mixpanel-browser'

class MixpanelService {
    constructor(token, disabled) {
      if(disabled) {
        return
      }
      try{
      mixpanel.init(token);
      this.distinctId = null
      this.token = token
      } catch(err){
        this.disabled = true
      }
    }

    async initializeDistinctId(){
        try{
            //Migrated to server endpoint, because trpc forces me to use it within a function component.
            const serverAddress = import.meta.env.VITE_EXPRESS
            const res = await fetch(`${serverAddress}/distinct-id`)
            this.distinctId = await res.text()
          } catch(err) {
            console.log("Err while initializing distinct id")
            console.log(err)
            this.disabled = true
        }
    }


  
    async trackEvent(eventName, eventData = {}) {
      if(this.disabled) {
        return
      }
      if(this.distinctId == null) {
          console.log("FETCHING DISTINCT ID")
          await this.initializeDistinctId()
      }
      if(this.disabled){
        return
      }
      try{
        mixpanel.identify(this.distinctId)
        mixpanel.people.set_once()

        mixpanel.track(eventName, {...eventData, distinct_id: this.distinctId});
      } catch(err) {
        this.disabled = true
      }
      
    }
  }
  
  export default MixpanelService;
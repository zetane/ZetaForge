import mixpanel from "mixpanel-browser";

class MixpanelService {
  constructor(token, disabled) {
    if (disabled) {
      return;
    }
    try {
      mixpanel.init(token);
      this.distinctId = null;
      this.token = token;
      this.isDev = null;
    } catch (err) {
      this.disabled = true;
    }
  }

  async initializeDistinctId() {
    try {
      //Migrated to server endpoint, because trpc forces me to use it within a function component.
      const serverAddress = import.meta.env.VITE_EXPRESS;
      const res = await fetch(`${serverAddress}/distinct-id`);
      this.distinctId = await res.text();
      this.isDev = await this.checkIsDev();
    } catch (err) {
      console.log("Err while initializing distinct id");
      console.log(err);
      this.disabled = true;
    }
  }

  async checkIsDev() {
    const serverAddress = import.meta.env.VITE_EXPRESS;
    const res = await fetch(`${serverAddress}/is-dev`);
    const data = await res.json();
    return data;
  }

  async trackEvent(eventName, eventData = {}) {
    if (this.distinctId == null) {
      await this.initializeDistinctId();
      try {
        if (this.distinctId) {
          mixpanel.identify(this.distinctId);
          mixpanel.people.set_once();
        }
      } catch (e) {
        console.log("Failed to set id");
      }
    }
    if (this.disabled) {
      return;
    }
    try {
      mixpanel.track(eventName, {
        ...eventData,
        distinct_id: this.distinctId,
        is_dev: this.isDev,
      });
    } catch (err) {}
  }
}

export default MixpanelService;

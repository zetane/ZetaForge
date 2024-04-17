
import  {atom} from 'jotai'
import MixpanelService from '../components/ui/MixpanelService';

const val = import.meta.env.VITE_DISABLE_MIXPANEL
let disable = false
if(val && val === 'True') {
    disable = true
}


const mixpanelService = new MixpanelService('4c09914a48f08de1dbe3dc4dd2dcf90d', disable);

const mixpanelAtom = atom(mixpanelService)

export { mixpanelAtom };
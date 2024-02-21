import { atom } from 'jotai'

const NotificationContentAtom = atom({ 
  show: false, 
  error: false,
  content: '',
  modalHeading: ''
})

export {NotificationContentAtom}
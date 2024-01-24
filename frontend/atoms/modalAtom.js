import { atom } from 'jotai'

const modalContentAtom = atom({ 
  show: false, 
  content: 'Hello world',
  modalHeading: ''
})

export {modalContentAtom}
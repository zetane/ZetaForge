import { atom } from 'jotai'

const modalContentAtom = atom({
  show: false,
  content: null,
})

export { modalContentAtom }

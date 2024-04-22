import { atomWithStorage } from 'jotai/utils'
import { atom } from 'jotai'

export const executionAtom = atom({
  executions: {},
  active: null
})

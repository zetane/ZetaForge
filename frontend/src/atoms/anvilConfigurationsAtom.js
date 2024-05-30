import { atom } from "jotai";
import config from "../../config";

export const defaultAnvilConfigurationAtom = atom(() => ({
    name: "Default",
    host: config.anvil.host,
    anvilPort: config.anvil.port,
    s3Port: config.s3.port,
}))
export const userAnvilConfigurationsAtom = atom([]);
export const activeIndexAtom = atom(0);
export const activeConfigurationAtom = atom((get) => [get(defaultAnvilConfigurationAtom), ...get(userAnvilConfigurationsAtom)][get(activeIndexAtom)])

export const addConfigurationAtom = atom(null, (_, set, newConfiguration) => {
    set(userAnvilConfigurationsAtom, (prev) => [
        ...prev,
        newConfiguration
    ])
})

export const removeConfigurationAtom = atom(null, (get, set, index) => {
    if(index === get(userAnvilConfigurationsAtom).length-1){
        set(activeIndexAtom, (prev) => prev - 1);
    }
    set(userAnvilConfigurationsAtom, (prev) => {
        return prev.filter((_, i) => i != index);
    })
})

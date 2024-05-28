import { atom } from "jotai";
import config from "../../config";

export const defaultAnvilConfiguration = atom(() => ({
    name: "Default",
    host: config.anvil.host,
    anvilPort: config.anvil.port,
    s3Port: config.s3.port,
}))
export const userAnvilConfigurations = atom([]);
const allConfigurations = atom((get) => [get(defaultAnvilConfiguration), ...get(userAnvilConfigurations)]);
const activeIndex = atom(0);
const activeConfiguration = atom((get) => get(allConfigurations)[activeIndex])

export const addConfiguration = atom(null, (get, set, newConfiguration) => {
    set(userAnvilConfigurations, (prev) => [
        ...prev,
        newConfiguration
    ])
})

export const removeConfiguration = atom(null, (get, set, index) => {
    set(userAnvilConfigurations, (prev) => {
        return prev.filter((e, i) => i != index);
    })
})

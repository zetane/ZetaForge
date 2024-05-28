import { atom } from "jotai";
import config from "../../config";

export const defaultAnvilConfiguration = atom(() => ({
    name: "Default",
    host: config.anvil.host,
    anvilPort: config.anvil.port,
    s3Port: config.s3.port,
}))
export const userAnvilConfigurations = atom([]);
export const activeIndex = atom(0);

export const addConfiguration = atom(null, (_, set, newConfiguration) => {
    set(userAnvilConfigurations, (prev) => [
        ...prev,
        newConfiguration
    ])
})

export const removeConfiguration = atom(null, (_, set, index) => {
    set(userAnvilConfigurations, (prev) => {
        return prev.filter((_, i) => i != index);
    })
})

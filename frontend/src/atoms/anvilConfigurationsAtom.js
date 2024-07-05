import { atom } from "jotai";
import config from "../../config";
import { atomWithStorage } from "jotai/utils";
import { runMigrations } from "@/migration/anvilConfigurationMigration";

runMigrations();

export const defaultAnvilConfigurationAtom = atom(() => ({
  name: "default",
  anvil: {
    host: config.anvil.host,
    port: config.anvil.port,
  },
  s3: {
    host: config.s3.host,
    port: config.s3.port,
    region: config.s3.region,
    bucket: config.s3.bucket,
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  },
}));
export const userAnvilConfigurationsAtom = atomWithStorage(
  "userAnvilConfigurationsAtom",
  [],
);
export const activeIndexAtom = atom(0);
export const activeConfigurationAtom = atom(
  (get) =>
    [get(defaultAnvilConfigurationAtom), ...get(userAnvilConfigurationsAtom)][
      get(activeIndexAtom)
    ],
);

export const addConfigurationAtom = atom(null, (_, set, newConfiguration) => {
  set(userAnvilConfigurationsAtom, (prev) => [...prev, newConfiguration]);
});

export const removeConfigurationAtom = atom(null, (get, set, index) => {
  if (index === get(userAnvilConfigurationsAtom).length - 1) {
    set(activeIndexAtom, (prev) => prev - 1);
  }
  set(userAnvilConfigurationsAtom, (prev) => {
    return prev.filter((_, i) => i != index);
  });
});

export const editConfigurationAtom = atom(
  null,
  (_, set, [index, configuration]) => {
    set(userAnvilConfigurationsAtom, (prev) => prev.with(index, configuration));
  },
);

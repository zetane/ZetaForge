import * as migrator from "localstorage-migrator";

const userConfigurationKey = "userAnvilConfigurationsAtom";
const indexKey = "anvilConfigurationsIndexAtom";
const migrations = [
  {
    name: 0,
    up: () => {
      localStorage.setItem(
        userConfigurationKey,
        JSON.stringify(
          JSON.parse(localStorage?.getItem(userConfigurationKey))?.map((e) => ({
            name: e.name,
            anvil: {
              host: e.host,
              port: e.anvilPort,
            },
            s3: {
              host: e.host,
              port: e.s3Port,
              region: "us-east-2",
              bucket: "zetaforge",
              accessKeyId: "AKIAIOSFODNN7EXAMPLE",
              secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
            },
          })) ?? [],
        ),
      );
    },
  },
  {
    name: 1,
    up: () => {
      localStorage.setItem(indexKey, JSON.stringify(JSON.parse(0)));
    },
  },
];

export function runMigrations() {
  migrator.migrate(migrations);
}

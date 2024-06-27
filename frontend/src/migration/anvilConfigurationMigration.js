import * as migrator from "localstorage-migrator";

const key = "userAnvilConfigurationsAtom";
const migrations = [
  {
    name: 0,
    up: () => {
      localStorage.setItem(
        key,
        JSON.stringify(
          JSON.parse(localStorage?.getItem(key))?.map((e) => ({
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
];

export function runMigrations() {
  migrator.migrate(migrations);
}

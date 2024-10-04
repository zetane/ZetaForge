import * as blockFixture from "./blockFixture";

export function getId() {
  return "pipeline-a1b2c3";
}

export function getPath() {
  return "test-path";
}

export function getSpecs() {
  return {
    pipeline: {
      [blockFixture.getId()]: blockFixture.getSpecs(),
    },
    sink: getPath(),
    build: getPath(),
    name: "Automated test pipeline",
    id: getId(),
  };
}

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { atomWithImmer, withImmer } from "jotai-immer";
import rfdc from "rfdc";
import { sha1 } from "js-sha1";
import { generateId } from "@/utils/blockUtils";

export const pipelineKey = (id, data) => {
  let hash = "";
  if (data && data != "") {
    hash = sha1(JSON.stringify(data));
  }
  return id + "." + hash;
};

export const pipelineFactory = (cachePath, pipeline = null) => {
  const id = generateId("pipeline");
  const tempFile = `${cachePath}${id}`;
  let defaultPipeline = {
    id: id,
    name: id,
    saveTime: null,
    path: tempFile,
    data: {},
    logs: [],
    history: null,
    socketUrl: null,
    record: null,
  };
  if (pipeline) {
    defaultPipeline = Object.assign(defaultPipeline, pipeline);
  }
  return defaultPipeline;
};

export const pipelinesAtom = atom({});

// Initialize with a default value synchronously
const defaultWorkspace = {
  tabs: {},
  active: null,
  fetchInterval: 3000,
  offset: 0,
  limit: 15,
  connected: false,
};

export const workspaceAtom = atomWithStorage(
  "workspace",
  defaultWorkspace,
  undefined,
  { getOnInit: true },
);

export const initializeWorkspaceAtom = atom(
  null,
  async (get, set, { cachePath }) => {
    const initPipeline = pipelineFactory(cachePath);
    const emptyKey = `${initPipeline.id}.`;
    const tabMap = { [emptyKey]: {} };

    set(workspaceAtom, {
      ...defaultWorkspace,
      tabs: tabMap,
      active: emptyKey,
    });

    set(pipelinesAtom, { [emptyKey]: initPipeline });
  },
);

const pipelineAtomWithImmer = atom(
  (get) => {
    const workspace = get(workspaceAtom);
    const pipelines = get(pipelinesAtom);
    return workspace.active ? pipelines[workspace.active] : null;
  },
  (get, set, newPipeline) => {
    const [pipelines, setPipelines] = atomWithImmer(pipelinesAtom);
    let key = `${newPipeline.id}.`;
    if (newPipeline.record) {
      key = `${newPipeline.id}.${newPipeline.record.Execution}`;
    }
    setPipelines((draft) => {
      draft[key] = newPipeline;
    });
  },
);

export const socketUrlAtom = atom(
  (get) => get(pipelineAtom)?.socketUrl,
  null,
  (prev, next) => prev === next,
);

export const pipelineAtom = withImmer(pipelineAtomWithImmer);

export const getPipelineFormat = (pipeline) => {
  return {
    sink: pipeline.path,
    build: pipeline.path,
    name: pipeline.name,
    id: pipeline.id,
    pipeline: pipeline.data,
  };
};

export const deletePipeline = (key) => {
  const [, setPipelines] = atomWithImmer(pipelinesAtom);

  setPipelines((draft) => {
    delete draft[key];
  });
};

export const deleteTab = (key) => {
  const [, setWorkspace] = atomWithImmer(workspaceAtom);

  setWorkspace((draft) => {
    delete draft.tabs[key];
  });
};

export const addPipeline = (newPipeline) => {
  const [workspace, setWorkspace] = atomWithImmer(workspaceAtom);
  const [pipelines, setPipelines] = atomWithImmer(pipelinesAtom);

  setPipelines((draft) => {
    draft[newPipeline.key] = newPipeline;
  });

  setWorkspace((draft) => {
    draft.tabs[newPipeline.key] = {};
    draft.active = newPipeline.key;
  });
};

export const lineageAtom = atom((get) => {
  const pipelines = get(pipelinesAtom);
  const lineage = new Map();

  if (!pipelines) {
    return lineage;
  }

  // Filter out pipelines with empty .record fields
  const validPipelines = Object.entries(pipelines).filter(
    ([_, pipeline]) =>
      pipeline.record && Object.keys(pipeline.record).length > 0,
  );

  const sortedPipelines = validPipelines.sort(([, a], [, b]) =>
    b.record.Execution.localeCompare(a.record.Execution),
  );

  sortedPipelines.forEach((entry) => {
    const pipeline = entry[1];
    const record = pipeline?.record;
    const sha1Hash = record?.Hash;
    if (!record || !sha1Hash) {
      return;
    }
    const pipelineData = JSON.parse(record.PipelineJson);
    const friendlyName = pipelineData.name;
    if (!lineage.has(sha1Hash)) {
      const createDate = new Date(record.Created * 1000);
      lineage.set(sha1Hash, {
        id: pipeline.id,
        name: friendlyName,
        hash: sha1Hash,
        deployed: record.Deployed,
        pipelineData: pipelineData,
        created: createDate.toLocaleString(),
        lastExecution: createDate.toLocaleString(),
        host: pipeline.host,
        executions: new Map(),
      });
    }

    const lineageEntry = lineage.get(sha1Hash);
    const existingExecution = lineageEntry.executions.get(record.Execution);

    if (!existingExecution) {
      const execDate = new Date(record.ExecutionTime * 1000);
      lineageEntry.executions.set(record.Execution, {
        id: record.Execution,
        hash: sha1Hash,
        pipeline: pipeline.id,
        created: execDate.toLocaleString(),
        status: record.Status,
      });
    } else {
      Object.assign(existingExecution, {
        status: pipeline.record.Status,
        created: new Date(
          pipeline.record.ExecutionTime * 1000,
        ).toLocaleString(),
      });
    }

    const mostRecent = Array.from(lineageEntry.executions.values())[0]?.created;
    if (mostRecent) {
      lineageEntry.lastExecution = mostRecent;
    }
  });

  return lineage;
});

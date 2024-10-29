import { atom } from "jotai";
import { withImmer } from "jotai-immer";
import { produce } from "immer";
import { sha1 } from "js-sha1";
import { generateId } from "@/utils/blockUtils";
import { db } from "@/utils/db";

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
    key: id + ".",
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
  fetchInterval: 10000,
  offset: 0,
  limit: 15,
  connected: false,
};

export const workspaceAtom = atom(defaultWorkspace);

/*export const workspaceAtom = atomWithStorage(
  "workspace",
  defaultWorkspace,
  undefined,
  {
    getOnInit: true,
  },
);*/

export const initializeWorkspaceAtom = atom(
  null,
  async (get, set, { cachePath }) => {
    try {
      // Try to get saved state first
      const saved = await db.workspace.get("currentState");
      if (saved?.data) {
        set(workspaceAtom, saved.data);
        return;
      }
    } catch (err) {
      console.error("Failed to load saved workspace:", err);
    }
    const initPipeline = pipelineFactory(cachePath);
    const emptyKey = `${initPipeline.id}.`;
    const tabMap = { [emptyKey]: initPipeline };
    const initialWorkspace = {
      ...defaultWorkspace,
      tabs: tabMap,
      active: emptyKey,
    };

    set(workspaceAtom, initialWorkspace);
    await db.workspace.put({ id: "currentState", data: initialWorkspace });
  },
);

// Data structure here is a local workspace that is persisted to user browser
// workspace.tabs has user working state
// pipelines have data from the server
// these get synced when the server updates data in PipelinesFetcher

// pipeline is a derived atom that reads and writes to the workspace

const pipelineAtomWithImmer = atom(
  (get) => {
    const workspace = get(workspaceAtom);
    return workspace.active ? workspace.tabs[workspace.active] : null;
  },
  (get, set, newPipeline) => {
    const workspace = get(workspaceAtom);
    const key = newPipeline.record
      ? `${newPipeline.id}.${newPipeline.record.Execution}`
      : `${newPipeline.id}.`;

    const updatedWorkspace = produce(workspace, (draft) => {
      draft.tabs[key] = newPipeline;
    });

    set(workspaceAtom, updatedWorkspace);
    db.workspace.put({ id: "currentState", data: updatedWorkspace });
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

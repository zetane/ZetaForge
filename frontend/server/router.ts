import { app, dialog } from "electron";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import {
  callAgent,
  compileComputation,
  getBlockDirectory,
  getBlockFile,
  getLogs,
  runTest,
  saveBlockSpecs,
  updateBlockFile,
} from "./blockSerialization";
import { getHistory, getIndex, updateHistory, updateIndex } from "./chat.js";
import { syncExecutionResults } from "./execution";
import { readPipelines, readSpecs } from "./fileSystem.js";
import { logger } from "./logger.js";
import { errorHandling } from "./middleware";
import {
  copyPipeline,
  executePipeline,
  removeBlock,
  saveBlock,
  saveSpec,
} from "./pipelineSerialization.js";
import { anvilConfigurationSchema } from "./schema";
import { publicProcedure, router } from "./trpc";
import { checkoutExecution } from "./git.js";

function createProcedure<TInput extends z.ZodTypeAny, TOutput>(
  schema: TInput,
  handler: (input: z.infer<TInput>) => Promise<TOutput>,
) {
  return publicProcedure
    .use(errorHandling)
    .input(schema)
    .mutation(async ({ input }) => handler(input as z.infer<TInput>));
}

function createQueryProcedure<TInput extends z.ZodTypeAny, TOutput>(
  schema: TInput,
  handler: (input: z.infer<TInput>) => Promise<TOutput>,
) {
  return publicProcedure
    .use(errorHandling)
    .input(schema)
    .query(async ({ input }) => handler(input as z.infer<TInput>));
}

export const appRouter = router({
  getBlocks: publicProcedure.use(errorHandling).query(async () => {
    const resources = process.resourcesPath;
    let coreBlocks = "core/blocks";
    if (app.isPackaged) {
      coreBlocks = path.join(resources, "core", "blocks");
    }

    const blocks = await readSpecs(coreBlocks);
    return blocks;
  }),
  getBlockCoverImagePath: publicProcedure
    .use(errorHandling)
    .input(
      z.object({
        blockId: z.string(),
      }),
    )
    .query(async (opts) => {
      router;
      const { input } = opts;
      const { blockId } = input;
      const resources = process.resourcesPath;
      let blocksPath = "core/blocks";
      if (app.isPackaged) {
        blocksPath = path.join(resources, "core", "blocks");
      }

      try {
        const coverImagePath = path.join(
          blocksPath,
          blockId,
          "cover-image.png",
        );
        return { coverImagePath };
      } catch (error) {
        logger.error(error);
        return { coverImagePath: null };
      }
    }),
  getPipelines: publicProcedure.use(errorHandling).query(async () => {
    const resources = process.resourcesPath;
    let corePipelines = "core/pipelines";
    if (app.isPackaged) {
      corePipelines = path.join(resources, "core", "pipelines");
    }

    try {
      const pipelines = await readPipelines(corePipelines);
      return pipelines;
    } catch (error) {
      logger.error(error);
      return [];
    }
  }),
  getPipelineCoverImagePath: publicProcedure
    .use(errorHandling)
    .input(
      z.object({
        pipelineId: z.string(),
      }),
    )
    .query(async (opts) => {
      const { input } = opts;
      const { pipelineId } = input;
      const resources = process.resourcesPath;
      let pipelinesPath = "core/pipelines";
      if (app.isPackaged) {
        pipelinesPath = path.join(resources, "core", "pipelines");
      }

      try {
        const pipelines = await readPipelines(pipelinesPath);
        const pipeline = pipelines.find(
          (p) => p.specs.id === pipelineId,
        )?.specs;
        if (!pipeline) {
          throw new Error(`Pipeline with ID ${pipelineId} not found`);
        }
        const coverImagePath = path.join(
          pipelinesPath,
          pipeline.folderName,
          "cover-image.png",
        );
        return { coverImagePath };
      } catch (error) {
        logger.error(error);
        return { coverImagePath: null };
      }
    }),
  copyPipeline: publicProcedure
    .use(errorHandling)
    .input(
      z.object({
        specs: z.any(),
        name: z.optional(z.string()),
        writeFromDir: z.string(),
        writeToDir: z.string().optional(),
      }),
    )
    .mutation(async (opts) => {
      const { input } = opts;
      let { name, writeToDir } = input;
      const { writeFromDir, specs } = input;
      if (!writeToDir) {
        const savePath = await dialog.showSaveDialog({
          properties: ["createDirectory"],
        });
        if (!savePath.canceled) {
          const pathArr = savePath.filePath?.split(path.sep);
          name = pathArr ? pathArr[pathArr.length - 1] : name;
          writeToDir = savePath.filePath;
          specs["sink"] = writeToDir;
          specs["build"] = writeToDir;
          specs["name"] = name;

          if (writeToDir) {
            try {
              const stat = await fs.stat(writeToDir);
              if (stat.isDirectory()) {
                fs.rm(writeToDir, { recursive: true, force: true });
              }
            } catch {
              logger.debug("Creating dir: ", writeToDir);
            }
          }
        }
      }

      if (writeToDir) {
        const savePaths = await copyPipeline(specs, writeFromDir, writeToDir);
        return { name: name, ...savePaths };
      }

      return {};
    }),
  saveBlock: publicProcedure
    .use(errorHandling)
    .input(
      z.object({
        pipelineSpec: z.any(),
        blockSpec: z.any(),
        blockId: z.string(),
        blockPath: z.string(),
        pipelinePath: z.string(),
      }),
    )
    .mutation(async (opts) => {
      const { input } = opts;
      const { pipelineSpec, blockSpec, blockId, blockPath, pipelinePath } =
        input;
      let savePaths;
      if (blockSpec.action?.container) {
        savePaths = await saveBlock(
          blockId,
          blockSpec,
          blockPath,
          pipelinePath,
        );
        await saveSpec(pipelineSpec, pipelinePath);
      } else if (blockSpec.action?.parameters) {
        savePaths = await saveSpec(pipelineSpec, pipelinePath);
      }
      return savePaths;
    }),
  removeBlock: publicProcedure
    .use(errorHandling)
    .input(
      z.object({
        blockId: z.string(),
        pipelinePath: z.string(),
      }),
    )
    .mutation(async (opts) => {
      const { input } = opts;
      const { blockId, pipelinePath } = input;
      removeBlock(blockId, pipelinePath);
    }),
  executePipeline: publicProcedure
    .use(errorHandling)
    .input(
      z.object({
        id: z.string(),
        executionId: z.string(),
        specs: z.any(),
        path: z.string().optional(),
        name: z.string(),
        rebuild: z.boolean(),
        anvilConfiguration: anvilConfigurationSchema,
      }),
    )
    .mutation(async (opts) => {
      const { input } = opts;
      const {
        id,
        executionId,
        specs,
        path,
        name,
        rebuild,
        anvilConfiguration,
      } = input;

      return await executePipeline(
        id,
        executionId,
        specs,
        path,
        name,
        rebuild,
        anvilConfiguration,
      );
    }),
  compileComputation: createProcedure(
    z.object({
      pipelinePath: z.string(),
      blockId: z.string(),
    }),
    async ({ pipelinePath, blockId }) =>
      await compileComputation(pipelinePath, blockId),
  ),
  saveBlockSpecs: createProcedure(
    z.object({
      pipelinePath: z.string(),
      blockId: z.string(),
      blockSpecs: z.any(),
    }),
    async ({ pipelinePath, blockId, blockSpecs }) =>
      saveBlockSpecs(pipelinePath, blockId, blockSpecs),
  ),

  downloadExecutionResults: createProcedure(
    z.object({
      pipelinePath: z.string(),
      pipelineUuid: z.string(),
      executionUuid: z.string(),
      anvilConfiguration: anvilConfigurationSchema,
      merkle: z.string().optional(),
      spec: z.any().optional(),
    }),
    async ({
      pipelinePath,
      pipelineUuid,
      executionUuid,
      anvilConfiguration,
      merkle,
      spec,
    }) =>
      syncExecutionResults(
        pipelinePath,
        pipelineUuid,
        executionUuid,
        anvilConfiguration,
        merkle,
        spec,
      ),
  ),

  runTest: createProcedure(
    z.object({
      pipelinePath: z.string(),
      blockId: z.string(),
    }),
    async ({ pipelinePath, blockId }) => runTest(pipelinePath, blockId),
  ),

  chat: router({
    history: router({
      get: createQueryProcedure(
        z.object({
          pipelinePath: z.string(),
          blockId: z.string(),
        }),
        async ({ pipelinePath, blockId }) => getHistory(pipelinePath, blockId),
      ),
      update: createProcedure(
        z.object({
          pipelinePath: z.string(),
          blockId: z.string(),
          history: z.array(z.any()),
        }),
        async ({ pipelinePath, blockId, history }) =>
          updateHistory(pipelinePath, blockId, history),
      ),
    }),
    index: router({
      get: createQueryProcedure(
        z.object({
          pipelinePath: z.string(),
          blockId: z.string(),
        }),
        async ({ pipelinePath, blockId }) => getIndex(pipelinePath, blockId),
      ),
      update: createProcedure(
        z.object({
          pipelinePath: z.string(),
          blockId: z.string(),
          index: z.number(),
        }),
        async ({ pipelinePath, blockId, index }) =>
          updateIndex(pipelinePath, blockId, index),
      ),
    }),
  }),

  block: router({
    file: router({
      get: createQueryProcedure(
        z.object({
          pipelinePath: z.string(),
          blockId: z.string(),
        }),
        async ({ pipelinePath, blockId }) =>
          getBlockDirectory(pipelinePath, blockId),
      ),
      byPath: router({
        get: createProcedure(
          z.object({
            pipelinePath: z.string(),
            blockId: z.string(),
            relPath: z.string(),
          }),
          async ({ pipelinePath, blockId, relPath }) =>
            getBlockFile(pipelinePath, blockId, relPath),
        ),
        update: createProcedure(
          z.object({
            pipelinePath: z.string(),
            blockId: z.string(),
            relPath: z.string(),
            content: z.string(),
          }),
          async ({ pipelinePath, blockId, relPath, content }) =>
            updateBlockFile(pipelinePath, blockId, relPath, content),
        ),
      }),
    }),
    callAgent: createProcedure(
      z.object({
        userMessage: z.string(),
        agentName: z.string(),
        conversationHistory: z.array(
          z.object({
            prompt: z.string(),
            response: z.string(),
            timestamp: z.number(),
          }),
        ),
        apiKey: z.string(),
      }),
      async ({ userMessage, agentName, conversationHistory, apiKey }) =>
        callAgent(userMessage, agentName, conversationHistory, apiKey),
    ),
    log: router({
      get: createQueryProcedure(
        z.object({
          pipelinePath: z.string(),
          blockId: z.string(),
        }),
        async ({ pipelinePath, blockId }) => getLogs(pipelinePath, blockId),
      ),
    }),
  }),
  execution: router({
    checkout: createProcedure(
      z.object({
        pipelineId: z.string(),
        executionId: z.string(),
      }),
      async ({ pipelineId, executionId }) =>
        checkoutExecution(pipelineId, executionId),
    ),
  }),
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;

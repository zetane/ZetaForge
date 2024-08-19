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
} from "./blockSerialization.js";
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
  //TODO: load and validate schema
  savePipeline: publicProcedure
    .use(errorHandling)
    .input(
      z.object({
        specs: z.any(),
        name: z.optional(z.string()),
        buffer: z.string(),
        writePath: z.optional(z.string()),
      }),
    )
    .mutation(async (opts) => {
      const { input } = opts;
      let { name, writePath } = input;
      const { buffer, specs } = input;
      if (!writePath) {
        const savePath = await dialog.showSaveDialog({
          properties: ["createDirectory"],
        });
        if (!savePath.canceled) {
          const pathArr = savePath.filePath?.split(path.sep);
          name = pathArr ? pathArr[pathArr.length - 1] : name;
          writePath = savePath.filePath;
          specs["sink"] = writePath;
          specs["build"] = writePath;
          specs["name"] = name;

          if (writePath) {
            try {
              const stat = await fs.stat(writePath);
              if (stat.isDirectory()) {
                fs.rm(writePath, { recursive: true, force: true });
              }
            } catch {
              logger.debug("Creating dir: ", writePath);
            }
          }
        }
      }

      if (writePath) {
        const savePaths = await copyPipeline(specs, buffer, writePath);
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
        buffer: z.string(),
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
        buffer,
        name,
        rebuild,
        anvilConfiguration,
      } = input;

      return await executePipeline(
        id,
        executionId,
        specs,
        path,
        buffer,
        name,
        rebuild,
        anvilConfiguration,
      );
    }),
  compileComputation: publicProcedure
    .use(errorHandling)
    .input(
      z.object({
        pipelineId: z.string(),
        blockId: z.string(),
      }),
    )
    .mutation(async (opts) => {
      const { input } = opts;
      const { pipelineId, blockId } = input;

      return await compileComputation(pipelineId, blockId);
    }),
  saveBlockSpecs: publicProcedure
    .use(errorHandling)
    .input(
      z.object({
        pipelineId: z.string(),
        blockId: z.string(),
        blockSpecs: z.any(),
      }),
    )
    .mutation(async (opts) => {
      const { input } = opts;
      const { pipelineId, blockId, blockSpecs } = input;

      return await saveBlockSpecs(pipelineId, blockId, blockSpecs);
    }),
  downloadExecutionResults: publicProcedure
    .use(errorHandling)
    .input(
      z.object({
        buffer: z.string(),
        pipelineUuid: z.string(),
        executionUuid: z.string(),
        anvilConfiguration: anvilConfigurationSchema,
      }),
    )
    .mutation(async (opts) => {
      const { input } = opts;
      const { buffer, pipelineUuid, executionUuid, anvilConfiguration } = input;

      await syncExecutionResults(
        buffer,
        pipelineUuid,
        executionUuid,
        anvilConfiguration,
      );
    }),
  runTest: publicProcedure
    .use(errorHandling)
    .input(
      z.object({
        pipelineId: z.string(),
        blockId: z.string(),
      }),
    )
    .mutation(async (opts) => {
      const { input } = opts;
      const { pipelineId, blockId} = input;

      await runTest(pipelineId, blockId);
    }),
  chat: router({
    history: router({
      get: publicProcedure
        .use(errorHandling)
        .input(
          z.object({
            pipelineId: z.string(),
            blockId: z.string(),
          }),
        )
        .query(async (opts) => {
          const { input } = opts;
          const { pipelineId, blockId } = input;

          const chatHistory = await getHistory(pipelineId, blockId);
          return chatHistory;
        }),
      update: publicProcedure
        .use(errorHandling)
        .input(
          z.object({
            pipelineId: z.string(),
            blockId: z.string(),
            history: z.array(z.any()),
          }),
        )
        .mutation(async (opts) => {
          const { input } = opts;
          const { pipelineId, blockId, history } = input;

          await updateHistory(pipelineId, blockId, history);
        }),
    }),
    index: router({
      get: publicProcedure
        .use(errorHandling)
        .input(
          z.object({
            pipelineId: z.string(),
            blockId: z.string(),
          }),
        )
        .query(async (opts) => {
          const { input } = opts;
          const { pipelineId, blockId } = input;

          const chatIndex = await getIndex(pipelineId, blockId);
          return chatIndex;
        }),
      update: publicProcedure
        .use(errorHandling)
        .input(
          z.object({
            pipelineId: z.string(),
            blockId: z.string(),
            index: z.number(),
          }),
        )
        .mutation(async (opts) => {
          const { input } = opts;
          const { pipelineId, blockId, index } = input;

          await updateIndex(pipelineId, blockId, index);
        }),
    }),
  }),
  block: router({
    file: router({
      get: publicProcedure
        .use(errorHandling)
        .input(
          z.object({
            pipelineId: z.string(),
            blockId: z.string(),
          }),
        )
        .query(async (opts) => {
          const { input } = opts;
          const { pipelineId, blockId } = input;

          return await getBlockDirectory(pipelineId, blockId);
        }),
      byPath: router({
        get: publicProcedure
          .use(errorHandling)
          .input(
            z.object({
              pipelineId: z.string(),
              blockId: z.string(),
              path: z.string(),
            }),
          )
          .mutation(async (opts) => {
            const { input } = opts;
            const { pipelineId, blockId, path } = input;

            return await getBlockFile(pipelineId, blockId, path);
          }),
        update: publicProcedure
          .use(errorHandling)
          .input(
            z.object({
              pipelineId: z.string(),
              blockId: z.string(),
              path: z.string(),
              content: z.string(),
            }),
          )
          .mutation(async (opts) => {
            const { input } = opts;
            const { pipelineId, blockId, path, content } = input;

            return await updateBlockFile(pipelineId, blockId, path, content);
          }),
      }),
    }),
    callAgent: publicProcedure
      .use(errorHandling)
      .input(
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
      )
      .mutation(async (opts) => {
        const { input } = opts;
        const { userMessage, agentName, conversationHistory, apiKey } = input;

        return callAgent(userMessage, agentName, conversationHistory, apiKey);
      }),
    log: router({
      get: publicProcedure
        .use(errorHandling)
        .input(
          z.object({
            pipelineId: z.string(),
            blockId: z.string(),
          }),
        )
        .query(async (opts) => {
          const { input } = opts;
          const { pipelineId, blockId } = input;

          return getLogs(pipelineId, blockId);
        }),
    }),
  }),
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;

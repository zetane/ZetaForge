import { dialog } from 'electron';
import { z } from 'zod';
import { readSpecs } from "./fileSystem.js";
import { copyPipeline, getBlockPath, removeBlock, saveBlock } from './pipelineSerialization.js';
import { publicProcedure, router } from './trpc';

export const appRouter = router({
  getBlocks: publicProcedure
    .query(async () => {
      const coreBlocks = "../core/blocks"
      try {
        const blocks = await readSpecs(coreBlocks)
        return blocks
      } catch (error) {
        console.log(error)
      }
    }),
  //TODO: load and validate schema
  savePipeline: publicProcedure
    .input(z.object({
      specs: z.any(),
      name: z.optional(z.string()),
      buffer: z.string(),
      writePath: z.optional(z.string())
    }))
    .mutation(async(opts) => {
      const { input } = opts
      let { specs, name, buffer, writePath } = input
      if (!writePath) {
        const savePath = await dialog.showSaveDialog({properties: ['createDirectory']})
        if (!savePath.canceled) {
          const pathArr = savePath.filePath?.split("/")
          name = pathArr ? pathArr[(pathArr.length - 1)] : name
          writePath = savePath.filePath
        }
      }
      console.log("writing: ", writePath)
      const savePaths = await copyPipeline(specs, name, buffer, writePath);
      console.log("wrote: ", savePaths)

      return savePaths;
  }),
  saveBlock: publicProcedure
    .input(z.object({
      blockSpec: z.any(),
      blockId: z.number(),
      blockPath: z.string(),
      pipelinePath: z.string()
    })) 
    .mutation(async(opts) => {
      const {input} = opts;
      const {blockSpec, blockId, blockPath, pipelinePath} = input;
      const savePaths = await saveBlock(blockSpec, blockId, blockPath, pipelinePath);
      return savePaths;
    }),
  getBlockPath: publicProcedure
    .input(z.object({
      blockId: z.number(),
      pipelinePath: z.string(),
    }))
    .mutation(async (opts) => {
      const {input} = opts;
      const {blockId, pipelinePath} = input;
      return await getBlockPath(blockId, pipelinePath);
    }),
  removeBlock: publicProcedure
    .input(z.object({
      blockId: z.string(),
      pipelinePath: z.string(),
    }))
    .mutation(async (opts) => {
      const {input} = opts;
      const {blockId, pipelinePath} = input;
      removeBlock(blockId, pipelinePath);
    })

});
 
// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
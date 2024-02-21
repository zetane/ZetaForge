import { z } from 'zod';
import { publicProcedure, router } from './trpc';
import { dialog } from 'electron';
import { copyPipeline, saveBlock } from './pipelineSerialization.js'
import { readSpecs } from "./fileSystem.js";

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
      blockPath: z.string(),
      pipelinePath: z.string()
    })) 
    .mutation(async(opts) => {
      const {input} = opts;
      const {blockSpec, blockPath, pipelinePath} = input;
      const savePaths = await saveBlock(blockSpec, blockPath, pipelinePath);
      console.log("saved: ", savePaths)
      return savePaths;
    })

});
 
// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
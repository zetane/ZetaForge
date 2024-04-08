import { TRPCError } from "@trpc/server";
import { toBigIntBE } from 'bigint-buffer';
import { app, dialog } from 'electron';
import fs from "fs/promises";
import getMAC from "getmac";
import path from "path";
import sha256 from 'sha256';
import { z } from 'zod';
import { compileComputation, saveBlockSpecs } from './blockSerialization.js';
import { readSpecs, readPipelines, s3Upload } from "./fileSystem.js";
import { copyPipeline, getBlockPath, removeBlock, saveBlock, saveSpec } from './pipelineSerialization.js';
import { publicProcedure, router } from './trpc';

export const appRouter = router({
  getBlocks: publicProcedure
    .query(async () => {
      const resources = process.resourcesPath
      let coreBlocks = "core/blocks"
      if(app.isPackaged)
      {
      coreBlocks = path.join(resources, "core", "blocks")
      }
      
      try {
        const blocks = await readSpecs(coreBlocks)
        return blocks
      } catch (error) {
        console.log(error)
      }
    }),
  getBlockCoverImagePath: publicProcedure
    .input(z.object({
      blockId: z.string(),
    }))
    .query(async (opts) => {
      const { input } = opts;
      const { blockId } = input;
      const resources = process.resourcesPath;
      let blocksPath = "core/blocks";
      if (app.isPackaged) {
        blocksPath = path.join(resources, "core", "blocks");
      }
  
      try {
        const coverImagePath = path.join(blocksPath, blockId, "cover-image.png");
        return { coverImagePath };
      } catch (error) {
        console.log(error);
        return { coverImagePath: null };
      }
    }),  
  getPipelines: publicProcedure
    .query(async () => {
      const resources = process.resourcesPath;
      let corePipelines = "core/pipelines";
      if (app.isPackaged) {
        corePipelines = path.join(resources, "core", "pipelines");
      }
  
      try {
        const pipelines = await readPipelines(corePipelines);
        return pipelines;
      } catch (error) {
        console.log(error);
        return [];
      }
    }), 
  getPipelineCoverImagePath: publicProcedure
  .input(z.object({
    pipelineId: z.string(),
  }))
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
      const pipeline = pipelines.find(p => p.id === pipelineId);
      if (!pipeline) {
        throw new Error(`Pipeline with ID ${pipelineId} not found`);
      }
      const coverImagePath = path.join(pipelinesPath, pipeline.folderName, 'cover-image.png');
      return { coverImagePath };
    } catch (error) {
      console.log(error);
      return { coverImagePath: null };
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
          const pathArr = savePath.filePath?.split(path.sep)
          name = pathArr ? pathArr[(pathArr.length - 1)] : name
          writePath = savePath.filePath
          specs['sink'] = writePath
          specs['build'] = writePath

          if (writePath) {
            try {
              const stat = await fs.stat(writePath)
              if (stat.isDirectory()) {
                fs.rm(writePath, {recursive: true, force: true})
              }
            } catch {
              console.log("Creating dir: ", writePath)
            }
          }
        }
      } 

      if (writePath) {
        const savePaths = await copyPipeline(specs, name, buffer, writePath);
        return savePaths;
      }

      return {}
  }),
  saveBlock: publicProcedure
    .input(z.object({
      pipelineSpec: z.any(),
      name: z.string(),
      blockSpec: z.any(),
      blockId: z.string(),
      blockPath: z.string(),
      pipelinePath: z.string()
    })) 
    .mutation(async(opts) => {
      const {input} = opts;
      const {pipelineSpec, name, blockSpec, blockId, blockPath, pipelinePath} = input;
      let savePaths;
      if (blockSpec.action?.container) {
        savePaths = await saveBlock(blockId, blockPath, pipelinePath);
        await saveSpec(pipelineSpec, pipelinePath, name+".json")
      } else if (blockSpec.action?.parameters) {
        savePaths = await saveSpec(pipelineSpec, pipelinePath, name+".json")
      }
      return savePaths;
    }),
  getBlockPath: publicProcedure
    .input(z.object({
      blockId: z.string(),
      pipelinePath: z.string(),
    }))
    .mutation(async (opts) => {
      const {input} = opts;
      const {blockId, pipelinePath} = input;
      return await getBlockPath(blockId, pipelinePath);
    }),
  getCachePath: publicProcedure
    .query(async () => {
      return path.join(process.cwd(), ".cache") + path.sep
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
    }),
  uploadToS3: publicProcedure
    .input(z.object({
      filePath: z.string(),
    }))
    .mutation(async (opts) => {
      const {input} = opts;
      const {filePath} = input;

      const res = await s3Upload(filePath)
      return res;
    }),
  getDistinctId: publicProcedure
    .input(z.object({
      distinctId: z.string()
    }))
    .mutation(async (opts) => {
      function get_distinct_id() {

        function getHardwareAddressAsInteger() {
    
          try {
           const macAddress = getMAC();
           
           let macAsBigInt = toBigIntBE(Buffer.from(macAddress.split(':').join(''), 'hex'));
         
           // Check if the MAC address is universally administered
           const isUniversallyAdministered = (macAsBigInt & BigInt(0x020000000000)) === BigInt(0);
         
           // If not universally administered, set the multicast bit
           if (!isUniversallyAdministered) {
             macAsBigInt |= BigInt(0x010000000000);
           }
       
           return macAsBigInt;
         } catch (error) {
         console.log("Can't generate distinct_id for mixpanel. Using default distinct_id")
         console.log(error)
         console.log("error")
         return BigInt(0);
         }
       }
       
       return getHardwareAddressAsInteger()
    
     }
      const distinct_id = sha256(get_distinct_id().toString())
      return {distinctId: distinct_id}
    }),
  compileComputation: publicProcedure
    .input(z.object({
      blockPath: z.string(),
    }))
    .mutation(async (opts) => {
      const {input} = opts;
      const {blockPath} = input;
      
      try {
        return await compileComputation(blockPath);
      } catch (error) {
        console.error(error)
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Could not compile.',
        });
      }
      
    }),
  saveBlockSpecs: publicProcedure
    .input(z.object({
      blockPath: z.string(),
      blockSpecs: z.any(),
    }))
    .mutation(async (opts) => {
      const {input} = opts;
      const {blockPath, blockSpecs} = input; 

      try {
        return await saveBlockSpecs(blockPath, blockSpecs);
      } catch (error) {
        console.error(error)
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Could not compile.',
        });
      }
    })

});
 
// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
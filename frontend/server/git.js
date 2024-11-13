import git from "isomorphic-git";
import fs from "fs";
import path from "path";
import { cacheJoin } from "./cache.js";

export async function ensureGitRepoAndCommitBlocks(
  buildContextStatuses,
  buildPath,
  cachePath,
  executionId,
) {
  // 1. Copy all blocks to cache
  if (buildPath != cachePath) {
    await Promise.all(
      buildContextStatuses
        .filter((context) => {
          context.hash != "";
        })
        .map(async ({ blockKey }) => {
          const sourcePath = path.join(buildPath, blockKey);
          const targetPath = path.join(cachePath, blockKey);

          // Ensure target directory exists
          await fs.promises.mkdir(targetPath, { recursive: true });

          // Copy directory contents
          const files = await fs.promises.readdir(sourcePath);
          await Promise.all(
            files.map((file) =>
              fs.promises.cp(
                path.join(sourcePath, file),
                path.join(targetPath, file),
                { recursive: true },
              ),
            ),
          );
        }),
    );
  }

  // 2. Check for git repo
  let isRepo = false;
  try {
    await git.resolveRef({ fs, dir: cachePath, ref: "HEAD" });
    isRepo = true;
  } catch (e) {
    // Not a git repo
  }

  // Initialize if not exists
  if (!isRepo) {
    await git.init({ fs, dir: cachePath, defaultBranch: "main" });
    await git.setConfig({
      fs,
      dir: cachePath,
      path: "user.name",
      value: "Pipeline System",
    });
    await git.setConfig({
      fs,
      dir: cachePath,
      path: "user.email",
      value: "pipeline@system.local",
    });
  }

  // 3. Check for changes
  const statusMatrix = await git.statusMatrix({ fs, dir: cachePath });
  const hasChanges = statusMatrix.some(
    ([, head, workdir, stage]) => head !== workdir || head !== stage,
  );

  if (hasChanges) {
    // Add all changes
    await git.add({ fs, dir: cachePath, filepath: "." });

    // Create commit with block hashes in message
    const commitMessage = buildContextStatuses
      .filter((status) => status.hash)
      .map((status) => `${status.blockKey}: ${status.hash}`)
      .join("\n");

    await git.commit({
      fs,
      dir: cachePath,
      message: commitMessage,
      author: {
        name: "Pipeline System",
        email: "pipeline@system.local",
      },
    });

    // 4. Tag with execution ID
    const currentCommit = await git.resolveRef({
      fs,
      dir: cachePath,
      ref: "HEAD",
    });

    await git.tag({
      fs,
      dir: cachePath,
      ref: `${executionId}`,
      object: currentCommit,
      message: `Execution ${executionId}`,
    });
  }
}

export async function checkoutExecution(pipelineId, executionId) {
  try {
    const cachePath = cacheJoin(pipelineId);

    // Check if cache directory exists
    try {
      await fs.promises.access(cachePath);
    } catch (e) {
      throw new Error(
        `Cache path not found for pipeline ${pipelineId} execution ${executionId}`,
      );
    }

    // Check if repo exists
    let isRepo = false;
    try {
      await git.resolveRef({ fs, dir: cachePath, ref: "HEAD" });
      isRepo = true;
    } catch (e) {
      throw new Error("No git repository found in cache");
    }

    if (!isRepo) {
      throw new Error("Cache directory is not a git repository");
    }

    // Try to find the execution tag
    const ref = `${executionId}`;

    try {
      // Checkout the specific tag
      await git.checkout({
        fs,
        dir: cachePath,
        ref,
        force: true,
      });

      return {
        success: true,
        message: `Successfully checked out execution ${executionId}`,
      };
    } catch (e) {
      throw new Error(
        `Execution ${executionId} not found or checkout failed: ${e.message}`,
      );
    }
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
}

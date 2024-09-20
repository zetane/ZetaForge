import bodyParser from "body-parser";
import compression from "compression";
import cors from "cors";
import "dotenv/config";
import { app as electronApp } from "electron";
import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import sha256 from "sha256";
import getMAC from "getmac";

function startExpressServer() {
  const app = express();
  const port = 3330;

  app.use(cors());
  app.use(compression());

  // http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
  app.disable("x-powered-by");
  //app.use(express.static(path.join(__dirname, '..', '..', 'backup_frontend')));
  //app.use('/blocks', express.static(path.join(__dirname, '..', '..', 'blocks')));
  //app.use('/my_data', express.static(path.join(__dirname, '..', '..', 'my_data')));
  //app.use('/history', express.static(path.join(__dirname, '..', '..', 'history')));
  //app.use('/my_blocks', express.static(path.join(__dirname, '..', '..', 'my_blocks')));
  // handle asset requests

  // Everything else (like favicon.ico) is cached for an hour. You may want to be
  // more aggressive with this caching.
  app.use(express.json());
  app.use(
    "/result",
    express.static(
      path.join(electronApp.getPath("appData"), "zetaforge", ".cache") +
        path.sep,
    ),
  );
  app.use(bodyParser.json());

  const upload = multer({ dest: "_temp_import" });

  app.get("/distinct-id", async (req, res) => {
    try {
      const macAddress = getMAC();
      let macAsBigInt = BigInt(`0x${macAddress.split(":").join("")}`);

      // Check if the MAC address is universally administered
      const isUniversallyAdministered =
        (macAsBigInt & BigInt(0x020000000000)) === BigInt(0);

      // If not universally administered, set the multicast bit
      if (!isUniversallyAdministered) {
        macAsBigInt |= BigInt(0x010000000000);
      }
      const distinctId = sha256(macAsBigInt.toString());
      return res.send(distinctId);
    } catch (error) {
      console.log(
        "Can't generate distinct_id for mixpanel. Using default distinct_id",
      );
      console.log(error);
      return res.send(sha256(BigInt(0).toString())); // Sending default distinct_id
    }
  });

  app.get("/is-dev", async (req, res) => {
    return res.send(
      !electronApp.isPackaged ||
        (electronApp.isPackaged &&
          process.env.VITE_ZETAFORGE_IS_DEV === "True"),
    );
  });

  app.post("/import-files", upload.array("files"), (req, res) => {
    const files = req.files;
    const { pipelinePath, blockId } = req.body;

    files.forEach((file) => {
      const targetPath = path.join(pipelinePath, blockId, file.originalname);

      // Move file from temporary location to target directory
      fs.renameSync(file.path, targetPath);
    });

    res.send("Files imported successfully");
  });

  app.post("/import-folder", upload.array("files"), (req, res) => {
    const files = req.files;
    const { pipelinePath, blockId, paths } = req.body;

    if (!Array.isArray(paths) || paths.length !== files.length) {
      return res.status(400).send("Mismatch between files and paths data.");
    }

    files.forEach((file, index) => {
      const relativePath = paths[index];
      const targetPath = path.join(pipelinePath, blockId, relativePath);

      const directory = path.dirname(targetPath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      fs.renameSync(file.path, targetPath);
    });

    res.send("Folder imported successfully");
  });

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

export { startExpressServer };

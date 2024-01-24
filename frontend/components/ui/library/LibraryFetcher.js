import LibraryWrapper from "./LibraryWrapper"
import fs from 'fs/promises'
import path from "path"

const specBuilder = async (specs) => {
  "use server"

  const specsData = [];

  for (const item of specs) {
    try {
      const itemPath = path.join(process.cwd(), "..", "blocks", item)
      const stat = await fs.stat(itemPath);

      if (stat.isDirectory()) {
        const specs = path.join(itemPath, "specs_v1.json");
        try {
          await fs.stat(specs)
          const specData = await fs.readFile(specs)
          specsData.push(JSON.parse(specData))
        } catch (error) {
          console.log("ERROR: ", error)
        }
      }

    } catch (error) {
        console.log("ERRRRRROR: ", error)
      }

    }

    return specsData;

}

const readSpecs = async (dir) => {
  "use server"

  const items = await fs.readdir(dir);
  //const pipelines = await fs.readdir("../pipelines");

  return specBuilder(items);
}

export default async function LibraryFetcher() {
  const blockSpecs = await readSpecs("../blocks");
  return (
    <div>
      <LibraryWrapper specs={blockSpecs}/>
    </div>
  )
}
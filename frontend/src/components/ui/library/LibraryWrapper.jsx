import { 
  SideNav, 
  SideNavItems, 
  Tile,
  ContainedList,
  Search,
  FlexGrid,
  Row,
  IconButton,
  Tabs,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
} from '@carbon/react';
import { ArrowLeft } from "@carbon/icons-react"
import { useState, useEffect } from 'react';
import { libraryAtom } from '@/atoms/libraryAtom';
import { useAtom } from 'jotai';

const dragStartHandler = (event, block) => {
  if (event.type === "touchstart") {
    // TODO: Handle mobile touchstarts
    //mobile_item_selec = ev.target.closest(".drag-drawflow").getAttribute('data-node');
  } else {
    // Note: If this is too slow we need to pass a reference ID around
    // And retrieve the block from a global block store 
    let blockData = JSON.stringify(block)
    event.dataTransfer.setData("block", blockData);
  }
}

const tileBuilder = (block, index) => {
  const dataProps= {"data-node": block.information.id}
  const blockName = block.information.name
  return (
      <Tile className="library-tile" 
        key={index} 
        draggable={true} 
        onDragStart={(ev) => {dragStartHandler(ev, block)}} >
        <div className="library-header">
          {blockName}
        </div>
      </Tile>
  )
}

export default function LibraryWrapper({ specs }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState([]);
  const [showLibrary, setShowLibrary] = useAtom(libraryAtom);
  const handleChange = (event) => {
    setSearchTerm(event.target.value);
  };

  useEffect(() => {
    const results = specs.filter((spec) =>
      spec.information.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setSearchResults(results);
  }, [searchTerm, specs]);

  const tileGrid = []
  let rowGrid = []

  searchResults.forEach((spec, index) => {
    let countIndex = index + 1
    let tile = tileBuilder(spec, index)
    rowGrid.push(tile)
    if ((searchResults.length == countIndex)) {
      // handle end of tiles when not divisible by the row length
      tileGrid.push((<Row key={index}>{rowGrid}</Row>))
    } 
  })

  let searchTitle = (
    <div style={{display: "flex"}}>
      <IconButton label="Close" kind="ghost" onClick={() => {setShowLibrary(false)}}>
        <ArrowLeft/>
      </IconButton>
      <div style={{alignItems: "center", display: "flex"}}>
        Block Library
      </div>
    </div>
  )

  return (
    <SideNav
      aria-label="Side navigation"
      expanded={showLibrary} 
      isFixedNav>
      <SideNavItems>
        <ContainedList label={searchTitle} kind="on-page" action={''}>
          <Search
            placeholder="Search"
            value={searchTerm}
            onChange={handleChange}
            closeButtonLabelText="Clear search input"
            size="lg"
            labelText="Search"
          />
          <Tabs>
            <TabList fullWidth className="full-tabs">
              <Tab>Core Blocks ({searchResults.length})</Tab>
              <Tab>Core Pipelines</Tab>
            </TabList>
            <TabPanels>
              <TabPanel className="library-tab">
              <FlexGrid fullWidth={true} condensed={true} className="mt-2">
                {tileGrid}
              </FlexGrid>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ContainedList>
      </SideNavItems>
    </SideNav>
  )
}
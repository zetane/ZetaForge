import { libraryAtom } from '@/atoms/libraryAtom';
import { ArrowLeft } from "@carbon/icons-react";
import LibraryTile from './LibraryTile';
import {
  ContainedList,
  FlexGrid,
  IconButton,
  Row,
  Search,
  SideNav,
  SideNavItems,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs
} from '@carbon/react';
import { useAtom } from 'jotai';
import { useEffect, useState } from 'react';


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
    let countIndex = index + 1;
    let tile = <LibraryTile key={index} block={spec} index={index} />;
    rowGrid.push(tile);
    if (searchResults.length == countIndex) {
      // handle end of tiles when not divisible by the row length
      tileGrid.push(<Row key={index}>{rowGrid}</Row>);
    }
  });
  

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
              <FlexGrid fullWidth={true} condensed={true} className="mt-2 library-tile-container">
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
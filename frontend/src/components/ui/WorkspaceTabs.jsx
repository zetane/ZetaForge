import { useEffect, useState } from "react";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@carbon/react';
import { workspaceAtom } from "@/atoms/pipelineAtom";
import { useImmerAtom } from "jotai-immer";

export default function WorkspaceTabs() {
  const [workspace, setWorkspace] = useImmerAtom(workspaceAtom);
  const [renderedTabs, setRenderedTabs] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const pipelineTabs = Object.values(workspace.tabs).map((key) => {
      console.log("key: ", key)
      const pipeline = workspace.pipelines[key]
      console.log(pipeline)
      console.log(workspace)
      if (pipeline) {
        return {label: pipeline?.name, panel: <TabPanel/>}
      }
    })
    console.log("tabs: ", pipelineTabs)
    setRenderedTabs(pipelineTabs)
    const pipelineKeys = Object.keys(workspace.pipelines)
    for (let i = 0; i < pipelineKeys.length; i++) {
      if (workspace.active == pipelineKeys[i]) {
        setSelectedIndex(i)
        break;
      }
    }
  }, [workspace])

  const handleTabChange = (evt) => {
    setSelectedIndex(evt.selectedIndex);
    setWorkspace((draft) => {
      draft.active = Object.keys(draft.pipelines)[evt.selectedIndex]
    })
  };

  const handleCloseTabRequest = (tabIndex) => {
    // ignore close requests on disabled tabs
    if (renderedTabs[tabIndex].disabled) {
      return;
    }

    const selectedTab = renderedTabs[selectedIndex];

    const filteredTabs = renderedTabs.filter((_, index) => index !== tabIndex);
    // if the tab being deleted is the currently selected tab, we're re-setting the selectedIndex
    // to the first tab available that isn't disabled
    if (tabIndex === selectedIndex) {
      const defaultTabIndex = filteredTabs.findIndex((tab) => !tab.disabled);
      setSelectedIndex(defaultTabIndex);
    } else {
      // we're re-calculating the selectedIndex since the selected tab's index might have shifted
      // due to a tab element being removed from the array
      setSelectedIndex(filteredTabs.indexOf(selectedTab));
    }
    setRenderedTabs(filteredTabs);
  };
  return (
    <div className="tab-bar flex flex-wrap">
    <div className>
    <Tabs
      selectedIndex={selectedIndex}
      onChange={handleTabChange}
      dismissable
      onTabCloseRequest={handleCloseTabRequest}>
      <TabList aria-label="List of tabs" contained>
        {renderedTabs.map((tab, index) => (
          <Tab key={index} disabled={tab.disabled}>
            {tab.label}
          </Tab>
        ))}
      </TabList>
    </Tabs>
    </div>
    </div>
  );
}

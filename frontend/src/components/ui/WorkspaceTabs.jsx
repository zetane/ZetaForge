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
      const [id, hash] = key.split(".")
      const pipeline = workspace.pipelines[key]
      let label = pipeline?.name
      return {id: key, label: pipeline?.name, panel: <TabPanel/>}
    })
    setRenderedTabs(pipelineTabs)
    for (let i = 0; i < workspace.tabs.length; i++) {
      if (workspace.active == workspace.tabs[i]) {
        setSelectedIndex(i)
        break;
      }
    }
  }, [workspace])

  const handleTabChange = (evt) => {
    setWorkspace((draft) => {
      draft.active = draft.tabs[evt.selectedIndex]
    })
  };

  const handleCloseTabRequest = (tabIndex) => {
    // ignore close requests on disabled tabs
    if (renderedTabs[tabIndex].disabled) {
      return;
    }

    const selectedTab = renderedTabs[selectedIndex];

    // TODO: Pop modal for deleting last tab
    if (workspace.tabs.length > 1) {
      const pipeline = workspace.pipelines[selectedTab.id]

      setWorkspace((draft) => {
        const filteredTabs = workspace.tabs.filter((tab) => selectedTab.id != tab.id)
        draft.tabs = filteredTabs

        // make the same tab we're deleting active, unless it's at the end, in which case we get -1
        if (tabIndex === selectedIndex) {
          if (tabIndex > filteredTabs.length) {
            tabIndex = (filteredTabs.length - 1)
          }
          draft.active = filteredTabs[tabIndex];
        } else {
          // we're re-calculating the selectedIndex since the selected tab's index might have shifted
          // due to a tab element being removed from the array
          tabIndex = filteredTabs.indexOf(selectedTab);
          draft.active = filteredTabs[tabIndex]
        }

        // If it's an empty pipeline we can just delete it
        if (Object.keys(pipeline.data).length === 0 && !pipeline.record) {
          delete draft.pipelines[pipeline.id]
        }
      })
    }
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
              <Tab key={index} disabled={tab?.disabled}>
                {tab.label}
              </Tab>
            ))}
          </TabList>
        </Tabs>
      </div>
    </div>
  );
}

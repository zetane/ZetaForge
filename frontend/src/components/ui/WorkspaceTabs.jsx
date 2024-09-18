import { useEffect, useState } from "react";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@carbon/react";
import { workspaceAtom } from "@/atoms/pipelineAtom";
import { useImmerAtom } from "jotai-immer";
import { useAtom } from "jotai";
import { drawflowEditorAtom } from "@/atoms/drawflowAtom";

export default function WorkspaceTabs() {
  const [workspace, setWorkspace] = useImmerAtom(workspaceAtom);
  const [renderedTabs, setRenderedTabs] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoomLevels, setZoomLevels] = useState({});

  const [editor] = useAtom(drawflowEditorAtom);

  useEffect(() => {
    const pipelineTabs = [];
    let index = 0;
    Object.keys(workspace.tabs).forEach((key) => {
      const pipeline = workspace.pipelines[key];
      const label = pipeline?.name;
      pipelineTabs.push({ id: key, label: label, panel: <TabPanel /> });

      if (workspace.active == key) {
        setSelectedIndex(index);
      }
      index++;
    });
    setRenderedTabs(pipelineTabs);
  }, [workspace]);

  const handleTabChange = (evt) => {
    const index = evt.selectedIndex;
    const key = renderedTabs[index]?.id;

    setZoomLevels((prevZoomLevels) => ({
      ...prevZoomLevels,
      [workspace.active]: editor?.zoom,
    }));

    setWorkspace((draft) => {
      draft.active = key;
    });

    if (editor) {
      editor.zoom = zoomLevels[key] ?? 1;
      editor.zoom_refresh(); // Refresh after setting zoom, *required.
    }
  };

  const handleCloseTabRequest = (deleteIndex) => {
    // ignore close requests on disabled tabs
    if (renderedTabs[deleteIndex].disabled) {
      return;
    }
    // TODO: Pop modal for deleting last tab
    if (Object.keys(workspace.tabs).length > 1) {
      const deleteTab = renderedTabs[deleteIndex];
      const selectedTab = renderedTabs[selectedIndex];
      const key = deleteTab.id;
      const { [key]: _, ...filteredTabs } = workspace.tabs;
      const newTabArray = Object.keys(filteredTabs);

      setWorkspace((draft) => {
        // make the same tab we're deleting active, unless it's at the end, in which case we get -1
        if (deleteIndex == selectedIndex) {
          if (deleteIndex >= newTabArray.length) {
            deleteIndex = newTabArray.length - 1;
          }
        } else {
          // we're re-calculating the selectedIndex since the selected tab's index might have shifted
          // due to a tab element being removed from the array
          deleteIndex = newTabArray.indexOf(selectedTab.id);
        }

        draft.tabs = filteredTabs;
        draft.active = newTabArray[deleteIndex];
      });
    }
  };

  return (
    <div className="tab-bar flex flex-wrap">
      <div className>
        <Tabs
          selectedIndex={selectedIndex}
          onChange={handleTabChange}
          dismissable
          onTabCloseRequest={handleCloseTabRequest}
        >
          <TabList aria-label="List of tabs">
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

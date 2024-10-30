import { useEffect, useState } from "react";
import { Tabs, TabList, Tab, TabPanel } from "@carbon/react";
import { workspaceAtom } from "@/atoms/pipelineAtom";
import { useImmerAtom } from "jotai-immer";
import { useAtom } from "jotai";
import { drawflowEditorAtom } from "@/atoms/drawflowAtom";
import { useWorkspace } from "@/hooks/useWorkspace";

export default function WorkspaceTabs() {
  const [workspace, setWorkspace] = useImmerAtom(workspaceAtom);
  const [renderedTabs, setRenderedTabs] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editor] = useAtom(drawflowEditorAtom);
  const { updateTabs } = useWorkspace();

  useEffect(() => {
    const pipelineTabs = [];
    let index = 0;
    Object.keys(workspace?.tabs ?? {}).forEach((key) => {
      const pipeline = workspace.tabs[key];
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
    const newTab = renderedTabs[index]?.id;
    const current = workspace.active;

    setWorkspace((draft) => {
      const pos = { x: editor?.canvas_x, y: editor?.canvas_y };
      if (!draft.canvas) {
        draft.canvas = {};
      }
      draft.canvas[current] = { zoom: editor?.zoom, pos: pos };

      draft.active = newTab;
    });

    if (editor && workspace.canvas[newTab]) {
      editor.zoom = workspace.canvas[newTab]?.zoom;
      editor.canvas_x = workspace.canvas[newTab]?.pos.x;
      editor.canvas_y = workspace.canvas[newTab]?.pos.y;
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
      const newTabArray = Object.keys(workspace.tabs).filter(
        (id) => id != deleteTab.id,
      );

      const filteredTabs = newTabArray.reduce((tabs, k) => {
        tabs[k] = workspace.tabs[k];
        return tabs;
      }, {});

      console.log(newTabArray, filteredTabs);

      if (deleteIndex == selectedIndex) {
        if (deleteIndex >= newTabArray.length) {
          deleteIndex = newTabArray.length - 1;
        }
      } else {
        deleteIndex = newTabArray.indexOf(selectedTab.id);
      }

      const newActiveTab = newTabArray[deleteIndex];

      updateTabs(filteredTabs, newActiveTab);
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

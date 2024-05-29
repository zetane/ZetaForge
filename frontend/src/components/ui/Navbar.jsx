import { modalContentAtom } from "@/atoms/modalAtom";
import { darkModeAtom } from "@/atoms/themeAtom";
import { pipelineAtom, pipelineFactory, workspaceAtom } from "@/atoms/pipelineAtom";
import { Play, Password, Renew } from "@carbon/icons-react";
import {
  Header,
  HeaderGlobalBar,
  HeaderMenu,
  HeaderMenuItem,
  HeaderName,
  HeaderNavigation,
  SkipToContent,
} from "@carbon/react";

import { useAtom, useSetAtom } from "jotai";
import LoadBlockButton from "./LoadBlockButton";
import LoadPipelineButton from "./LoadPipelineButton";
import PipelineNameLabel from "./PipelineNameLabel";
import SavePipelineButton from "./SavePipelineButton";
import SaveAsPipelineButton from "./SaveAsPipelineButton";
import RunPipelineButton from "./RunPipelineButton";
import LogsButton from "./LogsButton";
import NewButton from "./NewButton";
import ApiKeysModal from "./modal/ApiKeysModal";
import PipelinesButton from "./PipelinesButton";
import WorkspaceTabs from "./WorkspaceTabs";
import useWebSocket, {ReadyState} from "react-use-websocket";
import { useEffect } from "react";
import { useImmerAtom } from "jotai-immer";
import { PipelineLogs } from "./PipelineLogs";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import StopPipelineButton from "./StopPipelineButton";

const loadNewPipeline = (pipeline) => {
  if (!pipeline )  { return }
  const pipelineData = JSON.parse(pipeline.PipelineJson)

  const bufferPath = `${window.cache.local}${pipelineData.id}`;
  const executionId = pipeline.Execution

  const loadedPipeline = {
    name: pipelineData.name ? pipelineData.name : pipelineData.id,
    path: pipelineData.sink ? pipelineData.sink : null,
    saveTime: Date.now(),
    buffer: bufferPath,
    data: pipelineData.pipeline,
    id: pipelineData.id,
    history: pipelineData.id + "/" + executionId,
    record: pipeline
  }

  const newPipeline = pipelineFactory(window.cache.local, loadedPipeline)

  return newPipeline
};

export default function Navbar({ children }) {
  const [darkMode, setDarkMode] = useAtom(darkModeAtom);
  const [modalContent, setModalContent] = useAtom(modalContentAtom);
  const [workspace, setWorkspace] = useImmerAtom(workspaceAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);

  // TODO: Figure out how to get SQLC to emit the same struct for two different queries
  const { pending, error, data } = useQuery({
    queryKey: ['pipelines'],
    queryFn: async () => { return axios.get(`${import.meta.env.VITE_EXECUTOR}/pipeline/filter?limit=100000&offset=0`)}
  })
  const allPipelines = data?.data;

  useEffect(() => {
    const addPipelines = {}
    const iters = allPipelines || []
    console.log(iters)
    for (const serverPipeline of iters) {
      const loaded = loadNewPipeline(serverPipeline)
      addPipelines[loaded.id] = loaded
    }
    setWorkspace((draft) => {
      const mergedPipelines = Object.assign(draft.pipelines, addPipelines)
      draft.pipelines = mergedPipelines
    })
  }, [allPipelines])

  /*const {pendingRoom, errorRoom, dataRoom }  = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => { return axios.get(`${import.meta.env.VITE_EXECUTOR}/rooms`)}
  })
  const rooms = dataRoom?.data
  useEffect(() => {
    if (!pipeline.socketUrl && rooms?.length > 0) {
      setPipeline((draft) => {
        draft.socketUrl = `${import.meta.env.VITE_WS_EXECUTOR}/ws/${rooms[0]}`;
      })
    }
  }, [rooms])*/

  const modalPopper = (content) => {
    setModalContent({
      ...modalContent,
      show: true,
      content: content,
    });
  };

  const svgOverride = { position: 'absolute', right: '15px', top: '5px'}

  const socket = pipeline?.socketUrl || null

  const { sendMessage, lastMessage, readyState } = useWebSocket(
    socket,
    {
      share: true,
      shouldReconnect: () => false,
    }
  );

  useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      if (pipeline.socketUrl) {
        modalPopper(<PipelineLogs />)
      }
    } else if (readyState === ReadyState.CLOSED) {
      setPipeline((draft) => {
        draft.socketUrl = null;
      })
    }
  }, [readyState]);

  useEffect(() => {
    if (lastMessage !== null) {
      setPipeline((draft) => {
        const mess = JSON.parse(lastMessage.data).content
        const splitMess = mess.split("::::")
        // slices off the []
        const pod = splitMess[0].slice(1, -1)
        const key = pod.split("-").slice(1,).join("-")
        if (draft.data[key]) {
          const node = draft.data[key]
          const message = splitMess[1].trim()
          const tagAndObject = message.split("|||")
          const tag = tagAndObject[0].trim()

          if (tag == "outputs") {
            try {
              const outs = JSON.parse(tagAndObject[1]);
              if (outs && typeof outs === 'object') { // Ensure outs is an object
                for (const [key, value] of Object.entries(outs)) {
                  if (!node.events.outputs) {
                    node.events["outputs"] = {};
                  }
                  node.events.outputs[key] = value;
                }
              }
            } catch (err) {
              console.error('Failed to parse outputs:', err);
            }
          }
          if (tag == "inputs") {
            try {
              const outs = JSON.parse(tagAndObject[1]);
              if (outs && typeof outs === 'object') { // Ensure outs is an object
                for (const [key, value] of Object.entries(outs)) {
                  if (!node.events.inputs) {
                    node.events["inputs"] = {};
                  }
                  node.events["inputs"][key] = value;
                }
              }
            } catch (err) {
              console.error('Failed to parse inputs:', err);
            }
          }

        }
        draft.log = draft.log.concat(`${mess}\n`)
      })
    }
  }, [lastMessage]);



  let runButton =  (
    <RunPipelineButton modalPopper={modalPopper} action="Run">
      <Play size={20} style={svgOverride} />
    </RunPipelineButton>
  )

  if (pipeline?.socketUrl) {
    runButton = (
      <StopPipelineButton />
    )
  }

  return (
    <Header aria-label="ZetaForge" className="flex flex-wrap">
      <SkipToContent />
      <HeaderName prefix="" className="select-none">
        ZetaForge
      </HeaderName>
      <HeaderNavigation aria-label="ZetaForge">
        <HeaderMenu menuLinkName="File">
          <NewButton />
          <SavePipelineButton />
          <SaveAsPipelineButton />
            <LoadPipelineButton  />
            <LoadBlockButton />
        </HeaderMenu>
        <HeaderMenu menuLinkName="Settings">
          <HeaderMenuItem
          onClick={() => modalPopper(<ApiKeysModal />)}>
            <Password  size={16} className="mx-1 align-middle"></Password>
            <span>API Keys</span>
          </HeaderMenuItem>
          <HeaderMenuItem label="Theme" onClick={() => setDarkMode(!darkMode)}>
            Toggle Theme
          </HeaderMenuItem>
        </HeaderMenu>
        <HeaderMenu menuLinkName="Help">
        <HeaderMenuItem onClick={() => window.open('https://github.com/zetane/zetaforge')}>
          GitHub
        </HeaderMenuItem>
        <HeaderMenuItem onClick={() => window.open('https://discord.gg/zetaforge')}>
          Discord
        </HeaderMenuItem>
        <HeaderMenuItem onClick={() => window.open('https://zetane/docs/')}>
          Docs
        </HeaderMenuItem>
        </HeaderMenu>
      </HeaderNavigation>
      <HeaderGlobalBar>
        { runButton }
        <RunPipelineButton modalPopper={modalPopper} action="Rebuild">
          <Renew size={20} style={svgOverride} />
        </RunPipelineButton>
        <LogsButton />
        <PipelinesButton />
      </HeaderGlobalBar>
      <WorkspaceTabs />
      {children}
    </Header>
  );
}

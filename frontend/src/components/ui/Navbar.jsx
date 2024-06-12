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
import LogsButton from "./LogsButton";
import NewButton from "./NewButton";
import ApiKeysModal from "./modal/ApiKeysModal";
import PipelinesButton from "./PipelinesButton";
import WorkspaceTabs from "./WorkspaceTabs";
import useWebSocket, {ReadyState} from "react-use-websocket";
import { useEffect } from "react";
import { useImmerAtom } from "jotai-immer";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import StopPipelineButton from "./StopPipelineButton";
import { useLoadServerPipeline } from "./useLoadPipeline";
import RunPipelineButton from "./RunPipelineButton";
import SaveAsPipelineButton from "./SaveAsPipelineButton";
import SavePipelineButton from "./SavePipelineButton";
import AnvilConfigurationsModal from "./modal/AnvilConfigurationsModal";
import { activeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";

const ONE_SECOND = 1000;

export default function Navbar({ children }) {
  const [darkMode, setDarkMode] = useAtom(darkModeAtom);
  const [modalContent, setModalContent] = useAtom(modalContentAtom);
  const [workspace, setWorkspace] = useImmerAtom(workspaceAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [configuration] = useAtom(activeConfigurationAtom);
  const loadPipeline = useLoadServerPipeline();
  //console.log("ws: ", workspace)

  // TODO: Figure out how to get SQLC to emit the same struct for two different queries
  const { pending, error, data } = useQuery({
    queryKey: ['pipelines', workspace.fetchInterval],
    queryFn: async () => { return axios.get(`http://${configuration.host}:${configuration.anvilPort}/pipeline/filter?limit=100000&offset=0`)},
    refetchInterval: workspace.fetchInterval
  })
  const allPipelines = data?.data;

  useEffect(() => {
    const addPipelines = {}
    const addExecutions = {}
    const iters = allPipelines || []

    setWorkspace((draft) => {
      for (const serverPipeline of iters) {
        const loaded = loadPipeline(serverPipeline, configuration)
        const key = loaded.id + "." + loaded.record.Execution
        draft.pipelines[key] = loaded
        draft.executions[loaded.record.Execution] = loaded
      }
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

  const svgOverride = { position: 'absolute', right: '15px', top: '5px' }

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
        //modalPopper(<PipelineLogs />)
      }
    } else if (readyState === ReadyState.CLOSED) {
    }
  }, [readyState]);

  useEffect(() => {
    if (lastMessage !== null) {
      const content = JSON.parse(lastMessage.data).content
      const {executionId, blockId, message, time, ...jsonObj} = JSON.parse(content)

      setPipeline((draft) => {
        let shouldLog = true

        if (draft.data[blockId]) {
          const node = draft.data[blockId]
          const tagAndObject = message.split("|||")
          const tag = tagAndObject[0].trim()

          if (tag == "debug") {
            shouldLog = false
          }
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

        if (shouldLog) {
          let logString = `[${time}][${executionId}] ${message}`
          if (blockId) {
            logString = `[${time}][${executionId}][${blockId}] ${message}`
          }
          //draft.log.push(logString)
        }
      })
    }
  }, [lastMessage]);



  let runButton =  (
    <RunPipelineButton modalPopper={modalPopper} action="Run">
      <Play size={20} style={svgOverride} />
    </RunPipelineButton>
  )

  if (pipeline?.record?.Status == "Running") {
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
        <HeaderMenu menuLinkName="File" aria-label="File">
          <NewButton />
          <SavePipelineButton />
          <SaveAsPipelineButton />
          <LoadPipelineButton />
          <LoadBlockButton />
        </HeaderMenu>
        <HeaderMenu menuLinkName="Settings" aria-label="Settings">
          <HeaderMenuItem
            onClick={() => modalPopper(<ApiKeysModal />)}>
            <Password size={16} className="mx-1 align-middle"></Password>
            <span>API Keys</span>
          </HeaderMenuItem>
          <HeaderMenuItem
            onClick={() => modalPopper(<AnvilConfigurationsModal />)}>
            Anvil Configurations
          </HeaderMenuItem>
          <HeaderMenuItem label="Theme" onClick={() => setDarkMode(!darkMode)}>
            Toggle Theme
          </HeaderMenuItem>
        </HeaderMenu>
        <HeaderMenu menuLinkName="Help" aria-label="Help">
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

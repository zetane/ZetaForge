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
  SkipToContent
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
import useWebSocket, {ReadyState} from "react-use-websocket";
import { useEffect } from "react";
import { useImmerAtom } from "jotai-immer";
import { PipelineLogs } from "./PipelineLogs";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import StopPipelineButton from "./StopPipelineButton";

export default function Navbar({ children }) {
  const [darkMode, setDarkMode] = useAtom(darkModeAtom);
  const [modalContent, setModalContent] = useAtom(modalContentAtom);
  const [workspace, setWorkspace] = useImmerAtom(workspaceAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);

  useEffect(() => {
    if (workspace && !workspace.active) {
      const newPipeline = pipelineFactory(window.cache.local)
      setWorkspace((draft) => {
        draft.pipelines[newPipeline.id] = newPipeline;
        draft.active = newPipeline.id;
      });
    }
  }, [workspace.active])

  const createNewPipeline = () => {
    const newPipeline = pipelineFactory(window.cache.local);
    setWorkspace((draft) => {
      draft.pipelines[newPipeline.id] = newPipeline;
      draft.active = newPipeline.id;
    });
  };

  const { pending, error, data } = useQuery({
    queryKey: ['pipeline-running'],
    queryFn: async () => { return axios.get(`${import.meta.env.VITE_EXECUTOR}/pipeline/list/Running`)}
  })
  const running = data?.data || [];

  useEffect(() => {
    for (let i = 0; i < running.length; i++) {
      const pipeline = running[i]
      const id = pipeline.Pipeline
      const newPipeline = pipelineFactory(window.local.cache, id)
      const executionId = pipeline.Execution
      newPipeline.record = pipeline
      newPipeline.record.socketUrl = `${import.meta.env.VITE_WS_EXECUTOR}/ws/${executionId}`
      newPipeline.record.history = id + "/" + executionId
      setExecutions((draft) => {
        draft.pipelines[id] = pipeline
      })
    }
  }, [running])

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
    <Header aria-label="ZetaForge">
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
        <PipelineNameLabel />
        <LogsButton />
        <PipelinesButton />
      </HeaderGlobalBar>
      {children}
    </Header>
  );
}

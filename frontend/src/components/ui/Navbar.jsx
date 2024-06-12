import { modalContentAtom } from "@/atoms/modalAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { darkModeAtom } from "@/atoms/themeAtom";
import { Password, Play, Renew } from "@carbon/icons-react";
import {
  Header,
  HeaderGlobalBar,
  HeaderMenu,
  HeaderMenuItem,
  HeaderName,
  HeaderNavigation,
  SkipToContent
} from "@carbon/react";
import { useAtom } from "jotai";
import { useImmerAtom } from "jotai-immer";
import { useEffect } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import LoadBlockButton from "./LoadBlockButton";
import LoadPipelineButton from "./LoadPipelineButton";
import LogsButton from "./LogsButton";
import NewButton from "./NewButton";
import { PipelineLogs } from "./PipelineLogs";
import PipelineNameLabel from "./PipelineNameLabel";
import RunPipelineButton from "./RunPipelineButton";
import SaveAsPipelineButton from "./SaveAsPipelineButton";
import SavePipelineButton from "./SavePipelineButton";
import AnvilConfigurationsModal from "./modal/AnvilConfigurationsModal";
import ApiKeysModal from "./modal/ApiKeysModal";

export default function Navbar({ children }) {
  const [darkMode, setDarkMode] = useAtom(darkModeAtom);
  const [modalContent, setModalContent] = useAtom(modalContentAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);

  const modalPopper = (content) => {
    setModalContent({
      ...modalContent,
      show: true,
      content: content,
    });
  };

  const svgOverride = { position: 'absolute', right: '15px', top: '5px' }

  const { sendMessage, lastMessage, readyState } = useWebSocket(
    pipeline.socketUrl,
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

  return (
    <Header aria-label="ZetaForge">
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
            <HeaderMenuItem onClick={() => window.open('https://zetane.com/docs/')}>
              Docs
            </HeaderMenuItem>
        </HeaderMenu>
      </HeaderNavigation>
      <HeaderGlobalBar>
        <RunPipelineButton modalPopper={modalPopper} action="Run">
          <Play size={20} style={svgOverride} />
        </RunPipelineButton>

        <RunPipelineButton modalPopper={modalPopper} action="Rebuild">
          <Renew size={20} style={svgOverride} />
        </RunPipelineButton>
        <PipelineNameLabel />
        <LogsButton />
      </HeaderGlobalBar>
      {children}
    </Header>
  );
}

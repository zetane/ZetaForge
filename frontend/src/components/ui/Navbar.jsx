import { modalContentAtom } from "@/atoms/modalAtom";
import { darkModeAtom } from "@/atoms/themeAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { Play, Password, Renew } from "@carbon/icons-react";
import {
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderMenu,
  HeaderMenuItem,
  HeaderName,
  HeaderNavigation,
  SkipToContent
} from "@carbon/react";
import { useAtom } from "jotai";
import LoadBlockButton from "./LoadBlockButton";
import LoadPipelineButton from "./LoadPipelineButton";
import PipelineNameLabel from "./PipelineNameLabel";
import SavePipelineButton from "./SavePipelineButton";
import SaveAsPipelineButton from "./SaveAsPipelineButton";
import RunPipelineButton from "./RunPipelineButton";
import LogsButton from "./LogsButton";
import NewButton from "./NewButton";
import ApiKeysModal from "./modal/ApiKeysModal";
import useWebSocket, {ReadyState} from "react-use-websocket";
import { useEffect } from "react";
import { useImmerAtom } from "jotai-immer";
import { PipelineLogs } from "./PipelineLogs";

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

  const svgOverride = { position: 'absolute', right: '15px', top: '5px'}

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
    <Header aria-label="Zetaforge">
      <SkipToContent />
      <HeaderName prefix="" className="select-none">
        Zetaforge
      </HeaderName>
      <HeaderNavigation aria-label="Zetaforge">
        <HeaderMenu menuLinkName="File">
          <NewButton />
          <SavePipelineButton />
          <SaveAsPipelineButton />
          <HeaderMenu menuLinkName="Load" >
            <LoadPipelineButton  />
            <LoadBlockButton />
          </HeaderMenu>
        </HeaderMenu>
        <HeaderMenu menuLinkName="Settings">
          <HeaderMenuItem 
          onClick={() => modalPopper(<ApiKeysModal />)}>
            <Password  size={16} className="mx-1 align-middle"></Password>
            <span>API Keys</span>
          </HeaderMenuItem>
          <HeaderMenuItem label="Theme" onClick={() => setDarkMode(!darkMode)}>
            Theme
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

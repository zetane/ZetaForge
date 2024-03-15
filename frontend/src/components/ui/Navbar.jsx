import { modalContentAtom } from "@/atoms/modalAtom";
import { darkModeAtom } from "@/atoms/themeAtom";
import { Password, Renew } from "@carbon/icons-react";
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
import NewButton from "./NewButton";
import ApiKeysModal from "./modal/ApiKeysModal";
import ClosableModal from "./modal/ClosableModel";
import { PipelineLogs } from "./PipelineLogs";

export default function Navbar({ children }) {
  const [darkMode, setDarkMode] = useAtom(darkModeAtom);
  const [modalContent, setModalContent] = useAtom(modalContentAtom);

  const modalPopper = (content) => {
    setModalContent({
      ...modalContent,
      show: true,
      content: content,
    });
  };


  return (
    <Header aria-label="Zetaforge">
      <SkipToContent />
      <HeaderName prefix="" className="select-none">
        Zetaforge
      </HeaderName>
      <HeaderNavigation aria-label="Zetaforge">
        <HeaderMenu menuLinkName="File">
          <NewButton/>
          <SavePipelineButton />
          <SaveAsPipelineButton />
          <HeaderMenu menuLinkName="Load" >
            <LoadPipelineButton  />
            <LoadBlockButton />
          </HeaderMenu>
        </HeaderMenu>
        <HeaderMenu menuLinkName="Inspect">
          <HeaderMenuItem
            label="Run Logs"
            onClick={() => modalPopper(<PipelineLogs />)}
          >
            Run Logs
          </HeaderMenuItem>
          <HeaderMenuItem
            label="Pipeline"
            onClick={() => modalPopper(<PipelineLogs />)}
          >
            Pipeline
          </HeaderMenuItem>
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
          <HeaderMenuItem label="Log Out">Log Out</HeaderMenuItem>
        </HeaderMenu>
      </HeaderNavigation>
      <HeaderGlobalBar>
        <PipelineNameLabel />
        <RunPipelineButton />
        <HeaderGlobalAction aria-label="Rebuild">
          <Renew size={20} />
        </HeaderGlobalAction>
      </HeaderGlobalBar>
      {children}
    </Header>
  );
}

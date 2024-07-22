import { modalContentAtom } from "@/atoms/modalAtom";
import { darkModeAtom } from "@/atoms/themeAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
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
import { useAtom } from "jotai";
import LoadBlockButton from "./LoadBlockButton";
import LoadPipelineButton from "./LoadPipelineButton";
import LogsButton from "./LogsButton";
import NewButton from "./NewButton";
import ApiKeysModal from "./modal/ApiKeysModal";
import PipelinesButton from "./PipelinesButton";
import { useImmerAtom } from "jotai-immer";
import RunPipelineButton from "./RunPipelineButton";
import SaveAsPipelineButton from "./SaveAsPipelineButton";
import SavePipelineButton from "./SavePipelineButton";
import AnvilConfigurationsModal from "./modal/AnvilConfigurationsModal";
import { activeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";
import { PipelineStopButton } from "./PipelineStopButton";

export default function Navbar({ children }) {
  const [darkMode, setDarkMode] = useAtom(darkModeAtom);
  const [modalContent, setModalContent] = useAtom(modalContentAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [configuration] = useAtom(activeConfigurationAtom);

  const modalPopper = (content) => {
    setModalContent({
      ...modalContent,
      show: true,
      content: content,
    });
  };

  const svgOverride = { position: "absolute", right: "15px", top: "5px" };

  let runButton = (
    <RunPipelineButton modalPopper={modalPopper} action="Run">
      <Play size={20} style={svgOverride} />
    </RunPipelineButton>
  );

  if (
    pipeline?.record?.Status == "Running" ||
    pipeline?.record?.Status == "Pending"
  ) {
    runButton = (
      <PipelineStopButton
        executionId={pipeline?.record?.Execution}
        configuration={configuration}
      />
    );
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
          <HeaderMenuItem onClick={() => modalPopper(<ApiKeysModal />)}>
            <Password size={16} className="mx-1 align-middle"></Password>
            <span>API Keys</span>
          </HeaderMenuItem>
          <HeaderMenuItem
            onClick={() => modalPopper(<AnvilConfigurationsModal />)}
          >
            Anvil Configurations
          </HeaderMenuItem>
          <HeaderMenuItem label="Theme" onClick={() => setDarkMode(!darkMode)}>
            Toggle Theme
          </HeaderMenuItem>
        </HeaderMenu>
        <HeaderMenu menuLinkName="Help" aria-label="Help">
          <HeaderMenuItem
            onClick={() => window.open("https://github.com/zetane/zetaforge")}
          >
            GitHub
          </HeaderMenuItem>
          <HeaderMenuItem
            onClick={() => window.open("https://discord.gg/zetaforge")}
          >
            Discord
          </HeaderMenuItem>
          <HeaderMenuItem
            onClick={() => window.open("https://zetane.com/docs/")}
          >
            Docs
          </HeaderMenuItem>
        </HeaderMenu>
      </HeaderNavigation>
      <HeaderGlobalBar>
        {runButton}
        <RunPipelineButton modalPopper={modalPopper} action="Rebuild">
          <Renew size={20} style={svgOverride} />
        </RunPipelineButton>
        <LogsButton />
        <PipelinesButton />
      </HeaderGlobalBar>
      {children}
    </Header>
  );
}

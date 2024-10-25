import { modalContentAtom } from "@/atoms/modalAtom";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { Play, Password, Renew, Switcher as SwitchIcon, ChevronDown, ChevronRight } from "@carbon/icons-react";
import {
  Button,
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderMenu,
  HeaderMenuButton,
  HeaderMenuItem,
  HeaderName,
  HeaderNavigation,
  HeaderPanel,
  HeaderSideNavItems,
  SideNav,
  SideNavItems,
  SkipToContent,
  Switcher,
  SwitcherDivider,
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
import ToggleThemeButton from "./ToggleThemeButton";
import { useEffect, useState } from "react";

export default function Navbar({ children }) {
  const [modalContent, setModalContent] = useAtom(modalContentAtom);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const [configuration] = useAtom(activeConfigurationAtom);

  const [isSideNavExpanded, setIsSideNavExpanded] = useState(false);
  const [isHeaderPanelExpanded, setIsHeaderPanelExpanded] = useState(false);

  const handleSideNavToggle = () => {
    setIsSideNavExpanded((prev) => !prev);
  };

  const handleHeaderPanelToggle = () => {
    setIsHeaderPanelExpanded((prev) => !prev);
  };

  useEffect(() => {
    const handleNavResize = () => {
      if (window.innerWidth > 1055 && isSideNavExpanded) {
        setIsSideNavExpanded(false);
      }
    };
    window.addEventListener('resize', handleNavResize);
    handleNavResize();
    return () => window.removeEventListener('resize', handleNavResize);
  }, [isSideNavExpanded]);

  useEffect(() => {
    const handlePanelResize = () => {
      if (window.innerWidth > 1102 && isHeaderPanelExpanded) {
        setIsHeaderPanelExpanded(false);
      }
    };
    window.addEventListener('resize', handlePanelResize);
    handlePanelResize();
    return () => window.removeEventListener('resize', handlePanelResize);
  }, [isHeaderPanelExpanded]);
  

  const modalPopper = (content) => {
    setModalContent({
      ...modalContent,
      show: true,
      content: content,
    });
  };

  const svgOverride = { position: "absolute", right: "15px", top: "5px" };

  let hostString = `@${configuration?.anvil?.host}`;
  let runAction = `Run ${hostString}`;

  let runButton = (
    <RunPipelineButton modalPopper={modalPopper} action={runAction}>
      {/* mobile={true} */}
      {/* <Play size={20} /> */}
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
    <Header aria-label="ZetaForge" className="flex flex-wrap min-w-[274px]">
      <SkipToContent />
      {/* <HeaderMenuButton aria-label={isSideNavExpanded ? 'Close menu' : 'Open menu'} onClick={handleSideNavToggle} isActive={isSideNavExpanded} aria-expanded={isSideNavExpanded} className="h-[47px]" /> */}
      <HeaderName prefix="" className="select-none">
        ZetaForge
        <Button
          renderIcon={isSideNavExpanded ? ChevronRight : ChevronDown}
          className="ztn--dropdown-menu-btn min-[1056px]:hidden"
          kind="ghost"
          onClick={handleSideNavToggle} 
        />
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
          <HeaderMenuItem onClick={(e) => e.preventDefault()}>
            <ToggleThemeButton />
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
      <SideNav aria-label="Side navigation" expanded={isSideNavExpanded} isPersistent={false} aria-expanded={isSideNavExpanded} onSideNavBlur={handleSideNavToggle} className="ztn--side-nav">
        <SideNavItems className={!isSideNavExpanded ? "hidden" : ""}>
          <HeaderSideNavItems>
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
              <HeaderMenuItem onClick={(e) => e.preventDefault()}>
                <ToggleThemeButton />
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
          </HeaderSideNavItems>
        </SideNavItems>
      </SideNav>
      {/* <HeaderGlobalBar className="!justify-center pr-[18px]"> */}
      <HeaderGlobalBar className="!justify-end pr-[18px]">
        {/* <ToggleThemeButton /> */}
        <div className="max-[1102px]:hidden">
          {runButton}
          <RunPipelineButton modalPopper={modalPopper} action="Rebuild">
            <Renew size={20} style={svgOverride} />
          </RunPipelineButton>
          <LogsButton />
          <PipelinesButton />
        </div>
        <div className="min-[1103px]:hidden">
          <HeaderGlobalAction aria-label="ZetaForge Options" aria-expanded={isHeaderPanelExpanded} isActive={isHeaderPanelExpanded} onClick={handleHeaderPanelToggle} tooltipAlignment="end" id="switcher-button">
            <SwitchIcon size={20} />
          </HeaderGlobalAction>
        </div>
      </HeaderGlobalBar>
      <HeaderPanel expanded={isHeaderPanelExpanded} onHeaderPanelFocus={handleHeaderPanelToggle} className="z-[9000]">
        <Switcher aria-label="Switcher Container" expanded={isHeaderPanelExpanded} className="grid grid-cols-2 max-w-[254px] place-items-center">
            <div className="p-4">
              {runButton}
            </div>
         
            <div className="p-4">
              <RunPipelineButton modalPopper={modalPopper} action="Rebuild" mobile={true}>
                <Renew size={20} />
              </RunPipelineButton>
            </div>
       
            <div className="p-4">
              <LogsButton mobile={true} />
            </div>

            <div className="p-4">
              <PipelinesButton mobile={true} />
            </div>
        </Switcher>
      </HeaderPanel>
      {children}
    </Header>
  );
}

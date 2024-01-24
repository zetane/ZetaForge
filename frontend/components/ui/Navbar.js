"use client";

import { modalContentAtom } from "@/atoms/modalAtom";
import { darkModeAtom } from "@/atoms/themeAtom";
import { PlayFilledAlt, Renew } from "@carbon/icons-react";
import {
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderMenu,
  HeaderMenuItem,
  HeaderName,
  HeaderNavigation,
  SkipToContent,
} from "@carbon/react";
import { useAtom } from "jotai";
import LoadPipelineButton from "./LoadPipelineButton";
import PipelineNameLabel from "./PipelineNameLabel";
import SavePipelineButton from "./SavePipelineButton";
import RunPipelineButton from "./RunPipelineButton";

export default function Navbar({ children }) {
  const [darkMode, setDarkMode] = useAtom(darkModeAtom);
  const [modalContent, setModalContent] = useAtom(modalContentAtom);

  const modalPopper = (title) => {
    setModalContent({
      show: true,
      content: modalContent.content,
      modalHeading: title,
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
          <HeaderMenuItem>New</HeaderMenuItem>
          <SavePipelineButton />
          <LoadPipelineButton />
        </HeaderMenu>
        <HeaderMenu menuLinkName="Inspect">
          <HeaderMenuItem
            label="Previous Run"
            onClick={() => modalPopper("Previous Run")}
          >
            Previous Run
          </HeaderMenuItem>
          <HeaderMenuItem
            label="Pipeline"
            onClick={() => modalPopper("Pipeline")}
          >
            Pipeline
          </HeaderMenuItem>
        </HeaderMenu>
        <HeaderMenu menuLinkName="Settings">
          <HeaderMenuItem label="Api Keys">Api Keys</HeaderMenuItem>
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

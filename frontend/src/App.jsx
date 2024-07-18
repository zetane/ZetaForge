import ProviderInjector from "@/components/ProviderInjector";
import BlockEditorPanel from "@/components/ui/BlockEditorPanel";
import DrawflowWrapper from "@/components/ui/DrawflowWrapper";
import ForgeTheme from "@/components/ui/ForgeTheme";
import MainContent from "@/components/ui/MainContent";
import Navbar from "@/components/ui/Navbar";
import LibraryFetcher from "@/components/ui/library/LibraryFetcher";
import LibrarySwitcher from "@/components/ui/library/LibrarySwitcher";
import ModalWrapper from "@/components/ui/modal/ModalWrapper";
import ToastWrapper from "@/components/ui/ToastWrapper";
import WorkspaceTabs from "@/components/ui/WorkspaceTabs";
import WorkspaceFetcher from "@/components/ui/WorkspaceFetcher";
import SocketFetcher from "@/components/ui/SocketFetcher";

import "./styles/globals.scss";

export default function App() {
  return (
    <ProviderInjector>
      <ForgeTheme>
        <Navbar>
          <WorkspaceTabs />
          <LibraryFetcher />
          <BlockEditorPanel />
        </Navbar>
        <LibrarySwitcher />
        <MainContent>
          <DrawflowWrapper />
        </MainContent>
        <ModalWrapper />
        <ToastWrapper />
        <SocketFetcher />
        <WorkspaceFetcher />
      </ForgeTheme>
    </ProviderInjector>
  );
}

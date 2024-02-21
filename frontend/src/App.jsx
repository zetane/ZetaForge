import ProviderInjector from '@/components/ProviderInjector';
import BlockEditorPanel from '@/components/ui/BlockEditorPanel';
import DrawflowWrapper from '@/components/ui/DrawflowWrapper';
import ForgeTheme from '@/components/ui/ForgeTheme';
import MainContent from '@/components/ui/MainContent';
import ModalWrapper from '@/components/ui/ModalWrapper';
import Navbar from '@/components/ui/Navbar';
import LibraryFetcher from '@/components/ui/library/LibraryFetcher';
import LibrarySwitcher from '@/components/ui/library/LibrarySwitcher';
import './styles/globals.scss';

export default function App() {
  return (
      <ProviderInjector>
        <ForgeTheme>
          <Navbar>
            <LibraryFetcher />
          </Navbar>
          <LibrarySwitcher />
          <MainContent>
            <DrawflowWrapper />
            <BlockEditorPanel />
          </MainContent>
          <ModalWrapper />
        </ForgeTheme>
      </ProviderInjector>
  );
}

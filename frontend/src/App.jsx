import './styles/globals.scss';
import Navbar from '@/components/ui/Navbar';
import ForgeTheme from '@/components/ui/ForgeTheme';
import MainContent from '@/components/ui/MainContent';
import ModalWrapper from '@/components/ui/ModalWrapper';
import LibraryFetcher from '@/components/ui/library/LibraryFetcher';
import LibrarySwitcher from '@/components/ui/library/LibrarySwitcher';
import DrawflowWrapper from '@/components/ui/DrawflowWrapper';
import ProviderInjector from '@/components/ProviderInjector';

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
          </MainContent>
          <ModalWrapper />
        </ForgeTheme>
      </ProviderInjector>
  );
}

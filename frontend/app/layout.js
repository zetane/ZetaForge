import '@/styles/globals.scss';
import Navbar from '@/components/ui/Navbar';
import ForgeTheme from '@/components/ui/ForgeTheme';
import MainContent from '@/components/ui/MainContent';
import ModalWrapper from '@/components/ui/ModalWrapper';
import LibraryFetcher from '@/components/ui/library/LibraryFetcher';
import LibrarySwitcher from '@/components/ui/library/LibrarySwitcher';
import ProviderInjector from '@/components/ProviderInjector';

export default function MainLayout({ children }) {
  return (
    <html lang='en' >
      <ProviderInjector>
        <ForgeTheme>
          <Navbar>
            <LibraryFetcher />
          </Navbar>
          <LibrarySwitcher />
          <MainContent>
            {children}
          </MainContent>
          <ModalWrapper />
        </ForgeTheme>
      </ProviderInjector>
    </html>
  );
}

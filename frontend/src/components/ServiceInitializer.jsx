import React, { useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import { mixpanelAtom } from "@/atoms/mixpanelAtom";
import { initializeWorkspaceAtom, workspaceAtom } from "@/atoms/pipelineAtom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ipcLink } from "electron-trpc/renderer";
import { trpc } from "@/utils/trpc";
import MixpanelService from "@/components/ui/MixpanelService";

export const trpcClient = trpc.createClient({
  links: [ipcLink()],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "offlineFirst",
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});

export default function ServiceInitializer({ children }) {
  const [workspace, _] = useAtom(workspaceAtom);
  const initializeWorkspace = useSetAtom(initializeWorkspaceAtom);
  const setMixpanel = useSetAtom(mixpanelAtom);

  useEffect(() => {
    const initializeServices = async () => {
      // Initialize workspace
      if (!workspace?.active) {
        const cachePath = await window.cache.local();
        await initializeWorkspace({ cachePath });
      }

      // Initialize Mixpanel
      const val = import.meta.env.VITE_DISABLE_MIXPANEL;
      const disable = val === "True";
      const mixpanelService = new MixpanelService(
        "4c09914a48f08de1dbe3dc4dd2dcf90d",
        disable,
      );
      setMixpanel(mixpanelService);
    };

    initializeServices();
  }, [initializeWorkspace, setMixpanel]);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}

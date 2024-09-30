

export const useUnifiedLogs = () => {
  const [pipeline, _] = useAtom(pipelineAtom);


  return {
    updateLogs: updateLogs,
  };
};

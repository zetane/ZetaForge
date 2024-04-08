
export default function RebuildPipelineButton({modalPopper}) {
  const [shouldConnect, setShouldConnect] = useState(false);

  return (
    <HeaderGlobalAction aria-label="Rebuild" disabled={shouldConnect} >
      <Button onClick={() => { runPipeline(editor, pipeline) }}>
        <span>Run</span>
        <PlayFilledAlt size={20} style={styles} />
      </Button>
    </HeaderGlobalAction>
  );
}
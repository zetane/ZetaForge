import { Button } from "@carbon/react";
import { useAtom } from "jotai";
import { modalContentAtom } from "@/atoms/modalAtom";
import { ExecutionDataGrid } from "@/components/ui/ExecutionDataGrid";
import { lineageAtom } from "@/atoms/pipelineAtom";

export default function PipelinesButton() {
  const [modalContent, setModalContent] = useAtom(modalContentAtom);
  const [lineage] = useAtom(lineageAtom);

  const modalPopper = (content) => {
    setModalContent({
      ...modalContent,
      show: true,
      content: content,
    });
  };

  const closeModal = () => {
    setModalContent({
      show: false,
    });
  };

  const styles = {
    margin: "5px",
  };

  let grid = <ExecutionDataGrid closeModal={closeModal} />;

  const svgOverride = { position: "absolute", right: "15px", top: "5px" };
  return (
    <Button
      style={styles}
      size="sm"
      kind="secondary"
      onClick={() => modalPopper(grid)}
    >
      Pipelines ({lineage?.size})
    </Button>
  );
}

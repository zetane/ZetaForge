import { modalContentAtom } from "@/atoms/modalAtom";
import { Modal } from "@carbon/react";
import { useAtom } from "jotai";

export default function ModalWrapper({children}) {
  const [modalContent, setModalContent] = useAtom(modalContentAtom)
  return (
    <Modal 
      open={modalContent.show} 
      onRequestClose={(event) => {setModalContent({show: false, 
        content: modalContent.content,
        modalHeading: modalContent.modalHeading
      })}}
      modalHeading={modalContent.modalHeading}
      primaryButtonText="Close"
      >
        {modalContent.content}
    </Modal>
  )
}
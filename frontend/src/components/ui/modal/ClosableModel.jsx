import { modalContentAtom } from "@/atoms/modalAtom"
import { Modal } from "@carbon/react"
import { useAtom } from "jotai"

export default function ClosableModal(props) {
  const [modalContent, setModalContent] = useAtom(modalContentAtom)
  const {children, ...modalProps} = props

  const closeModal = (event) => {
    setModalContent({
      ...modalContent.content,
      show: false, 
    })
  }

  return (
    <Modal 
      open={modalContent.show} 
      onRequestClose={closeModal}
      {...modalProps}
    >
      {children}
    </ Modal>
  )
}
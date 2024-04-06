import { openAIApiKeyAtom } from "@/atoms/apiKeysAtom";
import { modalContentAtom } from "@/atoms/modalAtom";
import { TextInput } from "@carbon/react";
import { useAtom } from "jotai";
import { useState } from "react";
import ClosableModal from "./ClosableModal";

export default function ApiKeysModal() {
  const [modalContent, setModalContent] = useAtom(modalContentAtom);
  const [openAIApiKey, setOpenApiKey] = useAtom(openAIApiKeyAtom);
  const [openAIApiKeyInput, setOpenAIApiKeyInput] = useState(openAIApiKey);
 
  const saveKeys = () => {
    setOpenApiKey(openAIApiKeyInput);
    setModalContent({
      ...modalContent,
      show: false
    });
  }

  const onApiKeyChange = (e) => {
    setOpenAIApiKeyInput(e.target.value);
  }
  
  return (
    <ClosableModal 
      modalHeading="API Keys" 
      onRequestSubmit={saveKeys}
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      size="xs"
    >
      <TextInput labelText="Active OpenAI" value={openAIApiKeyInput} onChange={onApiKeyChange}></TextInput>
    </ClosableModal>
  )
}
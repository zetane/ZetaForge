import { atomWithStorage } from "jotai/utils";

const openAIApiKeyAtom = atomWithStorage("openAIApiKey", "");

export { openAIApiKeyAtom };

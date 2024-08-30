import { useState } from "react";

export default function useSelectPrompt() {
  const [prompt, setPrompt] = useState();
  const [index, setIndex] = useState();
  const selected = Boolean(prompt);

  const select = (prompt, index) => {
    setPrompt(prompt);
    setIndex(index);
  }

  const unselect = () => {
    setPrompt(undefined);
  }

  return {
    ...prompt,
    index,
    selected,
    select,
    unselect
  }
}

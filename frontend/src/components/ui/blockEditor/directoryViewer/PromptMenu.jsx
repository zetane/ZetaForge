import { OverflowMenu, OverflowMenuItem } from "@carbon/react";

export default function PromptMenu({response, onSelectPrompt}) {
  // const updateHistory = trpc.chat.history.update.useMutation({
  //   onSuccess(input) {
  //     utils.chat.history.get.invalidate({ blockPath });
  //   },
  // });
  //
  // const updateIndex = trpc.chat.index.update.useMutation({
  //   onSuccess(input) {
  //     utils.chat.index.get.invalidate({ blockPath });
  //   },
  // });
  const handleActivate = () => {
    onSelectPrompt(response)
  }

  const handleDelete = () => {
  }

  return (
    <OverflowMenu aria-label="overflow-menu" data-floating-menu-container="cds--header-panel" flipped>
      <OverflowMenuItem itemText="Activate" onClick={handleActivate}/>
      <OverflowMenuItem itemText="Delete" onClick={handleDelete}/>
    </OverflowMenu>
  )
}

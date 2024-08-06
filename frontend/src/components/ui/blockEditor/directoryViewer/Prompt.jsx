import { Button } from "@carbon/react";
import { OverflowMenuVertical } from "@carbon/icons-react";

export default function Prompt({children}) {
  return (
  <div>
      <Button renderIcon={OverflowMenuVertical} kind="ghost" hasIconOnly />

      {children}
  </div>
  );
}

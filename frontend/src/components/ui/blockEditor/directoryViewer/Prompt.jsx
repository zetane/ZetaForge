import { Button } from "@carbon/react";
import { OverflowMenuHorizontal } from "@carbon/icons-react";

export default function Prompt({ children }) {
  return (
    <div className="relative min-h-12 p-3 rounded-lg prompt">
      <div className="absolute top-0 right-0">
        <Button renderIcon={OverflowMenuHorizontal} kind="ghost" hasIconOnly />
      </div>
      {children}
    </div>
  );
}


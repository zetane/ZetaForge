import {
  useFloating,
  autoUpdate,
  offset,
  shift,
  flip,
  arrow,
  FloatingPortal,
} from "@floating-ui/react";
import { useState } from "react";
import { Theme, useTheme } from "@carbon/react";

const TooltipContent = ({ children, className = "" }) => (
  <div
    className={`tooltip pointer-events-none fixed z-[100] max-w-xs rounded px-2 py-1 text-sm shadow-lg`}
  >
    {children}
  </div>
);

export const ResourceTooltip = ({
  children,
  content,
  icon: Icon,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();
  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      offset(8),
      flip({
        // Prefer top and left placements
        fallbackPlacements: ["top", "left", "bottom", "right"],
      }),
      shift(),
    ],
    whileElementsMounted: autoUpdate,
    placement: "top",
  });

  return (
    <div className="flex items-center gap-2">
      {children}
      <div
        ref={refs.setReference}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="flex h-6 w-6 cursor-help justify-center p-1"
      >
        {Icon && (
          <div
            className={`relative z-10 flex h-6 w-6 cursor-help justify-center p-1 ${className}`}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <FloatingPortal>
        {isOpen && (
          <Theme theme={theme}>
            <div
              ref={refs.setFloating}
              style={{
                ...floatingStyles,
                zIndex: 9999,
              }}
            >
              <TooltipContent>{content}</TooltipContent>
            </div>
          </Theme>
        )}
      </FloatingPortal>
    </div>
  );
};

export function Tooltip({ children, label, className }) {
  className = `invisible absolute left-0 top-[24px] group-hover:visible ${className}`;
  return (
    <div className="group relative">
      {children}
      <div className={className}>
        <div className="tooltip">{label}</div>
      </div>
    </div>
  );
}

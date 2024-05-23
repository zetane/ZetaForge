import { flip, offset, shift, useFloating, useFocus, useHover, useInteractions, useRole } from "@floating-ui/react";
import { useState } from "react";

export default function Tooltip({ children, label }) {
  const [isOpen, setIsOpen] = useState(true);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(), flip(), shift()]
  })

  const hover = useHover(context, {
    move: false
  });
  const focus = useFocus(context);
  const role = useRole(context, {
    role: "tooltip",
    label: "label"
  })

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    role
  ])

  console.log(floatingStyles)
  console.log(getFloatingProps())
  return <div ref={refs.setReference} {...getReferenceProps()}>
    {children}
    {isOpen &&
      <span
        ref={refs.setFloating}
        style={floatingStyles}
        {...getFloatingProps()}
        className="absolute tooltip-text">
        <span className="fixd tooltip-text">
          {label}
        </span>
      </span>
    }
  </div >
}
import { OverflowMenuItem } from "@carbon/react";

export default function OverflowMenuIconItem({ children, icon, ...rest }) {
  const Icon = icon;
  const itemText = (
    <>
      <Icon />
      <span className="px-2">{children}</span>
    </>
  );
  return <OverflowMenuItem itemText={itemText} {...rest} />;
}

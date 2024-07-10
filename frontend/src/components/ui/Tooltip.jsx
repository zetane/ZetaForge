export default function Tooltip({ children, label }) {
  return (
    <div className="group">
      {children}
      <div className="invisible absolute left-0 top-[24px] group-hover:visible">
        <div className="tooltip">{label}</div>
      </div>
    </div>
  );
}

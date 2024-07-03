export default function Tooltip({ children, label }) {
  return (
    <div className="group">
      {children}
      <span className="invisible absolute -bottom-2 left-0 group-hover:visible">
        <span className="tooltip fixed">{label}</span>
      </span>
    </div>
  );
}

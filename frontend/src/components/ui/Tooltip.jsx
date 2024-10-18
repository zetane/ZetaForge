export default function Tooltip({ children, label, className }) {
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

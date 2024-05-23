
export default function Tooltip({ children, label }) {

  return (
    <div className="group">
      {children}
      <span
        className="absolute invisible group-hover:visible -bottom-2 left-0">
        <span className="fixed tooltip">
          {label}
        </span>
      </span>
    </div >
  )
}
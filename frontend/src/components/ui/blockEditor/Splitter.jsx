const Splitter = ({ onDrag }) => {
  const startDragging = (e) => {
    e.preventDefault();
    document.body.style.cursor = "ew-resize"; // Set cursor style for the whole document
    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", stopDragging);
  };

  const stopDragging = () => {
    document.body.style.cursor = ""; // Revert cursor style back to default
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", stopDragging);
  };

  return (
    <div
      className="mx-2 w-px cursor-ew-resize bg-black"
      onMouseDown={startDragging}
    />
  );
};

export default Splitter;

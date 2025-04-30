"use client";

import { useRef, useState } from "react";

export default function DraggableAnywhere() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 100, y: 100 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    const rect = boxRef.current?.getBoundingClientRect();
    if (rect) {
      setOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      setPos({
        x: e.clientX - offset.x,
        y: e.clientY - offset.y,
      });
    }
  };

  const onMouseUp = () => {
    setDragging(false);
  };

  return (
    <div
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        ref={boxRef}
        onMouseDown={onMouseDown}
        style={{
          position: "absolute",
          left: pos.x,
          top: pos.y,
          width: 100,
          height: 100,
          backgroundColor: "skyblue",
          cursor: "grab",
          userSelect: "none",
        }}
      >
        Drag Me
      </div>
    </div>
  );
}
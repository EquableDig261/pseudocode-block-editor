"use client";

import { useState, useRef, useEffect } from "react";

type Box = {
  id: number;
  x: number;
  y: number;
  isOriginal: boolean;
};

type BoxStack = {
    boxes: Box[];
    isDragging: boolean;
};

export default function DraggableAnywhere() {
  const containerRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const boxRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const [boxes, setBoxes] = useState<BoxStack[]>([{
    boxes: [{ id: 0, x: 100, y: 100, isOriginal: true }],
    isDragging: false,
  }]);

  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [targetBox, setTargetBox] = useState<Box | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingId === null || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - containerRect.left - offset.x;
      const y = e.clientY - containerRect.top - offset.y;
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;

      setBoxes(prev =>
        prev.map(boxStack => {
            if (boxStack.isDragging) {
                return {
                    boxes: boxStack.boxes.map((box, index) => ({ ...box, x, y: y + 100 * index })),
                    isDragging: boxStack.isDragging
                };
            } else {
                return boxStack;
            }
          }
        )
      );

      let closestTarget: Box | null = null;

      // Make sure we're using the latest state of boxes, not the closure value
      const currentBoxes = boxes;
      currentBoxes.forEach(boxStack => {
        // Check if boxStack and boxStack.boxes exist and have elements
        if (!boxStack || !boxStack.boxes || boxStack.boxes.length === 0) return;
        
        const box = boxStack.boxes[boxStack.boxes.length - 1];
        // Make sure box exists before trying to access its properties
        if (!box) return;
        
        if (boxStack.isDragging || box.isOriginal) return;
        if (Math.abs(box.x + 50 - mouseX) < 50 && Math.abs(box.y + 150 - mouseY) < 50 && (closestTarget === null || Math.hypot(box.x + 50 - mouseX, box.y + 150 - mouseY) < Math.hypot(closestTarget.x + 50 - mouseX, closestTarget.y + 150 - mouseY))) {
            closestTarget = box;
        }
      });

      setTargetBox(closestTarget);
    };

    const handleMouseUp = () => {
      if (targetBox !== null) {
        setBoxes(prevBoxes => {
          const r =  prevBoxes.map(boxStack => {
              const draggingBoxStack = prevBoxes.find(boxStack => boxStack.isDragging);
              if (!draggingBoxStack) return boxStack;
            if (boxStack.boxes.find(box => box === targetBox)) {
              return {
                  boxes: boxStack.boxes.concat(draggingBoxStack.boxes.map((box, index) => {
                        return {
                            ...box,
                            x: targetBox.x,
                            y: targetBox.y + 100 * (index + 1)
                        };
                    })),
                    isDragging: false,
              };
            }
            return boxStack;
          })
          r.splice(prevBoxes.findIndex(boxStack => boxStack.isDragging), 1);
          return r;
        });
      } else {
        setBoxes(prevBoxes => {
          return prevBoxes.map(boxStack => {
            if (boxStack.isDragging) {
              return {
                ...boxStack,
                isDragging: false
              };
            }
            return boxStack;
          });
        });
      }
      
      setTargetBox(null);
      setDraggingId(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [boxes, draggingId, offset, targetBox]);

  const onMouseDown = (e: React.MouseEvent, id: number) => {
    const ref = boxRefs.current[id];
    if (!ref || !containerRef.current) return;

    const boxRect = ref.getBoundingClientRect();
    const offsetX = e.clientX - boxRect.left;
    const offsetY = e.clientY - boxRect.top;

    setOffset({ x: offsetX, y: offsetY });

    const targetBox = boxes.flatMap(boxStack => boxStack.boxes).find(box => box.id === id);
    if (!targetBox) return;

    // If original, create a clone and drag the clone instead
    if (targetBox.isOriginal) {
      const cloneId = nextId.current++;
      const clone: BoxStack = {
        boxes: [{
          id: cloneId,
          x: targetBox.x,
          y: targetBox.y,
          isOriginal: false,
        }],
        isDragging: true,
      }
      setBoxes(prev => [...prev, clone]);
      setDraggingId(cloneId);
    } else {
      // Find the box stack containing the target box
      const boxStackIndex = boxes.findIndex(boxStack => 
        boxStack.boxes.some(box => box.id === id)
      );
      
      if (boxStackIndex === -1) return;
      
      // Create new array to avoid mutating state directly
      setBoxes(prev => {
        const newBoxes = [...prev];
        const originalBoxStack = {...newBoxes[boxStackIndex]};
        console.log(boxes);
        // Find the index of the target box within its box stack
        const boxIndex = originalBoxStack.boxes.findIndex(box => box.id === id);
        
        // Split the boxes at the point of the clicked box
        const remainingBoxes = originalBoxStack.boxes.slice(0, boxIndex);
        const draggedBoxes = originalBoxStack.boxes.slice(boxIndex);
        
        // Update the original box stack to contain only the remaining boxes
        newBoxes[boxStackIndex] = {
          ...originalBoxStack,
          boxes: remainingBoxes
        };
        
        // If there are no boxes left in the original stack, remove it
        if (remainingBoxes.length === 0) {
          newBoxes.splice(boxStackIndex, 1);
        }
        
        // Create a new box stack with the dragged boxes
        const newBoxStack: BoxStack = {
          boxes: draggedBoxes,
          isDragging: true
        };
        
        // Add the new box stack
        newBoxes.push(newBoxStack);
        
        setDraggingId(id);
        return newBoxes;
      });
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#f8f9fa",
      }}
    >
      {boxes.flatMap(boxStack => boxStack.boxes).map((box) => (
        <div
          key={box.id}
          ref={(el) => (boxRefs.current[box.id] = el)}
          onMouseDown={(e) => onMouseDown(e, box.id)}
          style={{
            position: "absolute",
            left: box.x,
            top: box.y,
            width: 100,
            height: 100,
            backgroundColor: box.isOriginal ? "skyblue" : "lightgreen",
            cursor: draggingId === box.id ? "grabbing" : "grab",
            userSelect: "none",
            zIndex: 10,
          }}
        >
          {box.isOriginal ? "Original" : "Clone"}
        </div>
      ))}
      {targetBox && (
        <div
            style={{
            position: "absolute",
            left: targetBox.x,
            top: targetBox.y + 100,
            width: 100,
            height: 100,
            backgroundColor: "rgba(128, 128, 128, 0.5)", // gray translucent
            pointerEvents: "none",
            zIndex: 5,
            }}
        />
        )}
    </div>
  );
}
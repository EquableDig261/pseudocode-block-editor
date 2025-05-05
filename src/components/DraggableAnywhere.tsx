"use client";

import { useState, useRef, useEffect } from "react";

type Box = {
  id: number;
  x: number;
  y: number;
  isOriginal: boolean;
  height: number;
  color: string;
  text: string;
  indentation: number;
  type: string;
};

type BoxStack = {
  boxes: Box[];
  isDragging: boolean;
};

const BOX_HEIGHT = 20;

export default function DraggableAnywhere() {
  const containerRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(2);
  const boxRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const isHandlingMouseUp = useRef(false);
  const mouseMoveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  const mouseUpHandlerRef = useRef<(() => void) | null>(null);

  const [boxes, setBoxes] = useState<BoxStack[]>([
    {
      boxes: [{ id: 0, x: 100, y: 100, isOriginal: true, height: 0, color: "skyblue", text: "Display", indentation: 0, type: "block"}],
      isDragging: false,
    },
    {
      boxes: [
        { id: 1, x: 100, y: 250, isOriginal: true, height: 0, color: "lightgreen", text: "IF", indentation: 0, type: "wrapper"},
        { id: 2, x: 100, y: 250 + BOX_HEIGHT, isOriginal: true, height: 0, color: "lightgreen", text: "END IF", indentation: 0, type: "endWrapper"}
      ],
      isDragging: false,
    },
  ]);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [targetBox, setTargetBox] = useState<Box | null>(null);
  const [draggedBox, setDraggedBox] = useState<Box | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - containerRect.left - offset.x;
      const y = e.clientY - containerRect.top - offset.y;
      const mouseRelX = e.clientX - containerRect.left;
      const mouseRelY = e.clientY - containerRect.top;

      if (!draggedBox) return;
      const draggedBoxStack = boxes.find((boxStack) => boxStack.boxes.some((box) => box.id === draggedBox.id));
      if (!draggedBoxStack) return;
      const draggedBoxIndex = draggedBoxStack.boxes.findIndex((box) => box.id === draggedBox.id);
      if (draggedBoxIndex === -1) return;

      setBoxes((prev) =>
        prev.map((boxStack) => {
          if (boxStack.isDragging) {
            return {
              boxes: boxStack.boxes.map((box, index) => ({
                ...box,
                x: x + boxStack.boxes[0].indentation * 20,
                y: y + (index - draggedBoxIndex) * 20, //+ BOX_HEIGHT * index,
              })),
              isDragging: boxStack.isDragging,
            };
          } else {
            return boxStack;
          }
        })
      );

      // Find the dragging box stack
      const draggingBoxStack = boxes.find((boxStack) => boxStack.isDragging);
      if (!draggingBoxStack) return;

      let closestTarget: Box | null = null;

      boxes.forEach((boxStack) => {
        boxStack.boxes.forEach((box) => {
          const beingDragged = draggingBoxStack.boxes.some(
            (draggedBox) => draggedBox.id === box.id
          );

          if (beingDragged || box.isOriginal) return;
          if (
            Math.abs(box.x + 50 + (box.indentation) * 20 + (box.type === "wrapper" ? 20 :0) - mouseRelX) < 50 &&
            Math.abs(box.y + (BOX_HEIGHT * 1.5) - mouseRelY) < BOX_HEIGHT / 2 &&
            (closestTarget === null ||
              Math.hypot(box.x + 50 + (box.indentation) * 20 + (box.type === "wrapper" ? 20 :0) - mouseRelX, box.y + (BOX_HEIGHT * 1.5) - mouseRelY) <
                Math.hypot(
                  closestTarget.x + 50 + (box.indentation) * 20 + (box.type === "wrapper" ? 20 :0) - mouseRelX,
                  closestTarget.y + (BOX_HEIGHT * 1.5) - mouseRelY
                ))
          ) {
            closestTarget = box;
          }
        });
      });

      setTargetBox(closestTarget);

      // Update heights only if there's a target
      if (closestTarget) {
        const dragHeight = draggingBoxStack.boxes.length;
        setBoxes((prevBoxes) =>
          prevBoxes.map((boxStack) => {
            const targetIndex = boxStack.boxes.findIndex(
              (box) => closestTarget && box.id === closestTarget.id
            );
            if (targetIndex === -1) {
              return boxStack;
            }

            return {
              ...boxStack,
              boxes: boxStack.boxes.map((box, index) => ({
                ...box,
                height: index > targetIndex ? dragHeight : 0,
              })),
            };
          })
        );
      } else {
        // Reset heights if no target
        setBoxes((prevBoxes) =>
          prevBoxes.map((boxStack) => ({
            ...boxStack,
            boxes: boxStack.boxes.map((box) => ({ ...box, height: 0 })),
          }))
        );
      }
    };

    const handleMouseUp = () => {
      if (isHandlingMouseUp.current) return;
      isHandlingMouseUp.current = true;

      console.log("mouse up");

      if (targetBox) {
        setBoxes((prevBoxes) => {
          // Find the dragging stack
          const draggingBoxStack = prevBoxes.find(
            (boxStack) => boxStack.isDragging
          );
          if (!draggingBoxStack) return prevBoxes;

          // Find the target stack and index
          const targetBoxStackIndex = prevBoxes.findIndex((boxStack) =>
            boxStack.boxes.some((box) => box.id === targetBox.id)
          );
          if (targetBoxStackIndex === -1) return prevBoxes;

          const targetBoxStack = prevBoxes[targetBoxStackIndex];
          const targetIndex = targetBoxStack.boxes.findIndex(
            (box) => box.id === targetBox.id
          );

          // Create the new boxes array
          const newBoxes = [...prevBoxes];
          
          // Split the target stack
          const beforeTarget = targetBoxStack.boxes.slice(0, targetIndex + 1);
          const afterTarget = targetBoxStack.boxes.slice(targetIndex + 1);
          
          // Create the merged boxes
          const mergedBoxes = [
            ...beforeTarget,
            ...draggingBoxStack.boxes.map((box, index) => ({
              ...box,
              x: targetBox.x,
              y: targetBox.y + BOX_HEIGHT * (index + 1),
              height: 0,
              indentation: box.indentation + targetBox.indentation + (targetBox.type === "wrapper" ? 1 : 0),
            })),
            ...afterTarget.map((box) => ({
              ...box,
              y: box.y + BOX_HEIGHT * draggingBoxStack.boxes.length,
              height: 0,
            })),
          ];

          // Update the target stack
          newBoxes[targetBoxStackIndex] = {
            boxes: mergedBoxes,
            isDragging: false,
          };

          // Remove the dragging stack
          return newBoxes.filter((boxStack) => !boxStack.isDragging);
        });
      } else {
        // Just stop dragging if no target
        setBoxes((prevBoxes) =>
          prevBoxes.map((boxStack) => ({
            ...boxStack,
            isDragging: false,
          }))
        );
      }

      setTargetBox(null);

      // Reset the flag after a short delay
      setTimeout(() => {
        isHandlingMouseUp.current = false;
      }, 0);
    };

    // Store the handlers in refs
    mouseMoveHandlerRef.current = handleMouseMove;
    mouseUpHandlerRef.current = handleMouseUp;

    // Add event listeners
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      // Remove event listeners
      if (mouseMoveHandlerRef.current) {
        document.removeEventListener("mousemove", mouseMoveHandlerRef.current);
      }
      if (mouseUpHandlerRef.current) {
        document.removeEventListener("mouseup", mouseUpHandlerRef.current);
      }
    };
  }, [offset, boxes, targetBox, draggedBox]);

  const onMouseDown = (e: React.MouseEvent, id: number) => {
    const ref = boxRefs.current[id];
    if (!ref || !containerRef.current) return;

    const boxRect = ref.getBoundingClientRect();
    const offsetX = e.clientX - boxRect.left;
    const offsetY = e.clientY - boxRect.top;

    setOffset({ x: offsetX, y: offsetY });

    const draggingBox = boxes
      .flatMap((boxStack) => boxStack.boxes)
      .find((box) => box.id === id);
    if (!draggingBox) {
        setDraggedBox(null);
        return;
    }
    setDraggedBox(draggingBox);


    const draggingBoxStack = boxes.find(boxStack => boxStack.boxes.some(box => box.id === id));
    if (!draggingBoxStack) return;
    if (draggingBox.isOriginal) {
      const cloneId = nextId.current += 2;
      const clone: BoxStack = {
        boxes: draggingBoxStack.boxes.map((boxStack, index) => {return {...boxStack, isOriginal: false, id: cloneId - index, }}),
        isDragging: true,
      };
      setBoxes((prev) => [...prev, clone]);
    } else {
      const boxStackIndex = boxes.findIndex((boxStack) =>
        boxStack.boxes.some((box) => box.id === id)
      );
      
      if (boxStackIndex === -1) return;
      
      setBoxes((prev) => {
        const newBoxes = [...prev];
        const originalBoxStack = { ...newBoxes[boxStackIndex] };
        const boxIndex = originalBoxStack.boxes.findIndex((box) => box.id === id);

        let remainingBoxes = originalBoxStack.boxes.slice(0, boxIndex);
        let draggedBoxes = originalBoxStack.boxes.slice(boxIndex);
        
        if (draggingBox.type === "wrapper") {
            let endIndex = originalBoxStack.boxes.findIndex((box, index) => box.indentation < draggingBox.indentation && index > boxIndex) - 1;
            if (endIndex === -2) {
                endIndex = originalBoxStack.boxes.length - 1;
            }
            draggedBoxes = originalBoxStack.boxes.slice(boxIndex, endIndex + 1);
            remainingBoxes = originalBoxStack.boxes.slice(0, boxIndex).concat(originalBoxStack.boxes.slice(endIndex + 1));
        }
        else if (draggingBox.type === "endWrapper") {
            const startIndex = originalBoxStack.boxes.length - 1 - originalBoxStack.boxes.toReversed().findIndex((box, index) => box.indentation === draggingBox.indentation && box.type === "wrapper" && boxIndex > originalBoxStack.boxes.length - index - 1);
            let endIndex = originalBoxStack.boxes.findIndex((box, index) => box.indentation < draggingBox.indentation && index > boxIndex) - 1;
            console.log("startIndex", startIndex);
            console.log("endIndex", endIndex);
            if (endIndex === -2) {
                endIndex = originalBoxStack.boxes.length - 1;
            }
            if (startIndex !== -1) {
                draggedBoxes = originalBoxStack.boxes.slice(startIndex, endIndex + 1);
                remainingBoxes = originalBoxStack.boxes.slice(0, startIndex).concat(originalBoxStack.boxes.slice(endIndex + 1));
            }
        }
        else {
            let endIndex = originalBoxStack.boxes.findIndex((box, index) => box.indentation < draggingBox.indentation && index > boxIndex) - 1;
            if (endIndex === -2) {
                endIndex = originalBoxStack.boxes.length - 1;
            }
            draggedBoxes = originalBoxStack.boxes.slice(boxIndex, endIndex + 1);
            remainingBoxes = originalBoxStack.boxes.slice(0, boxIndex).concat(originalBoxStack.boxes.slice(endIndex + 1));
        }

        console.log("remainingBoxes", remainingBoxes);
        console.log("draggedBoxes", draggedBoxes);



        
        
        
        if (remainingBoxes.length === 0) {
          newBoxes.splice(boxStackIndex, 1);
        }
        else {
            newBoxes[boxStackIndex] = {
                ...originalBoxStack,
                boxes: remainingBoxes.map((box, index) => { return {...box, y: remainingBoxes[0].y + index * BOX_HEIGHT}}),
              };
        }
        
        // calculate indentation on each box

        let currentIndentation = 0;
        let previousIndentation = 0;

        const newBoxStack: BoxStack = {
          boxes: draggedBoxes.map((box) => {
            previousIndentation = currentIndentation;
            if (box.type === "wrapper") {
                currentIndentation += 1;
            } else if (box.type === "endWrapper") {
                currentIndentation -= 1;
                previousIndentation -= 1;
            }
            return {...box, x: box.x + draggedBoxes[0].indentation * 20, indentation: previousIndentation}
          }),
          isDragging: true,
        };
        
        newBoxes.push(newBoxStack);
        
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
      {boxes.flatMap((boxStack) => boxStack.boxes).map((box) => {
        const boxStack = boxes.find(BoxStack2 => BoxStack2.boxes.some(box2 => box2.id === box.id))
        const boxIndex = boxStack?.boxes.findIndex(box2 => box2.id === box.id);
        const boxStackLength = (boxes.find(boxStack2 => boxStack2.boxes.some(box2 => box2.id === box.id))?.boxes.length ?? 1);
        let topLeftCornerRadius = boxIndex === 0 ? 10 : 0;
        let bottomRightCornerRadius = boxStackLength - 1 === boxIndex ? 10 : 0;
        let topRightCornerRadius = topLeftCornerRadius;
        let bottomLeftCornerRadius = bottomRightCornerRadius;
        if (boxIndex !== undefined && boxStack) {
            bottomLeftCornerRadius = boxIndex !== boxStackLength - 1 && boxStack.boxes[boxIndex + 1].indentation > box.indentation ? 10 : bottomLeftCornerRadius;
            bottomRightCornerRadius = boxIndex !== boxStackLength - 1 && boxStack.boxes[boxIndex + 1].indentation < box.indentation ? 10 : bottomRightCornerRadius;
            topLeftCornerRadius = boxIndex !== 0 && boxStack.boxes[boxIndex - 1].indentation > box.indentation ? 10 : topLeftCornerRadius;
            topRightCornerRadius = boxIndex !== 0 && boxStack.boxes[boxIndex - 1].indentation < box.indentation ? 10 : topRightCornerRadius;
        }
        return <div
          key={box.id}
          ref={(el) => {
            boxRefs.current[box.id] = el;
          }}
          onMouseDown={(e) => onMouseDown(e, box.id)}
          style={{
            position: "absolute",
            left: box.x + box.indentation * 20,
            top: box.y + BOX_HEIGHT * box.height,
            width: 100,
            height: BOX_HEIGHT * (box.type === "wrapper" ? 1 : 1),
            backgroundColor: box.color,
            cursor: boxes.some(boxStack2 => boxStack2.boxes.some(b => b.id === box.id) && boxStack2.isDragging)? "grabbing" : "grab",
            userSelect: "none",
            zIndex: box.indentation + 100 * boxes.findIndex(boxStack => boxStack.boxes.some(b => b.id === box.id)),
            paddingLeft: 5,
            borderTopLeftRadius: topLeftCornerRadius,
            borderTopRightRadius: topRightCornerRadius,
            borderBottomLeftRadius: bottomLeftCornerRadius,
            borderBottomRightRadius: bottomRightCornerRadius,
          }}
        >
          {box.text}
        </div>
    })}
      {targetBox && (
        <div
          style={{
            position: "absolute",
            left: targetBox.x + targetBox.indentation * 20 + (targetBox.type === "wrapper" ? 20 : 0),
            top: targetBox.y + BOX_HEIGHT,
            width: 100,
            height: BOX_HEIGHT,
            backgroundColor: "rgba(128, 128, 128, 0.5)",
            pointerEvents: "none",
            zIndex: targetBox.indentation + 100 * boxes.findIndex(boxStack => boxStack.boxes.some(b => b.id === targetBox.id)) + 1,
          }}
        ></div>
      )}
    </div>
  );
}
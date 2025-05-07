"use client";

import { useState, useRef, useEffect } from "react";

type Box = {
  id: number;
  x: number;
  y: number;
  isOriginal: boolean;
  verticalOffset: number;
  color: string;
  indentation: number;
  type: string;
  contents: (Box | string)[];
};

type BoxStack = {
  boxes: Box[];
  isDragging: boolean;
};

const BoxType = {
    BLOCK: "BLOCK",
    WRAPPER: "WRAPPER",
    END_WRAPPER: "END_WRAPPER",
    EMPTY_SUB_BLOCK: "EMPTY_SUB_BLOCK",
    SUB_BLOCK: "SUB_BLOCK",
}

function getEmptySubBlock(id: number) {
    return {
        id: id, x: 0, y: 0, isOriginal: false, verticalOffset: 0, color: "white", indentation: 0, type: BoxType.EMPTY_SUB_BLOCK, contents: [],
    }
}

const BOX_HEIGHT = 30;
const BOX_WIDTH = 140;
const LIBRARY_Y_SPACING = 50;
const LIBRARY_X_SPACING = 50;

export default function DraggableAnywhere() {
    const containerRef = useRef<HTMLDivElement>(null);
    const boxRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
    const mouseMoveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
    const mouseUpHandlerRef = useRef<(() => void) | null>(null);
    const nextId = useRef(8);


    // Box library definition
    const boxLibrary = [
        {boxes: [{type: BoxType.BLOCK, id: 0, contents: ["Display", getEmptySubBlock(5)],}], color: "skyblue"},
        {boxes: [{type: BoxType.WRAPPER, id: 1, contents: ["IF", getEmptySubBlock(6)]}, {type: BoxType.END_WRAPPER, id: 2, contents: ["ENDIF"]}], color: "lightgreen"},
        {boxes: [{type: BoxType.BLOCK, id: 3, contents: ["GET", getEmptySubBlock(7)]}], color: "coral"},
        {boxes: [{type: BoxType.SUB_BLOCK, id: 4, contents: ["var"]}], color: "mediumpurple"},
    ]

    // library of Boxes auto dynamically assigned to Stacks
    let heightOffset = 0;
    const originalBoxes: BoxStack[] = boxLibrary.map((stack, index) => {
        heightOffset += stack.boxes.length - 1;
        return {boxes: stack.boxes.map((b, i) => ({
                id: b.id,
                x: LIBRARY_X_SPACING,
                y: LIBRARY_Y_SPACING * (index + 1) + i * BOX_HEIGHT + (heightOffset - stack.boxes.length + 1) * BOX_HEIGHT,
                isOriginal: true,
                verticalOffset: 0,
                color: stack.color,
                indentation: 0,
                type: b.type,
                contents: b.contents,
            })),
            isDragging: false,
        };
    });

    const [boxes, setBoxes] = useState<BoxStack[]>(originalBoxes);
    const [grabOffset, setGrabOffset] = useState({ x: 0, y: 0 });
    const [DropTargetBox, setDropTargetBox] = useState<Box | null>(null);
    const [draggingBox, setDraggingBox] = useState<Box | null>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();

            const boxX = e.clientX - containerRect.left - grabOffset.x;
            const boxY = e.clientY - containerRect.top - grabOffset.y;
            const mouseX = e.clientX - containerRect.left;
            const mouseY = e.clientY - containerRect.top;

            if (!draggingBox) return;
            const draggedBoxStack = boxes.find((boxStack) => 
                boxStack.boxes.some((box) => box.id === draggingBox.id)
            );
            const draggedBoxIndex = draggedBoxStack?.boxes.findIndex((box) => 
                box.id === draggingBox.id
            );
            if (!draggedBoxStack || draggedBoxIndex === -1 || draggedBoxIndex === undefined) return;

            // Set the position of the dragging box stack to the position of the mouse
            setBoxes((prev) =>
                prev.map((boxStack) => {
                    if (!boxStack.isDragging) return boxStack;
                    return {
                        boxes: boxStack.boxes.map((box, index) => ({
                            ...box,
                            x: boxX + boxStack.boxes[0].indentation * BOX_HEIGHT,
                            y: boxY + (index - draggedBoxIndex) * BOX_HEIGHT,
                        })),
                        isDragging: boxStack.isDragging,
                    };                    
                })
            );

            const draggingBoxStack = boxes.find((boxStack) => boxStack.isDragging);
            if (!draggingBoxStack) return;

            let closestTarget: Box | null = null;

            // Find the closest target that the mouse is within
            if (draggingBox.type !== BoxType.SUB_BLOCK) {
                boxes.forEach((boxStack) => {
                    boxStack.boxes.forEach((box) => {
                        const beingDragged = draggingBoxStack.boxes.some(
                            (draggedBox) => draggedBox.id === box.id
                        );
                        if (beingDragged || box.isOriginal) return;

                        const mouseWithinTarget = Math.abs(box.x + BOX_WIDTH/2 + box.indentation * BOX_HEIGHT + (box.type === BoxType.WRAPPER ? BOX_HEIGHT : 0) - mouseX) < BOX_WIDTH/2 &&
                                                Math.abs(box.y + (BOX_HEIGHT * 1.5) - mouseY) < BOX_HEIGHT / 2
                        const distanceToCentreOfTarget = Math.hypot(box.x + BOX_WIDTH/2 + (box.indentation) * BOX_HEIGHT + (box.type === BoxType.WRAPPER ? BOX_HEIGHT :0) - mouseX, box.y + (BOX_HEIGHT * 1.5) - mouseY)
                        const closestDistanceToCentre = closestTarget ? Math.hypot(closestTarget.x +  BOX_WIDTH/2 + (box.indentation) * BOX_HEIGHT + (box.type === BoxType.WRAPPER ? BOX_HEIGHT :0) - mouseX, closestTarget.y + (BOX_HEIGHT * 1.5) - mouseY) : Infinity;

                        if (mouseWithinTarget && distanceToCentreOfTarget < closestDistanceToCentre) {
                            closestTarget = box;
                        }
                    });
                });
            } else {
                boxes.forEach((boxStack) => {
                    boxStack.boxes.forEach((box) => {
                        box.contents.forEach((content) => {
                            if (
                                typeof content !== "string" &&
                                content.type === BoxType.EMPTY_SUB_BLOCK &&
                                boxRefs.current[content.id]
                            ) {
                                const ref = boxRefs.current[content.id];
                                const rect = ref?.getBoundingClientRect();
                                const containerRect = containerRef.current?.getBoundingClientRect();
                                if (!rect || !containerRect) return;
            
                                const relativeX = mouseX + containerRect.left;
                                const relativeY = mouseY + containerRect.top;
            
                                if (
                                    relativeX >= rect.left &&
                                    relativeX <= rect.right &&
                                    relativeY >= rect.top &&
                                    relativeY <= rect.bottom
                                ) {
                                    closestTarget = content;
                                }
                            }
                        });
                    });
                });
            }

            setDropTargetBox(closestTarget);

            // If a target is found move blocks out of the way to show how the new block would go
            if (closestTarget && (closestTarget as Box).type !== BoxType.EMPTY_SUB_BLOCK) {
                const draggingStackLength = draggingBoxStack.boxes.length;
                setBoxes((prevBoxes) =>
                    prevBoxes.map((boxStack) => {
                        const targetIndex = boxStack.boxes.findIndex((box) => closestTarget && box.id === closestTarget.id);
                        if (targetIndex === -1) return boxStack;
                        return {
                            ...boxStack,
                            boxes: boxStack.boxes.map((box, index) => ({
                                ...box,
                                verticalOffset: index > targetIndex ? draggingStackLength : 0,
                            })),
                        };
                    })
                );
            } else {
                // Reset heights if no target
                setBoxes((prevBoxes) =>
                    prevBoxes.map((boxStack) => ({
                        ...boxStack,
                        boxes: boxStack.boxes.map((box) => ({ ...box, verticalOffset: 0 })),
                    }))
                );
            }
        };

        const handleMouseUp = () => {
            console.log(boxes);
            console.log("draggingBox", draggingBox);
            console.log("nextId", nextId.current);
            if (DropTargetBox) {
                // Drop Boxes into the middle of a Box Stack 
                setBoxes((prevBoxes) => {
                    if (DropTargetBox.type !== BoxType.EMPTY_SUB_BLOCK) {
                        const draggingBoxStack = prevBoxes.find((boxStack) => boxStack.isDragging);
                        if (!draggingBoxStack) return prevBoxes;

                        const targetBoxStackIndex = prevBoxes.findIndex((boxStack) =>
                            boxStack.boxes.some((box) => box.id === DropTargetBox.id)
                        );
                        if (targetBoxStackIndex === -1) return prevBoxes;

                        const targetBoxStack = prevBoxes[targetBoxStackIndex];
                        const targetIndex = targetBoxStack.boxes.findIndex(
                            (box) => box.id === DropTargetBox.id
                        );

                        const newBoxes = [...prevBoxes];
                        
                        const beforeTarget = targetBoxStack.boxes.slice(0, targetIndex + 1);
                        const afterTarget = targetBoxStack.boxes.slice(targetIndex + 1);
                        
                        // Merge the Three catagories of Boxes; Before, Dragged and After
                        const mergedBoxes = [
                            ...beforeTarget,
                            ...draggingBoxStack.boxes.map((box, index) => ({
                                ...box,
                                x: DropTargetBox.x,
                                y: DropTargetBox.y + BOX_HEIGHT * (index + 1),
                                verticalOffset: 0,
                                indentation: box.indentation + DropTargetBox.indentation + (DropTargetBox.type === BoxType.WRAPPER ? 1 : 0),
                            })),
                            ...afterTarget.map((box) => ({
                                ...box,
                                y: box.y + BOX_HEIGHT * draggingBoxStack.boxes.length,
                                verticalOffset: 0,
                            })),
                        ];

                        // Update the target stack
                        newBoxes[targetBoxStackIndex] = {
                            boxes: mergedBoxes,
                            isDragging: false,
                        };

                        // Remove the dragging stack
                        return newBoxes.filter((boxStack) => !boxStack.isDragging);
                    } else {
                        const returnValue = prevBoxes.map((boxStack) => ({
                            ...boxStack,
                            boxes: boxStack.boxes.map((box) => ({
                                ...box,
                                contents: box.contents.map((content) => {
                                    if (typeof content !== "string" && content.id === DropTargetBox.id) {
                                        return draggingBox || content;
                                    }
                                    return content;
                                })
                            }))
                        }));
                        return returnValue.filter((boxStack) => !boxStack.isDragging);
                    }
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

            setDropTargetBox(null);
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
    }, [grabOffset, boxes, DropTargetBox, draggingBox]);

    const onMouseDown = (e: React.MouseEvent, id: number) => {
        const ref = boxRefs.current[id];
        if (!ref || !containerRef.current) return;
        console.log(id);
        const boxRect = ref.getBoundingClientRect();
        console.log("boxrect left", boxRect.left);
        console.log("boxrect top", boxRect.top);
        const offsetX = e.clientX - boxRect.left;
        const offsetY = e.clientY - boxRect.top;

        setGrabOffset({ x: offsetX, y: offsetY });

        // find the box that is currently selected
        const draggingBox = boxes.flatMap((boxStack) => boxStack.boxes).find((box) => box.id === id);
        if (!draggingBox) {
            setDraggingBox(null);
            return;
        }
        
        const draggingBoxStack = boxes.find(boxStack => boxStack.boxes.some(box => box.id === id));
        if (!draggingBoxStack) return;
        if (draggingBox.isOriginal) {
            console.log("rigged");
            const clone: BoxStack = {
                boxes: draggingBoxStack.boxes.map((box2) => {return {...box2, isOriginal: false, id: nextId.current++, contents: box2.contents.map((content) => typeof content !== "string" && content.type === BoxType.EMPTY_SUB_BLOCK ? getEmptySubBlock(nextId.current++) : content)}}),
                isDragging: true,
            };
            setDraggingBox(clone.boxes.find(box2 => box2.type === draggingBox.type) || clone.boxes[0]);
            console.log("cloneId", clone.boxes[0].id);
            setBoxes((prev) => [...prev, clone]);
        } else {
            setDraggingBox(draggingBox);
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

            let endIndex = originalBoxStack.boxes.findIndex((box, index) => box.indentation < draggingBox.indentation && index > boxIndex) - 1;
            let startIndex = boxIndex;
            
            if (draggingBox.type === BoxType.WRAPPER) {
                endIndex = originalBoxStack.boxes.findIndex((box, index) => box.indentation < draggingBox.indentation && index > boxIndex) - 1;
            }
            else if (draggingBox.type === BoxType.END_WRAPPER) {
                startIndex = originalBoxStack.boxes.length - 1 - originalBoxStack.boxes.toReversed().findIndex((box, index) => box.indentation === draggingBox.indentation && box.type === BoxType.WRAPPER && boxIndex > originalBoxStack.boxes.length - index - 1);
                endIndex = originalBoxStack.boxes.findIndex((box, index) => box.indentation < draggingBox.indentation && index > boxIndex) - 1;
            }

            if (endIndex === -2) {
                endIndex = originalBoxStack.boxes.length - 1
            }
            draggedBoxes = originalBoxStack.boxes.slice(startIndex, endIndex + 1);
            remainingBoxes = originalBoxStack.boxes.slice(0, startIndex).concat(originalBoxStack.boxes.slice(endIndex + 1));

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
                    if (box.type === BoxType.WRAPPER) {
                        currentIndentation += 1;
                    } else if (box.type === BoxType.END_WRAPPER) {
                        currentIndentation -= 1;
                        previousIndentation -= 1;
                    }
                    return {...box, x: box.x + draggedBoxes[0].indentation * BOX_HEIGHT, indentation: previousIndentation}
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
        // const boxStackLength = (boxes.find(boxStack2 => boxStack2.boxes.some(box2 => box2.id === box.id))?.boxes.length ?? 1);
        // let topLeftCornerRadius = boxIndex === 0 ? 10 : 0;
        // let bottomRightCornerRadius = boxStackLength - 1 === boxIndex ? 10 : 0;
        // let topRightCornerRadius = topLeftCornerRadius;
        // let bottomLeftCornerRadius = bottomRightCornerRadius;
        if (boxIndex !== undefined && boxStack) {
            // bottomLeftCornerRadius = boxIndex !== boxStackLength - 1 && boxStack.boxes[boxIndex + 1].indentation > box.indentation ? 10 : bottomLeftCornerRadius;
            // bottomRightCornerRadius = boxIndex !== boxStackLength - 1 && boxStack.boxes[boxIndex + 1].indentation < box.indentation ? 10 : bottomRightCornerRadius;
            // topLeftCornerRadius = boxIndex !== 0 && boxStack.boxes[boxIndex - 1].indentation > box.indentation ? 10 : topLeftCornerRadius;
            // topRightCornerRadius = boxIndex !== 0 && boxStack.boxes[boxIndex - 1].indentation < box.indentation ? 10 : topRightCornerRadius;
        }
        return <div
          key={box.id}
          ref={(el) => {
            boxRefs.current[box.id] = el;
          }}
          onMouseDown={(e) => onMouseDown(e, box.id)}
          style={{
            position: "absolute",
            left: box.x + box.indentation * BOX_HEIGHT,
            top: box.y + BOX_HEIGHT * box.verticalOffset,
            // width: BOX_WIDTH,
            height: BOX_HEIGHT * (box.type === BoxType.WRAPPER ? 1 : 1) - (box.type === BoxType.SUB_BLOCK ? 10 : 0),
            backgroundColor: box.color,
            cursor: boxes.some(boxStack2 => boxStack2.boxes.some(b => b.id === box.id) && boxStack2.isDragging)? "grabbing" : "grab",
            userSelect: "none",
            zIndex: box.indentation + 100 * boxes.findIndex(boxStack => boxStack.boxes.some(b => b.id === box.id)),
            paddingLeft: 5,
            // borderRadius: `${topLeftCornerRadius}px ${topRightCornerRadius}px ${bottomRightCornerRadius}px ${bottomLeftCornerRadius}px`,
            borderRadius: box.type !== BoxType.SUB_BLOCK? "0 10px 10px 0": "10px",
          }}
        >
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px", // spacing between text and box
            height: "100%",
            paddingRight: 10,
        }}>
            {box.contents.map((content, i) => {
                return typeof content === "string" ? 
                <span key={`text-${box.id}-${i}`}>{content}</span> : 
                <div key={`box-${content.id}`} ref={(el) => { boxRefs.current[content.id] = el; }} 
                    style={{
                        borderRadius: 10, 
                        width: BOX_HEIGHT,
                        height: BOX_HEIGHT - 10,
                        backgroundColor: DropTargetBox && DropTargetBox.id === content.id && DropTargetBox.type === BoxType.EMPTY_SUB_BLOCK ? "lightgrey" : content.color,
                        flexShrink: 0,
                    }}
                ></div>})}
            </div>
        </div>
    })}
      {DropTargetBox && DropTargetBox.type !== BoxType.EMPTY_SUB_BLOCK && (
        <div
          style={{
            position: "absolute",
            left: DropTargetBox.x + DropTargetBox.indentation * BOX_HEIGHT + (DropTargetBox.type === BoxType.WRAPPER ? BOX_HEIGHT : 0),
            top: DropTargetBox.y + BOX_HEIGHT,
            width: BOX_WIDTH,
            height: BOX_HEIGHT,
            backgroundColor: "rgba(128, 128, 128, 0.5)",
            pointerEvents: "none",
            zIndex: DropTargetBox.indentation + 100 * boxes.findIndex(boxStack => boxStack.boxes.some(b => b.id === DropTargetBox.id)) + 1,
          }}
        ></div>
      )}
    </div>
  );
}
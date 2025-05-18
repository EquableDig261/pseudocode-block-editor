"use client";

import { useState, useRef, useEffect } from "react";
import { Box, BoxStack} from "./types"
import { BOX_HEIGHT, BOX_WIDTH, LIBRARY_Y_SPACING, LIBRARY_X_SPACING, BOX_RADIUS, SUB_BLOCK_HEIGHT, EMPTY_BLOCK_WIDTH, BOX_SHADOW, DRAGGING_SHADOW, RETURN_TYPES, BOX_TYPES, COLORS, SUB_BOX_TYPES, LIBRARY_BOXES} from "./constants"
import { serialize} from "./utils/serialization"
import { getEmptySubBlock, getEmptyInputBlock } from "./utils/utility"
import { deserialize } from "./utils/deserialization"
import './styles/BlockEditor.css'




let addVariableOffset = 0

const getContents = (box: Box): (string | Box)[] => {
    return box.contents.flatMap(content => {
        if (typeof content === "string") {
            return [content];
        } else {
            return [content, ...getContents(content)];
        }
    });
};

const replaceContents = (contents: (string | Box)[], dropTargetId: number, replacementBox: Box): (string | Box)[] => {
    return contents.map((content) => {
        if (typeof content === "string") {
            return content;
        }
        if (dropTargetId === content.id) {
            return {
                ...replacementBox,
                x: 0,
                y: 0,
                indentation: 0,
                acceptedReturnTypes: content.acceptedReturnTypes,
            };
        }
        return {
            ...content,
            contents: replaceContents(content.contents, dropTargetId, replacementBox)
        }
    })
}

const removeSubBox = (targetId: number, box: Box, newEmptyBoxId: number, newEmptyBoxType: string | null): Box => {
    if (box.id === targetId) {
        return getEmptySubBlock(newEmptyBoxId, box.acceptedReturnTypes ?? newEmptyBoxType);
    }
    return {...box, contents: box.contents.map((content) => {
        if (typeof content === "string") return content;
        return removeSubBox(targetId, content, newEmptyBoxId, newEmptyBoxType);
    })}
}

const boxIsASubBoxOf = (target: Box, box: Box): boolean => {
    for (const content of box.contents) {
        if (typeof content === "string") continue;
        if (content.id === target.id) return true;
        if (boxIsASubBoxOf(content, target)) return true;
    }
    return false;
};

const recurseUpdateInputBox = (targetId : number, contents: string, boxes : (Box | string)[]) : (Box | string)[] => {
    return boxes.map((content) => {
        if (typeof content === "string") {
            return content;
        }
        if (targetId === content.id) {
            return {
                ...content,
                contents:[contents]
            };
        }
        return {
            ...content,
            contents: recurseUpdateInputBox(targetId, contents, content.contents)
        }
    })
}

const updateInputBox = (boxes: BoxStack[], targetId: number, contents: string) : (BoxStack[]) => {
    return boxes.map((boxStack) => ({
        ...boxStack,
        boxes: recurseUpdateInputBox(targetId, contents, boxStack.boxes),
      } as BoxStack));
}

export default function BlockEditor() {
    const containerRef = useRef<HTMLDivElement>(null);
    const boxRefs = useRef<{ [key: number]: HTMLDivElement | HTMLInputElement | HTMLSelectElement | null }>({});
    const mouseMoveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
    const mouseUpHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
    let libId = 0;
    const emptyLibSubBlock = (subBoxTypes: string[]) => {
        return getEmptySubBlock(libId++, subBoxTypes);
    }
    const inputLibSubBlock = (type: string) => {
        return getEmptyInputBlock(libId++, type);
    }
    
    // library of Boxes auto dynamically assigned to Stacks
    let heightOffset = 0;
    const originalBoxes: BoxStack[] = LIBRARY_BOXES.map((stack, index) => {
        heightOffset += stack.boxes.length - 1;
        return {boxes: stack.boxes.map((b, i) => ({
            id: libId++,
            x: LIBRARY_X_SPACING,
            y: LIBRARY_Y_SPACING * (index) + i * BOX_HEIGHT + (heightOffset - stack.boxes.length + 1) * BOX_HEIGHT,
            isOriginal: true,
            verticalOffset: 0,
            color: stack.color,
            indentation: 0,
            type: b.type,
            contents: b.contents.map(content => {
                if (typeof content === "string") return content;
                if (content.subBoxType === SUB_BOX_TYPES.INPUT) return inputLibSubBlock(content.returnTypes[0]);
                return emptyLibSubBlock(content.returnTypes);
            }),
            returnType: b.returnType,
            acceptedReturnTypes: [],
        })),
        isDragging: false,
        };
    });

    const nextId = useRef(libId);

    const [boxes, setBoxes] = useState<BoxStack[]>(() => {
        return originalBoxes.concat(deserialize(nextId));
    });
    const [grabOffset, setGrabOffset] = useState({ x: 0, y: 0 });
    const [dropTargetBox, setDropTargetBox] = useState<Box | null>(null);
    const [draggingBox, setDraggingBox] = useState<Box | null>(null);
    const [newVariable, setNewVariable] = useState("");

    addVariableOffset = LIBRARY_Y_SPACING * (originalBoxes.length) + (originalBoxes.map((boxStack) => 
            boxStack.boxes.length - 1
    ).reduce((acc, val) => (acc && val) ? acc + val : acc) || 0) * BOX_HEIGHT
    

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
            if (draggingBox.type !== BOX_TYPES.SUB_BLOCK) {
                boxes.forEach((boxStack) => {
                    boxStack.boxes.forEach((box) => {
                        const beingDragged = draggingBoxStack.boxes.some(
                            (draggedBox) => draggedBox.id === box.id
                        );
                        if (beingDragged || box.isOriginal) return;
                        if (box.type === BOX_TYPES.SUB_BLOCK) return;

                        const mouseWithinTarget = Math.abs(box.x + BOX_WIDTH/2 + box.indentation * BOX_HEIGHT + (box.type === BOX_TYPES.WRAPPER || box.type === BOX_TYPES.MID_WRAPPER ? BOX_HEIGHT : 0) - mouseX) < BOX_WIDTH/2 &&
                                                Math.abs(box.y + (BOX_HEIGHT * 1.5) - mouseY) < BOX_HEIGHT / 2
                        const distanceToCentreOfTarget = Math.hypot(box.x + BOX_WIDTH/2 + (box.indentation) * BOX_HEIGHT + (box.type === BOX_TYPES.WRAPPER  || box.type === BOX_TYPES.MID_WRAPPER ? BOX_HEIGHT :0) - mouseX, box.y + (BOX_HEIGHT * 1.5) - mouseY)
                        const closestDistanceToCentre = closestTarget ? Math.hypot(closestTarget.x +  BOX_WIDTH/2 + (box.indentation) * BOX_HEIGHT + (box.type === BOX_TYPES.WRAPPER || box.type === BOX_TYPES.MID_WRAPPER ? BOX_HEIGHT :0) - mouseX, closestTarget.y + (BOX_HEIGHT * 1.5) - mouseY) : Infinity;

                        if (mouseWithinTarget && distanceToCentreOfTarget < closestDistanceToCentre) {
                            closestTarget = box;
                        }
                    });
                });
                if (closestTarget) {
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
            } else {
                // Only allow dropping subBlocks into emptySubBlocks
                boxes.forEach((boxStack) => {
                    boxStack.boxes.forEach((box) => {
                        getContents(box).forEach(content => {
                            if(box.isOriginal) return;
                            if(boxIsASubBoxOf(box, draggingBox)) return;
                            if (
                                typeof content !== "string" &&
                                content.type === BOX_TYPES.EMPTY_SUB_BLOCK &&
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
                                    if(draggingBox.returnType && !content.acceptedReturnTypes.includes(draggingBox.returnType) && draggingBox.returnType !== RETURN_TYPES.VARIABLE) return;
                                    closestTarget = content;
                                }
                            }
                        });
                    });
                });
                setBoxes((prevBoxes) =>
                    prevBoxes.map((boxStack) => ({
                        ...boxStack,
                        boxes: boxStack.boxes.map((box) => ({ ...box, verticalOffset: 0 })),
                    }))
                );
            }

            setDropTargetBox(closestTarget);     
        };

        const handleMouseUp = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const mouseX = e.clientX - containerRect.left;
            
            if (draggingBox && mouseX < 400) {
                setBoxes((prev) => prev.filter(boxStack => !boxStack.isDragging))
                setDropTargetBox(null);
                setDraggingBox(null);
                return;
            }
            if (dropTargetBox && draggingBox) {
                setBoxes((prevBoxes) => {
                    if (dropTargetBox.type === BOX_TYPES.EMPTY_SUB_BLOCK) {
                        // Only allow dropping subBlocks into emptySubBlocks
                        if (draggingBox.type !== BOX_TYPES.SUB_BLOCK) {
                            return prevBoxes.map(boxStack => ({
                                ...boxStack,
                                isDragging: false
                            }));
                        }

                        // Replace empty subblock with the dragged subblock
                        return prevBoxes.map((boxStack) => ({
                            ...boxStack,
                            boxes: boxStack.boxes.map((box) => ({
                                ...box,
                                contents: replaceContents(box.contents, dropTargetBox.id, draggingBox)
                            }))
                        })).filter((boxStack) => !boxStack.isDragging);
                    } else {
                        // Handle dropping between blocks (for non-subBlocks)
                        if (draggingBox.type === BOX_TYPES.SUB_BLOCK) {
                            return prevBoxes.map(boxStack => ({
                                ...boxStack,
                                isDragging: false
                            }));
                        }

                        const draggingBoxStack = prevBoxes.find((boxStack) => boxStack.isDragging);
                        if (!draggingBoxStack) return prevBoxes;

                        const targetBoxStackIndex = prevBoxes.findIndex((boxStack) =>
                            boxStack.boxes.some((box) => box.id === dropTargetBox.id)
                        );
                        if (targetBoxStackIndex === -1) return prevBoxes;

                        const targetBoxStack = prevBoxes[targetBoxStackIndex];
                        const targetIndex = targetBoxStack.boxes.findIndex(
                            (box) => box.id === dropTargetBox.id
                        );

                        const newBoxes = [...prevBoxes];
                        
                        const beforeTarget = targetBoxStack.boxes.slice(0, targetIndex + 1);
                        const afterTarget = targetBoxStack.boxes.slice(targetIndex + 1);
                        
                        // Merge the Three categories of Boxes; Before, Dragged and After
                        const mergedBoxes = [
                            ...beforeTarget,
                            ...draggingBoxStack.boxes.map((box, index) => ({
                                ...box,
                                x: dropTargetBox.x,
                                y: dropTargetBox.y + BOX_HEIGHT * (index + 1),
                                verticalOffset: 0,
                                indentation: box.indentation + dropTargetBox.indentation + ((dropTargetBox.type === BOX_TYPES.WRAPPER || dropTargetBox.type === BOX_TYPES.MID_WRAPPER) ? 1 : 0),
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
            setDraggingBox(null);
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
    }, [grabOffset, boxes, dropTargetBox, draggingBox]);

    useEffect(() => {
        localStorage.setItem("editorContent", serialize(boxes))
    }, [boxes])

    const onMouseDown = (e: React.MouseEvent, id: number) => {
        const ref = boxRefs.current[id];
        if (!ref || !containerRef.current) return;

        const boxRect = ref.getBoundingClientRect();
        const offsetX = e.clientX - boxRect.left;
        const offsetY = e.clientY - boxRect.top;

        setGrabOffset({ x: offsetX, y: offsetY });

        let draggingBox : Box | null = null;
        // find the box that is currently selected
        boxes.flatMap((boxStack) => boxStack.boxes).forEach((box) => {
            if (box.id === id) {
                draggingBox = box;
                return;
            }
            else {
                getContents(box).forEach((content) => {
                    if (typeof content !== "string" && content.id === id) {
                        draggingBox = content;
                        return;
                    }
                })
            }
        })

        if (!draggingBox) {
            setDraggingBox(null);
            return;
        }

        const draggingBoxStack = boxes.find(boxStack => boxStack.boxes.some(box => box.id === id));

        if (draggingBoxStack) {        
            if ((draggingBox as Box).isOriginal) {
                const clone: BoxStack = {
                    boxes: draggingBoxStack.boxes.map((box2) => {
                        return {
                            ...box2, 
                            isOriginal: false, 
                            id: nextId.current++, 
                            contents: box2.contents.map((content) => 
                                typeof content !== "string" && content.type === BOX_TYPES.EMPTY_SUB_BLOCK 
                                    ? getEmptySubBlock(nextId.current++, content.acceptedReturnTypes) :
                                typeof content !== "string" && box2.returnType && (content.type === BOX_TYPES.NUM_INPUT || content.type === BOX_TYPES.TEXT_INPUT || content.type === BOX_TYPES.BOOL_INPUT)
                                    ? getEmptyInputBlock(nextId.current++, box2.returnType)
                                    : content
                            )
                        }
                    }),
                    isDragging: true,
                };
                setDraggingBox(clone.boxes.find(box2 => draggingBox && box2.type === draggingBox.type) || clone.boxes[0]);
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
                
                    
                    if (!draggingBox) return prev;
                    const dragIndentation = draggingBox.indentation + (draggingBox.type === BOX_TYPES.MID_WRAPPER ? 1 : 0)

                    let endIndex = originalBoxStack.boxes.findIndex((box, index) => draggingBox && box.indentation < dragIndentation && index > boxIndex) - 1;
                    let startIndex = boxIndex;
                    
                    if (draggingBox.type === BOX_TYPES.WRAPPER) {
                        endIndex = originalBoxStack.boxes.findIndex((box, index) => draggingBox && box.indentation < dragIndentation && index > boxIndex) - 1;
                    }
                    else if (draggingBox.type === BOX_TYPES.END_WRAPPER) {
                        startIndex = originalBoxStack.boxes.length - 1 - originalBoxStack.boxes.toReversed().findIndex((box, index) => draggingBox && box.indentation === dragIndentation && box.type === BOX_TYPES.WRAPPER && boxIndex > originalBoxStack.boxes.length - index - 1);
                        endIndex = originalBoxStack.boxes.findIndex((box, index) => draggingBox && box.indentation < dragIndentation && index > boxIndex) - 1;
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
                            boxes: remainingBoxes.map((box, index) => { 
                                return {
                                    ...box, 
                                    y: remainingBoxes[0].y + index * BOX_HEIGHT
                                }
                            }),
                        };
                    }
                    
                    // calculate indentation on each box
                    let currentIndentation = 0;
                    let previousIndentation = 0;

                    const newBoxStack: BoxStack = {
                        boxes: draggedBoxes.map((box) => {
                            previousIndentation = currentIndentation;
                            if (box.type === BOX_TYPES.WRAPPER) {
                                currentIndentation += 1;
                            } else if (box.type === BOX_TYPES.END_WRAPPER) {
                                currentIndentation -= 1;
                                previousIndentation -= 1;
                            } else if (box.type === BOX_TYPES.MID_WRAPPER) {
                                previousIndentation -= 1;
                            }
                            return {
                                ...box, 
                                x: box.x + draggedBoxes[0].indentation * BOX_HEIGHT, 
                                indentation: previousIndentation
                            }
                        }),
                        isDragging: true,
                    };
                    newBoxes.push(newBoxStack);
                    return newBoxes;
                });
            }
        }
        else {
            setDraggingBox(draggingBox);
            setBoxes((prev) => {
                if (!draggingBox) return prev;
                
                const newBoxes = prev.map((boxStack) => ({
                    ...boxStack,
                    boxes: boxStack.boxes.map((box) =>
                        draggingBox ? removeSubBox(draggingBox.id, box, nextId.current++, draggingBox.returnType) : box
                    ),
                }));

                let boxX = e.clientX - grabOffset.x;
                let boxY = e.clientX - grabOffset.x;

                if (containerRef.current) {
                    const containerRect = containerRef.current.getBoundingClientRect();
                
                    boxX = e.clientX - containerRect.left - grabOffset.x;
                    boxY = e.clientY - containerRect.top - grabOffset.y;
                }
                newBoxes.push({boxes: [{...draggingBox, x: boxX, y: boxY}], isDragging: true})
                return newBoxes;
            });
        }
    };

    const handleSubmit = () => {
        const newVar = newVariable

        if (newVar !== "") {
            const numOriginalBoxes = boxes.filter((boxStack) => boxStack.boxes.some((box) => box.isOriginal)).length;
            const heightOffset = boxes.map((boxStack) => {
                if (boxStack.boxes.some(box => box.isOriginal)) {
                    return boxStack.boxes.length - 1;
                }
            }).reduce((acc, val) => (acc && val) ? acc + val : acc) || 0;
            setBoxes((prev) => [...prev, {boxes: [{
                id: nextId.current++,
                x: LIBRARY_X_SPACING,
                y: LIBRARY_Y_SPACING * (numOriginalBoxes) + (heightOffset) * BOX_HEIGHT + (LIBRARY_Y_SPACING + 18),
                isOriginal: true,
                verticalOffset: 0,
                color: COLORS.PURPLE,
                indentation: 0,
                type: BOX_TYPES.SUB_BLOCK,
                contents: [newVar],
                returnType: RETURN_TYPES.VARIABLE,
                acceptedReturnTypes: [],
            }], isDragging: false}])

            setNewVariable("");
        }
    }

    const setInputBoxes = (targetId: number, value: string) => {
        setBoxes((prev) => updateInputBox(prev, targetId, value))
    }

    const value = (contentId: number) => {
        let result = "";
        boxes.forEach((boxStack) => {
          boxStack.boxes.forEach((box) => {
            getContents(box).forEach((content2) => {
              if (typeof content2 !== "string" && content2.id === contentId) {
                result = content2.contents[0] as string;
              }
            });
          });
        });
        return result;
      };

    const renderContents = (box: Box, isOriginal: boolean) => {
        return box.contents.map((content, i) => {
            if (typeof content === "string") {
                return (
                    <span 
                        key={`text-${box.id}-${i}`}
                        style={{
                            fontWeight: box.type === BOX_TYPES.SUB_BLOCK || box.type === BOX_TYPES.EMPTY_SUB_BLOCK ? 400 : 500,
                            userSelect: "none",
                            fontSize: box.type === BOX_TYPES.SUB_BLOCK ? "14px" : "15px",
                            padding: "0 4px",
                        }}
                        draggable={false}
                    >
                        {content}
                    </span>
                );
            } else {
                // For nested Box objects
                const isEmptySubBlock = content.type === BOX_TYPES.EMPTY_SUB_BLOCK;
                if (content.type === BOX_TYPES.NUM_INPUT || content.type === BOX_TYPES.TEXT_INPUT || content.type === BOX_TYPES.COMMENT_INPUT) {
                    return (
                        
                        <input
                        className="input-box"
                        key={`box-${content.id}`}
                        ref={(el) => {
                            boxRefs.current[content.id] = el;
                            if (el) {
                                el.style.width = "40px";
                                el.style.width = `${Math.max(el.scrollWidth, 40)}px`;
                            }
                        }}
                        onChange={(e) => {
                            if (!isOriginal) {
                                setInputBoxes(content.id, e.target.value);
                                const el = boxRefs.current[content.id];
                                if (el) {
                                    el.style.width = `${Math.max(el.scrollWidth, 40)}px`;
                                }
                            }
                        }}
                        type={content.type === BOX_TYPES.NUM_INPUT ? "number" : "text"}
                        onMouseDown={(e) => {
                            if (!isEmptySubBlock) {
                                e.stopPropagation();
                            }
                        }}
                        value={value(content.id)}
                        style={{
                            color: "black",
                            borderRadius: BOX_RADIUS,
                            height: SUB_BLOCK_HEIGHT,
                            backgroundColor:
                                dropTargetBox &&
                                dropTargetBox.id === content.id &&
                                isEmptySubBlock
                                    ? COLORS.DROP_TARGET
                                    : isEmptySubBlock
                                    ? COLORS.EMPTY
                                    : content.color,
                            boxShadow: isEmptySubBlock
                                ? "none"
                                : boxes.some(boxStack =>
                                      boxStack.isDragging && boxStack.boxes.some(b => b.id === content.id)
                                  )
                                ? DRAGGING_SHADOW
                                : BOX_SHADOW,
                            flexShrink: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0 8px",
                            margin: "0 4px",
                            transition: "background-color 0.2s, box-shadow 0.2s",
                            fontWeight: content.type === BOX_TYPES.SUB_BLOCK ? 400 : 500,
                            appearance: "textfield", // Changed from "none" to "textfield" for better number input support
                            MozAppearance: "textfield", // Firefox
                            WebkitAppearance: "none", // WebKit browsers
                            outline: "none",
                            border: "none",
                        }}
                        />
                    );
                } else if (content.type === BOX_TYPES.BOOL_INPUT) {
                    return (<select
                        key={`box-${content.id}`}
                        ref={(el) => { boxRefs.current[content.id] = el; }}
                        onChange={(e) => (!isOriginal) ? setInputBoxes(content.id, e.target.value) : null}
                        onMouseDown={(e) => {
                            if (!isEmptySubBlock) {
                                e.stopPropagation();
                            }
                        }}
                        value={value(content.id)}
                        style={{
                            color:"black",
                            borderRadius: BOX_RADIUS,
                            minWidth: isEmptySubBlock ? EMPTY_BLOCK_WIDTH : BOX_HEIGHT,
                            height: content.type === BOX_TYPES.SUB_BLOCK || isEmptySubBlock ? SUB_BLOCK_HEIGHT : SUB_BLOCK_HEIGHT,
                            backgroundColor: 
                                dropTargetBox &&
                                dropTargetBox.id === content.id &&
                                isEmptySubBlock
                                    ? COLORS.DROP_TARGET
                                    : isEmptySubBlock ? COLORS.EMPTY : content.color,
                            boxShadow: isEmptySubBlock ? "none" : 
                                (boxes.some(boxStack => boxStack.isDragging && boxStack.boxes.some(b => b.id === content.id)) 
                                    ? DRAGGING_SHADOW 
                                    : BOX_SHADOW),
                            flexShrink: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: '0 8px',
                            margin: '0 4px',
                            transition: "background-color 0.2s, box-shadow 0.2s",
                            fontWeight: content.type === BOX_TYPES.SUB_BLOCK ? 400 : 500,
                        }}
                    ><option value="true">true</option>
                    <option value="false">false</option>
                    </select>)
                }else {
                    let leftColor = COLORS.DARK_BLUE;
                    let rightColor = COLORS.DARK_BLUE;
                    let topColor = COLORS.DARK_BLUE;
                    let bottomColor = COLORS.DARK_BLUE;
                    const accNum = content.acceptedReturnTypes.includes(RETURN_TYPES.NUMBER);
                    const accBool = content.acceptedReturnTypes.includes(RETURN_TYPES.BOOLEAN);
                    const accStr = content.acceptedReturnTypes.includes(RETURN_TYPES.STRING);
                    if (accNum && accBool && accStr) {
                        rightColor = COLORS.ORANGE;
                        bottomColor = COLORS.LIGHT_GREEN;
                        topColor = COLORS.PURPLE;
                    }
                    else if (accNum && accBool)  {
                        rightColor = COLORS.ORANGE;
                        bottomColor = COLORS.ORANGE;
                    }
                    else if (accNum && accStr) {
                        leftColor = COLORS.LIGHT_GREEN;
                        topColor = COLORS.LIGHT_GREEN;
                    }
                    else if (accBool && accStr) {
                        rightColor = COLORS.ORANGE;
                        bottomColor = COLORS.ORANGE;
                        leftColor = COLORS.LIGHT_GREEN;
                        topColor = COLORS.LIGHT_GREEN;
                    } else if (accBool) {
                        rightColor = COLORS.ORANGE;
                        bottomColor = COLORS.ORANGE;
                        leftColor = COLORS.ORANGE;
                        topColor = COLORS.ORANGE;
                    } else if (accStr) {
                        rightColor = COLORS.LIGHT_GREEN;
                        bottomColor = COLORS.LIGHT_GREEN;
                        leftColor = COLORS.LIGHT_GREEN;
                        topColor = COLORS.LIGHT_GREEN;
                    } else if (!accNum) {
                        rightColor = COLORS.PURPLE;
                        bottomColor = COLORS.PURPLE;
                        leftColor = COLORS.PURPLE;
                        topColor = COLORS.PURPLE;
                    }
                    return (
                        <div
                            key={`box-${content.id}`}
                            ref={(el) => { boxRefs.current[content.id] = el; }}
                            onMouseDown={(e) => {
                                if (!isEmptySubBlock) {
                                    e.stopPropagation();
                                    onMouseDown(e, content.id);
                                }
                            }}
                            style={{
                                borderRadius: BOX_RADIUS,
                                width: isEmptySubBlock ? EMPTY_BLOCK_WIDTH : "auto",
                                minWidth: isEmptySubBlock ? EMPTY_BLOCK_WIDTH : BOX_HEIGHT,
                                height: content.type === BOX_TYPES.SUB_BLOCK || isEmptySubBlock ? SUB_BLOCK_HEIGHT : SUB_BLOCK_HEIGHT,
                                backgroundColor: 
                                    dropTargetBox &&
                                    dropTargetBox.id === content.id &&
                                    isEmptySubBlock
                                        ? COLORS.DROP_TARGET
                                        : isEmptySubBlock ? COLORS.EMPTY : content.color,
                                boxShadow: isEmptySubBlock ? "none" : 
                                    (boxes.some(boxStack => boxStack.isDragging && boxStack.boxes.some(b => b.id === content.id)) 
                                        ? DRAGGING_SHADOW 
                                        : BOX_SHADOW),
                                flexShrink: 0,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: '0 8px',
                                margin: '0 4px',
                                borderWidth: isEmptySubBlock ? "2.3px" : 0,
                                borderStyle: "dashed",
                                borderTopColor: topColor,
                                borderRightColor: rightColor,
                                borderBottomColor: bottomColor,
                                borderLeftColor: leftColor,
                                transition: "background-color 0.2s, box-shadow 0.2s",
                                fontWeight: content.type === BOX_TYPES.SUB_BLOCK ? 400 : 500,
                            }}
                        >
                            {isEmptySubBlock 
                                ? "..." 
                                : renderContents(content, box.isOriginal)
                            }
                        </div>
                    );
                }
            }
        });
    };

    return (
        <div
            ref={containerRef}
            className="h-full"
            style={{
                position: "relative",
                width: "100vw",
                // height: "",
                overflow: "hidden",
                backgroundColor: COLORS.BACKGROUND,
                fontFamily: "system-ui, -apple-system, sans-serif",
            }}
        >
            {/* display library */}
            <div style={{
                    position: "absolute",
                    top: "0", 
                    bottom: "0",
                    left: "0",
                    width: "400px",  
                    overflowY: "auto",
                    overflowX: "hidden",
                    padding: "8px",
                    backgroundColor: `#666`,
                    borderRight: `4px solid rgb(0, 0, 0)`,
                    // borderTopRightRadius: "20px",
                    // borderBottomRightRadius: "20px",
                    direction: "rtl",
                }}>
                <div style= {{direction: "ltr"}}>
                {/* Title area */}
                <div style={{ position: "relative", width: "100%", height: "100%" }} >
                {/* Render Library Boxes */}
                {boxes
                    .flatMap((boxStack) => boxStack.boxes)
                    .map((box) => {
                    if (box.type === BOX_TYPES.EMPTY_SUB_BLOCK || !box.isOriginal) return null;

                    const isDragging = boxes.some(
                        (boxStack2) =>
                        boxStack2.boxes.some((b) => b.id === box.id) && boxStack2.isDragging
                    );
                    const isSubBlock = box.type === BOX_TYPES.SUB_BLOCK;

                    return (
                        <div
                        key={box.id}
                        ref={(el) => {
                            boxRefs.current[box.id] = el;
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            onMouseDown(e, box.id);
                        }}
                        style={{
                            position: "absolute",
                            left: box.x + box.indentation * BOX_HEIGHT,
                            top: box.y + BOX_HEIGHT * box.verticalOffset,
                            height: isSubBlock ? SUB_BLOCK_HEIGHT : BOX_HEIGHT,
                            minWidth: isSubBlock ? "auto" : BOX_WIDTH,
                            backgroundColor: box.color,
                            cursor: isDragging ? "grabbing" : "grab",
                            userSelect: "none",
                            zIndex:
                            box.indentation +
                            100 * boxes.findIndex((stack) =>
                                stack.boxes.some((b) => b.id === box.id)
                            ),
                            borderRadius: isSubBlock
                            ? `${BOX_RADIUS}px`
                            : `${BOX_RADIUS / 2}px ${BOX_RADIUS}px ${BOX_RADIUS}px ${
                                BOX_RADIUS / 2
                                }px`,
                            boxShadow: isDragging ? DRAGGING_SHADOW : BOX_SHADOW,
                            transition: "box-shadow 0.2s",
                            display: "flex",
                            alignItems: "center",
                            paddingLeft: isSubBlock ? 8 : 12,
                            paddingRight: 12,
                            fontWeight: isSubBlock ? 400 : 500,
                            fontSize: isSubBlock ? "14px" : "15px",
                            border: box.isOriginal
                            ? `2px solid ${
                                box.color === COLORS.EMPTY ? "#ced4da" : box.color
                                }`
                            : "none",
                            borderLeftWidth: isSubBlock ? 2 : 0,
                        }}
                        >
                        <div
                            style={{
                            display: "flex",
                            alignItems: "center",
                            height: "100%",
                            gap: "2px",
                            }}
                        >
                            {renderContents(box, box.isOriginal)}
                        </div>
                        </div>
                    );
                    })}

                {/* Input + Button */}
                <div
                    style={{
                    position: "absolute",
                    top: addVariableOffset,
                    left: 20,
                    display: "flex",
                    gap: "10px",
                    marginTop: "12px",
                    width: "calc(100% - 40px)",
                    }}
                >
                    <input
                    type="text"
                    value={newVariable}
                    onChange={(e) => setNewVariable(e.target.value)}
                    placeholder="New Variable..."
                    style={{
                        border: `2px solid ${COLORS.PURPLE}`,
                        borderRadius: BOX_RADIUS,
                        height: "38px",
                        width: "200px",
                        padding: "0 12px",
                        fontSize: "14px",
                        backgroundColor: "white",
                        color: "#212529",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                        outline: "none",
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSubmit();
                    }}
                    />
                    <button
                    onClick={handleSubmit}
                    style={{
                        border: "none",
                        borderRadius: BOX_RADIUS,
                        height: "38px",
                        padding: "0 16px",
                        fontSize: "14px",
                        cursor: "pointer",
                        backgroundColor: COLORS.PURPLE,
                        color: "white",
                        fontWeight: 500,
                        boxShadow: BOX_SHADOW,
                        transition: "background-color 0.2s, transform 0.1s",
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
                    onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                    >
                    Add Variable
                    </button>
                </div>
                <div style={{
                    top: LIBRARY_Y_SPACING * (boxes.filter((boxStack) => boxStack.boxes.some((box) => box.isOriginal)).length + 1) + (boxes.map((boxStack) => {
                        if (boxStack.boxes.some(box => box.isOriginal)) {
                            return boxStack.boxes.length - 1;
                        }
                    }).reduce((acc, val) => (acc && val) ? acc + val : acc) || 0) * BOX_HEIGHT + (LIBRARY_Y_SPACING + 18),
                    position: "absolute",
                    height: "200px",
                    width: "10px",
                }}>

                </div>
                </div>
            </div>
            </div>
            {/* Display boxes */}
            {boxes.flatMap((boxStack) => boxStack.boxes).map((box) => {
                // Skip rendering empty sub blocks directly - they're rendered inside their parent blocks
                if (box.type === BOX_TYPES.EMPTY_SUB_BLOCK) return null;
                if (box.isOriginal) return null;

                const isDragging = boxes.some(boxStack2 => 
                    boxStack2.boxes.some(b => b.id === box.id) && boxStack2.isDragging);
                const isSubBlock = box.type === BOX_TYPES.SUB_BLOCK;
                
                return (
                    <div
                        key={box.id}
                        ref={(el) => {
                            boxRefs.current[box.id] = el;
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            onMouseDown(e, box.id);
                        }}
                        style={{
                            position: "absolute",
                            left: box.x + box.indentation * BOX_HEIGHT,
                            top: box.y + BOX_HEIGHT * box.verticalOffset,
                            height: isSubBlock ? SUB_BLOCK_HEIGHT : BOX_HEIGHT,
                            minWidth: isSubBlock ? "auto" : BOX_WIDTH,
                            backgroundColor: box.color,
                            cursor: isDragging ? "grabbing" : "grab",
                            userSelect: "none",
                            zIndex: box.indentation + 100 * boxes.findIndex(boxStack => boxStack.boxes.some(b => b.id === box.id)),
                            borderRadius: isSubBlock ? `${BOX_RADIUS}px` : `${BOX_RADIUS/2}px ${BOX_RADIUS}px ${BOX_RADIUS}px ${BOX_RADIUS/2}px`,
                            boxShadow: isDragging ? DRAGGING_SHADOW : BOX_SHADOW,
                            transition: "box-shadow 0.2s",
                            display: "flex",
                            alignItems: "center",
                            paddingLeft: isSubBlock ? 8 : 12,
                            paddingRight: 12,
                            fontWeight: isSubBlock ? 400 : 500,
                            fontSize: isSubBlock ? "14px" : "15px",
                            border: box.isOriginal ? `2px solid ${box.color === COLORS.EMPTY ? "#ced4da" : box.color}` : "none",
                            borderLeftWidth: isSubBlock ? 2 : 0,
                        }}
                    >
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            height: "100%",
                            gap: "2px",
                        }}>
                            {renderContents(box, box.isOriginal)}
                        </div>
                    </div>
                );
            })}

            {/* Drop target indicator */}
            {dropTargetBox && dropTargetBox.type !== BOX_TYPES.EMPTY_SUB_BLOCK && (
                <div
                    style={{
                        position: "absolute",
                        left: dropTargetBox.x + dropTargetBox.indentation * BOX_HEIGHT + (dropTargetBox.type === BOX_TYPES.WRAPPER || dropTargetBox.type === BOX_TYPES.MID_WRAPPER ? BOX_HEIGHT : 0),
                        top: dropTargetBox.y + BOX_HEIGHT,
                        width: BOX_WIDTH,
                        height: 4,
                        backgroundColor: "#4c6ef5",
                        pointerEvents: "none",
                        zIndex: dropTargetBox.indentation + 100 * boxes.findIndex(boxStack => 
                            boxStack.boxes.some(b => b.id === dropTargetBox.id)) + 1,
                        borderRadius: 2,
                        boxShadow: "0 0 4px rgba(76, 110, 245, 0.5)",
                    }}
                ></div>
            )}
        </div>
    );
}
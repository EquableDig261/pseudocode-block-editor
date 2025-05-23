// mouseHandlers.js
import { Box, BoxStack } from "./../types";
import { BOX_HEIGHT, BOX_WIDTH, BOX_TYPES } from "./../constants";
import { RETURN_TYPES } from "./../../constants"
import { getEmptySubBlock, getEmptyInputBlock } from "../utils/boxCreation";
import { getContents, replaceContents, removeSubBox, boxIsASubBoxOf } from "./../utils/boxOperations";

/**
 * Creates mouse handlers for the block editor
 * @param {Object} params - Parameters
 * @returns {Object} Mouse handlers
 */
export function createMouseHandlers({
    containerRef,
    boxRefs,
    nextId,
    boxes,
    setBoxes,
    grabOffset,
    setGrabOffset,
    setDropTargetBox,
    setDraggingBox,
    dropTargetBox,
    draggingBox
}: {
    containerRef: React.RefObject<HTMLDivElement | null>,
    boxRefs: React.RefObject<{[key: number]: HTMLDivElement | HTMLInputElement | HTMLSelectElement | null;}>,
    nextId: React.RefObject<number>,
    boxes: BoxStack[],
    setBoxes: React.Dispatch<React.SetStateAction<BoxStack[]>>,
    grabOffset: { x: number, y: number },
    setGrabOffset: React.Dispatch<React.SetStateAction<{ x: number, y: number }>>,
    setDropTargetBox: React.Dispatch<React.SetStateAction<Box | null>>,
    setDraggingBox: React.Dispatch<React.SetStateAction<Box | null>>,
    dropTargetBox: Box | null,
    draggingBox: Box | null
}) {
    /**
     * Handles mouse down events on boxes
     */
    const handleMouseDown = (e: React.MouseEvent, id: number) => {
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
                    getContents(box).forEach((content : (string | Box)) => {
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
    

    /**
     * Handles mouse move during drag operations
     */
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
                            getContents(box).forEach((content: (Box | string)) => {
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
    

    /**
     * Handles mouse up to complete drag operations
     */
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

    return {
        handleMouseDown,
        handleMouseMove,
        handleMouseUp
    };
}
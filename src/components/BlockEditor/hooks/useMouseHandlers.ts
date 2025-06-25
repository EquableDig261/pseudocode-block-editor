// mouseHandlers.js
import { Box, BoxStack } from "./../types";
import { BOX_HEIGHT, BOX_WIDTH } from "./../constants";
import { RETURN_TYPES, BOX_TYPES } from "./../../constants"
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
    draggingBox,
    canvasOffsetX, // Receive canvas offsets
    canvasOffsetY, // Receive canvas offsets
    LIBRARY_WIDTH, // Receive LIBRARY_WIDTH
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
    draggingBox: Box | null,
    canvasOffsetX: number, // Type definition for canvasOffsetX
    canvasOffsetY: number, // Type definition for canvasOffsetY
    LIBRARY_WIDTH: number, // Type definition for LIBRARY_WIDTH
}) {
    /**
     * Handles mouse down events on boxes
     */
    const handleMouseDown = (e: React.MouseEvent, id: number) => {
            const ref = boxRefs.current[id];
            if (!ref || !containerRef.current) return;
    
            const containerRect = containerRef.current.getBoundingClientRect();

            let offsetX;
            let offsetY;
            
            // Temporary variable to find the box
            let clickedBox: Box | null = null;
            boxes.flatMap((boxStack) => boxStack.boxes).forEach((box) => {
                if (box.id === id) {
                    clickedBox = box;
                } else {
                    getContents(box).forEach((content: (string | Box)) => {
                        if (typeof content !== "string" && content.id === id) {
                            clickedBox = content;
                        }
                    });
                }
            });

            if (!clickedBox) return; // Should not happen if id is valid

            if (clickedBox.isOriginal) {
                const boxRect = ref.getBoundingClientRect();
                offsetX = e.clientX - boxRect.left + LIBRARY_WIDTH;
                offsetY = e.clientY - boxRect.top;
            } else {
                if (clickedBox.type === BOX_TYPES.SUB_BLOCK) {
                    const boxRect = ref.getBoundingClientRect();
                    offsetX = e.clientX - boxRect.left + LIBRARY_WIDTH;
                    offsetY = e.clientY - boxRect.top;
                } else {
                    offsetX = (e.clientX - containerRect.left - LIBRARY_WIDTH - canvasOffsetX) - clickedBox.x - clickedBox.indentation * BOX_HEIGHT;
                    offsetY = (e.clientY - containerRect.top - canvasOffsetY) - clickedBox.y;
                }
            }
            
            setGrabOffset({ x: offsetX, y: offsetY });
    
            let draggingBoxCandidate : Box | null = null;
            // find the box that is currently selected
            boxes.flatMap((boxStack) => boxStack.boxes).forEach((box) => {
                if (box.id === id) {
                    draggingBoxCandidate = box;
                    return;
                }
                else {
                    getContents(box).forEach((content : (string | Box)) => {
                        if (typeof content !== "string" && content.id === id) {
                            draggingBoxCandidate = content;
                            return;
                        }
                    })
                }
            })
            if (!draggingBoxCandidate) {
                setDraggingBox(null);
                return;
            }
            // Use the candidate as the actual draggingBox
            setDraggingBox(draggingBoxCandidate);

            const draggingBoxStack = boxes.find(boxStack => boxStack.boxes.some(box => box.id === id));
    
            if (draggingBoxStack) {        
                if ((draggingBoxCandidate as Box).isOriginal) {
                    // When dragging an original box from the library, create a clone
                    // Calculate the initial position for the cloned box relative to the canvas area
                    // This initialCloneX will be the base X (zero indentation) for the new stack.
                    // The clone's x,y will be in the internal canvas coordinate system.
                    const initialCloneX = e.clientX - containerRect.left - LIBRARY_WIDTH - canvasOffsetX - offsetX;
                    const initialCloneY = e.clientY - containerRect.top - canvasOffsetY - offsetY;

                    const clone: BoxStack = {
                        boxes: draggingBoxStack.boxes.map((box2, idx) => {
                            return {
                                ...box2, 
                                isOriginal: false, 
                                id: nextId.current++, 
                                // Set initial x for the cloned box as the base X of the stack.
                                // Indentation will be handled by the 'indentation' property and rendering.
                                x: initialCloneX, 
                                y: initialCloneY + (idx * BOX_HEIGHT), 
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
                    setDraggingBox(clone.boxes.find(box2 => draggingBoxCandidate && box2.type === draggingBoxCandidate.type) || clone.boxes[0]);
                    setBoxes((prev) => [...prev, clone]);
                } else {
                    // When dragging an existing box from the canvas
                    // grabOffset already adjusted above for existing boxes
                    
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
                    
                        
                        if (!draggingBoxCandidate) return prev;
                        const dragIndentation = draggingBoxCandidate.indentation + (draggingBoxCandidate.type === BOX_TYPES.MID_WRAPPER ? 1 : 0)
    
                        let endIndex = originalBoxStack.boxes.findIndex((box, index) => draggingBoxCandidate && box.indentation < dragIndentation && index > boxIndex) - 1;
                        let startIndex = boxIndex;
                        
                        if (draggingBoxCandidate.type === BOX_TYPES.WRAPPER) {
                            endIndex = originalBoxStack.boxes.findIndex((box, index) => draggingBoxCandidate && box.indentation < dragIndentation && index > boxIndex) - 1;
                        }
                        else if (draggingBoxCandidate.type === BOX_TYPES.END_WRAPPER) {
                            startIndex = originalBoxStack.boxes.length - 1 - originalBoxStack.boxes.toReversed().findIndex((box, index) => draggingBoxCandidate && box.indentation === dragIndentation && box.type === BOX_TYPES.WRAPPER && boxIndex > originalBoxStack.boxes.length - index - 1);
                            endIndex = originalBoxStack.boxes.findIndex((box, index) => draggingBoxCandidate && box.indentation < dragIndentation && index > boxIndex) - 1;
                            if (startIndex === originalBoxStack.boxes.length) {
                                startIndex = originalBoxStack.boxes.findIndex(box => box.id === draggingBoxCandidate.id)
                                endIndex = startIndex
                            }
                        }
                        
                        if (endIndex === -2) {
                            endIndex = originalBoxStack.boxes.length - 1
                        }
                        console.log(startIndex)
                        console.log(endIndex)
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
                        
                        // calculate indentation on each box relative to the new dragging stack
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
                                    // Ensure x is just the base x; indentation will be handled by previousIndentation and rendering.
                                    x: box.type === BOX_TYPES.SUB_BLOCK ? 
                                        (e.clientX - containerRect.left - LIBRARY_WIDTH - canvasOffsetX - offsetX) : 
                                        (box.x + draggingBoxCandidate.indentation * BOX_HEIGHT), 
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
                // This block handles dragging a sub-box that is not part of a stack in the main canvas
                setDraggingBox(draggingBoxCandidate);
                setBoxes((prev) => {
                    if (!draggingBoxCandidate) return prev;
                    
                    const newBoxes = prev.map((boxStack) => ({
                        ...boxStack,
                        boxes: boxStack.boxes.map((box) =>
                            draggingBoxCandidate ? removeSubBox(draggingBoxCandidate.id, box, nextId.current++, draggingBoxCandidate.returnType) : box
                        ),
                    }));
    
                    // The initial position of the dragged box is based on the mouse down event
                    // and the grab offset relative to the main canvas area.
                    // This initialX will be the base X (zero indentation).
                    const initialX = e.clientX - containerRect.left - LIBRARY_WIDTH - canvasOffsetX - grabOffset.x;
                    const initialY = e.clientY - containerRect.top - canvasOffsetY - grabOffset.y;
    
                    newBoxes.push({boxes: [{...draggingBoxCandidate, x: initialX, y: initialY}], isDragging: true})
                    return newBoxes;
                });
            }
        };
    

    /**
     * Handles mouse move during drag operations
     */
    const handleMouseMove = (e: MouseEvent) => {
                if (!containerRef.current || !draggingBox) return; // Ensure draggingBox exists
                const containerRect = containerRef.current.getBoundingClientRect();
    
                // Calculate the new position of the top-left corner of the dragging element
                // relative to the main canvas area, by subtracting the grabOffset and canvas/library offsets.
                const boxX = e.clientX - containerRect.left - LIBRARY_WIDTH - canvasOffsetX - grabOffset.x;
                const boxY = e.clientY - containerRect.top - canvasOffsetY - grabOffset.y;
                
                // These are raw mouse coordinates relative to the viewport, which are used for hit-testing
                // with rendered elements whose positions are also viewport-relative.
                const mouseX = e.clientX;
                const mouseY = e.clientY;
    
                const draggedBoxStack = boxes.find((boxStack) => 
                    boxStack.boxes.some((box) => box.id === draggingBox.id)
                );
                const draggedBoxIndex = draggedBoxStack?.boxes.findIndex((box) => 
                    box.id === draggingBox.id
                );
                if (!draggedBoxStack || draggedBoxIndex === -1 || draggedBoxIndex === undefined) return;
    
                // Set the position of the dragging box stack to follow the mouse.
                // All boxes in the dragging stack share the same base X, and their individual
                // indentation property will provide the visual offset.
                setBoxes((prev) =>
                    prev.map((boxStack) => {
                        if (!boxStack.isDragging) return boxStack;
                        return {
                            boxes: boxStack.boxes.map((box, index) => ({
                                ...box,
                                x: boxX, // Set x to the base X of the stack
                                y: boxY + (index - draggedBoxIndex) * BOX_HEIGHT, // Vertical position relative to the grabbed box
                            })),
                            isDragging: boxStack.isDragging,
                        };                    
                    })
                );
    
                const currentDraggingBoxStack = boxes.find((boxStack) => boxStack.isDragging);
                if (!currentDraggingBoxStack) return; // Use currentDraggingBoxStack, not draggingBoxStack from closure

                let closestTarget: Box | null = null;
    
                // Find the closest target that the mouse is within
                if (draggingBox.type !== BOX_TYPES.SUB_BLOCK) {
                    boxes.forEach((boxStack) => {
                        boxStack.boxes.forEach((box) => {
                            const beingDragged = currentDraggingBoxStack.boxes.some( // Use currentDraggingBoxStack
                                (draggedBox) => draggedBox.id === box.id
                            );
                            if (beingDragged || box.isOriginal) return; // Original boxes cannot be drop targets for main blocks
                            if (box.type === BOX_TYPES.SUB_BLOCK) return;
    
                            // Calculate the effective visual X for the box on canvas for hit detection
                            // This visualX should be viewport-relative
                            const boxVisualX = box.x + box.indentation * BOX_HEIGHT + 2*LIBRARY_WIDTH + canvasOffsetX;
                            const boxVisualY = box.y + BOX_HEIGHT * box.verticalOffset + canvasOffsetY + 80;

                            // Check if mouse is within the horizontal and vertical bounds of the drop target area (below the block)
                            const mouseWithinTarget = 
                                mouseX >= boxVisualX && mouseX <= boxVisualX + BOX_WIDTH &&
                                mouseY >= boxVisualY + BOX_HEIGHT && mouseY <= boxVisualY + BOX_HEIGHT * 2; // Target area is below the block
                            
                            // Calculate distance to the center of the drop target area
                            const targetCenterX = boxVisualX + BOX_WIDTH / 2;
                            const targetCenterY = boxVisualY + BOX_HEIGHT * 1.5;
                            const distanceToCentreOfTarget = Math.hypot(targetCenterX - mouseX, targetCenterY - mouseY);
                            
                            const closestDistanceToCentre = closestTarget ? 
                                Math.hypot(
                                    (closestTarget.x + closestTarget.indentation * BOX_HEIGHT + LIBRARY_WIDTH + canvasOffsetX + BOX_WIDTH / 2) - mouseX, 
                                    (closestTarget.y + BOX_HEIGHT * closestTarget.verticalOffset + canvasOffsetY + BOX_HEIGHT * 1.5) - mouseY
                                ) : Infinity;
    
                            if (mouseWithinTarget && distanceToCentreOfTarget < closestDistanceToCentre) {
                                closestTarget = box;
                            }
                        });
                    });
                    if (closestTarget) {
                        const draggingStackLength = currentDraggingBoxStack.boxes.length; // Use currentDraggingBoxStack
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
                                    const rect = ref?.getBoundingClientRect(); // rect is viewport-relative
                                    if (!rect) return;
                                    
                                    // Use viewport coordinates for comparison with rect.
                                    if (
                                        mouseX >= rect.left &&
                                        mouseX <= rect.right &&
                                        mouseY >= rect.top &&
                                        mouseY <= rect.bottom
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
        console.log(boxes)
                if (!containerRef.current || !draggingBox) return; // Ensure draggingBox exists
                const containerRect = containerRef.current.getBoundingClientRect();
                const mouseXRelativeContainer = e.clientX - containerRect.left;
                
                // If dropping within the library area, remove the dragging box
                if (mouseXRelativeContainer < LIBRARY_WIDTH) { // Removed 'draggingBox &&' as it's checked at function start
                    setBoxes((prev) => prev.filter(boxStack => !boxStack.isDragging))
                    setDropTargetBox(null);
                    setDraggingBox(null);
                    return;
                }
                if (dropTargetBox) { // Removed 'draggingBox &&' as it's checked at function start
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
                                    // When dropping, the x should align with the drop target's base X.
                                    // The indentation will be re-applied based on its new position in the stack.
                                    x: dropTargetBox.x,
                                    y: dropTargetBox.y + BOX_HEIGHT * (index + 1),
                                    verticalOffset: 0,
                                    // Indentation is now the drop target's indentation + its own relative indentation within the dragged stack
                                    indentation: dropTargetBox.indentation + box.indentation + ((dropTargetBox.type === BOX_TYPES.WRAPPER || dropTargetBox.type === BOX_TYPES.MID_WRAPPER) ? 1 : 0),
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

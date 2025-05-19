"use client";

import { useState, useRef, useEffect } from "react";
import { Box, BoxStack} from "./types"
import { BOX_HEIGHT, BOX_WIDTH, LIBRARY_Y_SPACING, LIBRARY_X_SPACING, BOX_RADIUS, SUB_BLOCK_HEIGHT, EMPTY_BLOCK_WIDTH, BOX_SHADOW, DRAGGING_SHADOW, RETURN_TYPES, BOX_TYPES, COLORS, SUB_BOX_TYPES, LIBRARY_BOXES} from "./constants"
import { serialize} from "./utils/serialization"
import { getEmptySubBlock, getEmptyInputBlock } from "./utils/utility"
import { deserialize } from "./utils/deserialization"
import { createMouseHandlers } from "./hooks/useMouseHandlers"
import { updateInputBox, getContents } from "./utils/boxOperations";
import './styles/BlockEditor.css'




let addVariableOffset = 0



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

    const { handleMouseDown, handleMouseMove, handleMouseUp } = createMouseHandlers({
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
    });

    useEffect(() => {
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
    }, [grabOffset, boxes, dropTargetBox, draggingBox, handleMouseMove, handleMouseUp]);

    useEffect(() => {
        localStorage.setItem("editorContent", serialize(boxes))
    }, [boxes])

    
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
                                    handleMouseDown(e, content.id);
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
                            handleMouseDown(e, box.id);
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
                            handleMouseDown(e, box.id);
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
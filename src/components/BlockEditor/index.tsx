"use client";

import { useState, useRef, useEffect } from "react";
import { Box, BoxStack} from "./types"
import { BOX_HEIGHT, BOX_WIDTH, LIBRARY_Y_SPACING, BOX_RADIUS, SUB_BLOCK_HEIGHT, EMPTY_BLOCK_WIDTH, BOX_SHADOW, DRAGGING_SHADOW, BOX_TYPES} from "./constants"
import { COLORS, RETURN_TYPES } from "./../constants";
import { serialize} from "./utils/serialization"
import { createNewVariable, getOriginalBoxes } from "./utils/boxCreation"
import { deserialize } from "./utils/deserialization"
import { createMouseHandlers } from "./hooks/useMouseHandlers"
import { updateInputBox, value } from "./utils/boxOperations";
import './styles/BlockEditor.css'

export default function BlockEditor() {
    const containerRef = useRef<HTMLDivElement>(null);
    const boxRefs = useRef<{ [key: number]: HTMLDivElement | HTMLInputElement | HTMLSelectElement | null }>({});
    const mouseMoveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
    const mouseUpHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
    const nextId = useRef(0);
    
    const originalBoxes = getOriginalBoxes(nextId);

    const [boxes, setBoxes] = useState<BoxStack[]>(() => {
        return originalBoxes.concat(deserialize(nextId));
    });
    const [grabOffset, setGrabOffset] = useState({ x: 0, y: 0 });
    const [dropTargetBox, setDropTargetBox] = useState<Box | null>(null);
    const [draggingBox, setDraggingBox] = useState<Box | null>(null);
    const [newVariable, setNewVariable] = useState("");

    const variableAdditionYOffset = LIBRARY_Y_SPACING * (originalBoxes.length) + (originalBoxes.map((boxStack) => boxStack.boxes.length - 1).reduce((acc, val) => (acc && val) ? acc + val : acc) || 0) * BOX_HEIGHT;

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
        mouseMoveHandlerRef.current = handleMouseMove;
        mouseUpHandlerRef.current = handleMouseUp;

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            if (mouseMoveHandlerRef.current) {
                document.removeEventListener("mousemove", mouseMoveHandlerRef.current);
            }
            if (mouseUpHandlerRef.current) {
                document.removeEventListener("mouseup", mouseUpHandlerRef.current);
            }
        };
    }, [grabOffset, boxes, dropTargetBox, draggingBox, handleMouseMove, handleMouseUp]);

    useEffect(() => {
        console.log(boxes);
        localStorage.setItem("editorContent", serialize(boxes))
    }, [boxes])

    // RENDERING  

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
                                setBoxes((prev) => updateInputBox(prev, content.id, e.target.value));
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
                        value={value(content.id, boxes)}
                        style={{
                            color: "black",
                            borderRadius: BOX_RADIUS,
                            height: SUB_BLOCK_HEIGHT,
                            backgroundColor:
                                dropTargetBox &&dropTargetBox.id === content.id && isEmptySubBlock ? COLORS.DROP_TARGET
                                    : isEmptySubBlock ? COLORS.EMPTY : content.color,
                            boxShadow: isEmptySubBlock ? "none"
                                : boxes.some(boxStack => boxStack.isDragging && boxStack.boxes.some(b => b.id === content.id))
                                ? DRAGGING_SHADOW : BOX_SHADOW,
                            flexShrink: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0 8px",
                            margin: "0 4px",
                            transition: "background-color 0.2s, box-shadow 0.2s",
                            fontWeight: content.type === BOX_TYPES.SUB_BLOCK ? 400 : 500,
                            appearance: "textfield",
                            MozAppearance: "textfield",
                            WebkitAppearance: "none",
                            outline: "none",
                            border: "none",
                        }}
                        />
                    );
                } else if (content.type === BOX_TYPES.BOOL_INPUT) {
                    return (<select
                        key={`box-${content.id}`}
                        ref={(el) => { boxRefs.current[content.id] = el; }}
                        onChange={(e) => (!isOriginal) ? setBoxes((prev) => updateInputBox(prev, content.id, e.target.value)) : null}
                        onMouseDown={(e) => {
                            if (!isEmptySubBlock) {
                                e.stopPropagation();
                            }
                        }}
                        value={value(content.id, boxes)}
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
                    const acceptsNumbers = content.acceptedReturnTypes.includes(RETURN_TYPES.NUMBER);
                    const acceptsBooleans = content.acceptedReturnTypes.includes(RETURN_TYPES.BOOLEAN);
                    const acceptsStrings = content.acceptedReturnTypes.includes(RETURN_TYPES.STRING);

                    let borderColors = [COLORS.DARK_BLUE, COLORS.DARK_BLUE, COLORS.DARK_BLUE, COLORS.DARK_BLUE]
                    if (acceptsNumbers && acceptsBooleans && acceptsStrings) {
                        borderColors = [COLORS.PURPLE, COLORS.ORANGE, COLORS.LIGHT_GREEN, COLORS.DARK_BLUE];
                    } else if (acceptsNumbers && acceptsBooleans)  {
                        borderColors = [COLORS.DARK_BLUE, COLORS.ORANGE, COLORS.ORANGE, COLORS.DARK_BLUE];
                    } else if (acceptsNumbers && acceptsStrings) {
                        borderColors = [COLORS.LIGHT_GREEN, COLORS.DARK_BLUE, COLORS.DARK_BLUE, COLORS.LIGHT_GREEN];
                    } else if (acceptsBooleans && acceptsStrings) {
                        borderColors = [COLORS.ORANGE, COLORS.LIGHT_GREEN, COLORS.LIGHT_GREEN, COLORS.ORANGE];
                    } else if (acceptsBooleans) {
                        borderColors = [COLORS.ORANGE, COLORS.ORANGE, COLORS.ORANGE, COLORS.ORANGE];
                    } else if (acceptsStrings) {
                        borderColors = [COLORS.LIGHT_GREEN, COLORS.LIGHT_GREEN, COLORS.LIGHT_GREEN, COLORS.LIGHT_GREEN];
                    } else if (!acceptsNumbers) {
                        borderColors = [COLORS.PURPLE, COLORS.PURPLE, COLORS.PURPLE, COLORS.PURPLE];
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
                                borderTopColor: borderColors[0],
                                borderRightColor: borderColors[1],
                                borderBottomColor: borderColors[2],
                                borderLeftColor: borderColors[3],
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

    const renderBox = (box:Box) => {
        const isDragging = boxes.some(
            (boxStack2) => boxStack2.boxes.some((b) => b.id === box.id) && boxStack2.isDragging
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
                    zIndex: box.indentation + 100 * boxes.findIndex((stack) =>
                            stack.boxes.some((b) => b.id === box.id)
                        ),
                    borderRadius: isSubBlock ? `${BOX_RADIUS}px`
                        : `${BOX_RADIUS / 2}px ${BOX_RADIUS}px ${BOX_RADIUS}px ${BOX_RADIUS / 2}px`,
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
        )
    }

    return (
        <div
            ref={containerRef}
            className="h-full"
            style={{
                position: "relative",
                width: "100vw",
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
                direction: "rtl",
            }}>
                <div style={{direction: "ltr", position: "relative", width: "100%", height: "100%" }} >
                {/* Render Library Boxes */}
                {boxes.flatMap((boxStack) => boxStack.boxes).map((box) => {
                    if (box.type === BOX_TYPES.EMPTY_SUB_BLOCK || !box.isOriginal) return null;
                    return (renderBox(box));
                })}

                {/* Input + Button */}
                <div
                    style={{
                    position: "absolute",
                    top: variableAdditionYOffset,
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
                            if (e.key === 'Enter') {
                                const newVar = createNewVariable(newVariable, boxes, nextId.current++);
                                if (newVar !== undefined) {
                                    setNewVariable("");
                                    setBoxes((previous) => [...previous, newVar]);
                                }
                            }
                        }}
                    />
                    <button
                        onClick={() => {
                            const newVar = createNewVariable(newVariable, boxes, nextId.current++);
                            if (newVar !== undefined) {
                                setNewVariable("");
                                setBoxes((previous) => [...previous, newVar]);
                            }
                        }}
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
                <div 
                    style={{
                        top: LIBRARY_Y_SPACING * (boxes.filter((boxStack) => boxStack.boxes.some((box) => box.isOriginal)).length + 1) + (boxes.map((boxStack) => {
                            if (boxStack.boxes.some(box => box.isOriginal)) {
                                return boxStack.boxes.length - 1;
                            }
                        }).reduce((acc, val) => (acc && val) ? acc + val : acc) || 0) * BOX_HEIGHT + (LIBRARY_Y_SPACING + 18),
                        position: "absolute",
                        height: "200px",
                        width: "10px",
                    }}
                ></div>
                </div>
            </div>
            {/* Display boxes */}
            {boxes.flatMap((boxStack) => boxStack.boxes).map((box) => {
                if (box.type === BOX_TYPES.EMPTY_SUB_BLOCK || box.isOriginal) return null;
                return (renderBox(box));
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
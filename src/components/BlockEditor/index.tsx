"use client"

import { useState, useRef, useEffect } from "react"
import type { Box, BoxStack } from "./types"
import {
  BOX_HEIGHT,
  BOX_WIDTH,
  LIBRARY_Y_SPACING,
  BOX_RADIUS,
  SUB_BLOCK_HEIGHT,
  EMPTY_BLOCK_WIDTH,
  BOX_SHADOW,
  DRAGGING_SHADOW,
  BOX_TYPES,
} from "./constants"
import { COLORS, RETURN_TYPES } from "./../constants"
import { serialize } from "./utils/serialization"
import { createNewVariable, getOriginalBoxes } from "./utils/boxCreation"
import { deserialize } from "./utils/deserialization"
import { createMouseHandlers } from "./hooks/useMouseHandlers"
import { updateInputBox, value } from "./utils/boxOperations"
import "./styles/BlockEditor.css"

export default function BlockEditor() {
  const containerRef = useRef<HTMLDivElement>(null)
  const boxRefs = useRef<{ [key: number]: HTMLDivElement | HTMLInputElement | HTMLSelectElement | null }>({})
  const mouseMoveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null)
  const mouseUpHandlerRef = useRef<((e: MouseEvent) => void) | null>(null)
  const nextId = useRef(0)

  // Define the fixed width of the library panel for consistent positioning
  const LIBRARY_WIDTH = 400;

  const originalBoxes = getOriginalBoxes(nextId)

  const [boxes, setBoxes] = useState<BoxStack[]>(() => {
    return originalBoxes.concat(deserialize(nextId))
  })
  const [grabOffset, setGrabOffset] = useState({ x: 0, y: 0 })
  const [dropTargetBox, setDropTargetBox] = useState<Box | null>(null)
  const [draggingBox, setDraggingBox] = useState<Box | null>(null)
  const [newVariable, setNewVariable] = useState("")

  // New state for canvas panning
  const [canvasOffsetX, setCanvasOffsetX] = useState(0);
  const [canvasOffsetY, setCanvasOffsetY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPosition = useRef({ x: 0, y: 0 });


  const variableAdditionYOffset =
    LIBRARY_Y_SPACING * originalBoxes.length +
    (originalBoxes.map((boxStack) => boxStack.boxes.length - 1).reduce((acc, val) => (acc && val ? acc + val : acc)) ||
      0) *
      BOX_HEIGHT

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
    draggingBox,
    canvasOffsetX, // Pass canvas offsets to mouse handlers
    canvasOffsetY,
    LIBRARY_WIDTH, // Pass LIBRARY_WIDTH
  })

  // Event handlers for canvas panning
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Only start panning if no block is being dragged
    if (!draggingBox && e.button === 0) { // Only pan with left mouse button
      setIsPanning(true);
      lastPanPosition.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleCanvasMouseMove = (e: MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastPanPosition.current.x;
      const dy = e.clientY - lastPanPosition.current.y;
      setCanvasOffsetX((prev) => prev + dx);
      setCanvasOffsetY((prev) => prev + dy);
      lastPanPosition.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
  };


  useEffect(() => {
    // Listeners for block dragging (from useMouseHandlers)
    // These are global because block dragging might start anywhere and end anywhere.
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp]); // Dependencies only include the handler functions themselves

  useEffect(() => {
    // Listeners for canvas panning
    // These are global to allow continuous panning even if mouse leaves the canvas area briefly
    if (isPanning) {
      document.addEventListener("mousemove", handleCanvasMouseMove);
      document.addEventListener("mouseup", handleCanvasMouseUp);
    } else {
      document.removeEventListener("mousemove", handleCanvasMouseMove);
      document.removeEventListener("mouseup", handleCanvasMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleCanvasMouseMove);
      document.removeEventListener("mouseup", handleCanvasMouseUp);
    };
  }, [isPanning, handleCanvasMouseMove, handleCanvasMouseUp]); // Dependencies for panning listeners


  useEffect(() => {
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
        )
      } else {
        // For nested Box objects
        const isEmptySubBlock = content.type === BOX_TYPES.EMPTY_SUB_BLOCK
        if (
          content.type === BOX_TYPES.NUM_INPUT ||
          content.type === BOX_TYPES.TEXT_INPUT ||
          content.type === BOX_TYPES.COMMENT_INPUT
        ) {
          return (
            <input
              className="input-box"
              key={`box-${content.id}`}
              ref={(el) => {
                boxRefs.current[content.id] = el
                if (el) {
                  el.style.width = "40px"
                  el.style.width = `${Math.max(el.scrollWidth, 40)}px`
                }
              }}
              onChange={(e) => {
                if (!isOriginal) {
                  setBoxes((prev) => updateInputBox(prev, content.id, e.target.value))
                  const el = boxRefs.current[content.id]
                  if (el) {
                    el.style.width = "40px"
                    el.style.width = `${Math.max(el.scrollWidth, 40)}px`
                  }
                }
              }}
              type={content.type === BOX_TYPES.NUM_INPUT ? "number" : "text"}
              onMouseDown={(e) => {
                if (!isEmptySubBlock) {
                  e.stopPropagation()
                }
              }}
              value={value(content.id, boxes)}
              style={{
                color: "#1e293b", // slate-800
                borderRadius: BOX_RADIUS,
                height: SUB_BLOCK_HEIGHT,
                backgroundColor:
                  dropTargetBox && dropTargetBox.id === content.id && isEmptySubBlock
                    ? COLORS.DROP_TARGET
                    : isEmptySubBlock
                      ? COLORS.EMPTY
                      : content.color,
                boxShadow: isEmptySubBlock
                  ? "none"
                  : boxes.some((boxStack) => boxStack.isDragging && boxStack.boxes.some((b) => b.id === content.id))
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
                appearance: "textfield",
                MozAppearance: "textfield",
                WebkitAppearance: "none",
                outline: "none",
                border: "none",
              }}
            />
          )
        } else if (content.type === BOX_TYPES.BOOL_INPUT) {
          return (
            <select
              key={`box-${content.id}`}
              ref={(el) => {
                boxRefs.current[content.id] = el
              }}
              onChange={(e) =>
                !isOriginal ? setBoxes((prev) => updateInputBox(prev, content.id, e.target.value)) : null
              }
              onMouseDown={(e) => {
                if (!isEmptySubBlock) {
                  e.stopPropagation()
                }
              }}
              value={value(content.id, boxes)}
              style={{
                color: "#1e293b", // slate-800
                borderRadius: BOX_RADIUS,
                minWidth: isEmptySubBlock ? EMPTY_BLOCK_WIDTH : BOX_HEIGHT,
                height: content.type === BOX_TYPES.SUB_BLOCK || isEmptySubBlock ? SUB_BLOCK_HEIGHT : SUB_BLOCK_HEIGHT,
                backgroundColor:
                  dropTargetBox && dropTargetBox.id === content.id && isEmptySubBlock
                    ? COLORS.DROP_TARGET
                    : isEmptySubBlock
                      ? COLORS.EMPTY
                      : content.color,
                boxShadow: isEmptySubBlock
                  ? "none"
                  : boxes.some((boxStack) => boxStack.isDragging && boxStack.boxes.some((b) => b.id === content.id))
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
                outline: "none",
                border: "none",
              }}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          )
        } else {
          const acceptsNumbers = content.acceptedReturnTypes.includes(RETURN_TYPES.NUMBER)
          const acceptsBooleans = content.acceptedReturnTypes.includes(RETURN_TYPES.BOOLEAN)
          const acceptsStrings = content.acceptedReturnTypes.includes(RETURN_TYPES.STRING)

          let borderColors = [COLORS.DARK_BLUE, COLORS.DARK_BLUE, COLORS.DARK_BLUE, COLORS.DARK_BLUE]
          if (acceptsNumbers && acceptsBooleans && acceptsStrings) {
            borderColors = [COLORS.PURPLE, COLORS.ORANGE, COLORS.LIGHT_GREEN, COLORS.DARK_BLUE]
          } else if (acceptsNumbers && acceptsBooleans) {
            borderColors = [COLORS.DARK_BLUE, COLORS.ORANGE, COLORS.ORANGE, COLORS.DARK_BLUE]
          } else if (acceptsNumbers && acceptsStrings) {
            borderColors = [COLORS.LIGHT_GREEN, COLORS.DARK_BLUE, COLORS.DARK_BLUE, COLORS.LIGHT_GREEN]
          } else if (acceptsBooleans && acceptsStrings) {
            borderColors = [COLORS.ORANGE, COLORS.LIGHT_GREEN, COLORS.LIGHT_GREEN, COLORS.ORANGE]
          } else if (acceptsBooleans) {
            borderColors = [COLORS.ORANGE, COLORS.ORANGE, COLORS.ORANGE, COLORS.ORANGE]
          } else if (acceptsStrings) {
            borderColors = [COLORS.LIGHT_GREEN, COLORS.LIGHT_GREEN, COLORS.LIGHT_GREEN, COLORS.LIGHT_GREEN]
          } else if (!acceptsNumbers) {
            borderColors = [COLORS.PURPLE, COLORS.PURPLE, COLORS.PURPLE, COLORS.PURPLE]
          }
          return (
            <div
              key={`box-${content.id}`}
              ref={(el) => {
                boxRefs.current[content.id] = el
              }}
              onMouseDown={(e) => {
                if (!isEmptySubBlock) {
                  e.stopPropagation()
                  handleMouseDown(e, content.id)
                }
              }}
              style={{
                borderRadius: BOX_RADIUS,
                width: isEmptySubBlock ? EMPTY_BLOCK_WIDTH : "auto",
                minWidth: isEmptySubBlock ? EMPTY_BLOCK_WIDTH : BOX_HEIGHT,
                height: content.type === BOX_TYPES.SUB_BLOCK || isEmptySubBlock ? SUB_BLOCK_HEIGHT : SUB_BLOCK_HEIGHT,
                backgroundColor:
                  dropTargetBox && dropTargetBox.id === content.id && isEmptySubBlock
                    ? COLORS.DROP_TARGET
                    : isEmptySubBlock
                      ? COLORS.EMPTY
                      : content.color,
                boxShadow: isEmptySubBlock
                  ? "none"
                  : boxes.some((boxStack) => boxStack.isDragging && boxStack.boxes.some((b) => b.id === content.id))
                    ? DRAGGING_SHADOW
                    : BOX_SHADOW,
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 8px",
                margin: "0 4px",
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
              {isEmptySubBlock ? "" : renderContents(content, box.isOriginal)}
            </div>
          )
        }
      }
    })
  }

  const renderBox = (box: Box) => {
    const isDragging = boxes.some((boxStack2) => boxStack2.boxes.some((b) => b.id === box.id) && boxStack2.isDragging)
    const isSubBlock = box.type === BOX_TYPES.SUB_BLOCK

    // Calculate the base visual X and Y.
    // For original blocks, they are positioned within the library, no canvas offset.
    // For non-original blocks, they are positioned on the canvas, affected by canvas offset.
    let visualX = box.x + box.indentation * BOX_HEIGHT;
    let visualY = box.y + BOX_HEIGHT * box.verticalOffset;

    if (!box.isOriginal) {
      visualX += LIBRARY_WIDTH + canvasOffsetX;
      visualY += canvasOffsetY;
    }


    return (
      <div
        key={box.id}
        ref={(el) => {
          boxRefs.current[box.id] = el
        }}
        onMouseDown={(e) => {
          e.stopPropagation() // Prevent canvas panning when dragging a block
          handleMouseDown(e, box.id)
        }}
        style={{
          position: "absolute",
          left: visualX,
          top: visualY,
          height: isSubBlock ? SUB_BLOCK_HEIGHT : BOX_HEIGHT,
          minWidth: isSubBlock ? "auto" : BOX_WIDTH,
          backgroundColor: box.color,
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
          zIndex: box.indentation + 100 * boxes.findIndex((stack) => stack.boxes.some((b) => b.id === box.id)) + (isDragging ? 99999 : 0),
          borderRadius: isSubBlock
            ? `${BOX_RADIUS}px`
            : `${BOX_RADIUS / 2}px ${BOX_RADIUS}px ${BOX_RADIUS}px ${BOX_RADIUS / 2}px`,
          boxShadow: isDragging ? DRAGGING_SHADOW : BOX_SHADOW,
          transition: "box-shadow 0.2s",
          display: "flex",
          alignItems: "center",
          paddingLeft: isSubBlock ? 8 : 12,
          paddingRight: 12,
          fontWeight: isSubBlock ? 400 : 500,
          fontSize: isSubBlock ? "14px" : "15px",
          border: box.isOriginal ? `2px solid ${box.color === COLORS.EMPTY ? "#94a3b8" : box.color}` : "none", // slate-400
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
        overflow: "hidden", // Hide overflow as panning handles visibility
        backgroundColor: COLORS.BACKGROUND,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Modern Library Panel */}
      <div
        style={{
          position: "absolute",
          top: "0",
          bottom: "0",
          left: "0",
          width: `${LIBRARY_WIDTH}px`, // Use the constant here
          overflowY: "auto",
          overflowX: "hidden",
          padding: "0",
          backgroundColor: "#1e293b", // slate-800
          borderRight: "1px solid #334155", // slate-700
          direction: "rtl",
          zIndex: 10000,
        }}
      >
        {/* Library Header */}
        <div
          style={{
            direction: "ltr",
            padding: "16px 20px",
            borderBottom: "1px solid #334155", // slate-700
            backgroundColor: "#0f172a", // slate-900
            marginBottom: "10px", 
          }}
        >
          <h3
            style={{
              color: "white",
              fontSize: "16px",
              fontWeight: "600",
              margin: "0 0 4px 0",
            }}
          >
            Block Library
          </h3>
          <p
            style={{
              color: "#94a3b8", // slate-400
              fontSize: "12px",
              margin: "0",
            }}
          >
            Drag blocks to build your pseudocode
          </p>
        </div>

        <div
          style={{
            direction: "ltr",
            position: "relative",
            width: "100%",
            height: "calc(100% - 80px)",
            padding: "16px 12px",
          }}
        >
          {/* Render Library Boxes */}
          {boxes
            .flatMap((boxStack) => boxStack.boxes)
            .map((box) => {
              if (box.type === BOX_TYPES.EMPTY_SUB_BLOCK || !box.isOriginal) return null
              return renderBox(box)
            })}

          {/* Modern Variable Input Section */}
          <div
            style={{
              position: "absolute",
              top: variableAdditionYOffset + 16,
              left: 8,
              right: 8,
              padding: "16px",
              backgroundColor: "#334155", // slate-700
              borderRadius: "12px",
              border: "1px solid #475569", // slate-600
            }}
          >
            <h4
              style={{
                color: "white",
                fontSize: "14px",
                fontWeight: "600",
                margin: "0 0 12px 0",
              }}
            >
              Add Variable
            </h4>

            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <input
                type="text"
                value={newVariable}
                onChange={(e) => setNewVariable(e.target.value)}
                placeholder="Variable name..."
                style={{
                  flex: 1,
                  border: "1px solid #475569", // slate-600
                  borderRadius: "8px",
                  height: "36px",
                  padding: "0 12px",
                  fontSize: "14px",
                  backgroundColor: "#1e293b", // slate-800
                  color: "white",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#3b82f6")} // blue-500
                onBlur={(e) => (e.target.style.borderColor = "#475569")} // slate-600
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const newVar = createNewVariable(newVariable, boxes, nextId.current++)
                    if (newVar !== undefined) {
                      setNewVariable("")
                      setBoxes((previous) => [...previous, newVar])
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  const newVar = createNewVariable(newVariable, boxes, nextId.current++)
                  if (newVar !== undefined) {
                    setNewVariable("")
                    setBoxes((previous) => [...previous, newVar])
                  }
                }}
                style={{
                  border: "none",
                  borderRadius: "8px",
                  height: "36px",
                  padding: "0 16px",
                  fontSize: "14px",
                  cursor: "pointer",
                  backgroundColor: "#3b82f6", // blue-500
                  color: "white",
                  fontWeight: "500",
                  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2563eb")} // blue-600
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#3b82f6")} // blue-500
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                Add
              </button>
            </div>
          </div>

          {/* Spacer for scrolling */}
          <div
            style={{
              top:
                LIBRARY_Y_SPACING *
                  (boxes.filter((boxStack) => boxStack.boxes.some((box) => box.isOriginal)).length + 1) +
                (boxes
                  .map((boxStack) => {
                    if (boxStack.boxes.some((box) => box.isOriginal)) {
                      return boxStack.boxes.length - 1
                    }
                  })
                  .reduce((acc, val) => (acc && val ? acc + val : acc)) || 0) *
                  BOX_HEIGHT +
                (LIBRARY_Y_SPACING + 120),
              position: "absolute",
              height: "100px",
              width: "10px",
            }}
          ></div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        style={{
          position: "absolute",
          left: `${LIBRARY_WIDTH}px`, // Use the constant here
          top: "0",
          right: "0",
          bottom: "0",
          backgroundColor: "#0f172a", // slate-900
          backgroundImage: `
                    radial-gradient(circle at 1px 1px, #1e293b 1px, transparent 0)
                `,
          backgroundSize: "20px 20px",
          cursor: isPanning ? "grabbing" : "grab", // Change cursor during panning
        }}
        onMouseDown={handleCanvasMouseDown} // Add mouse down for panning
      >
        {/* Display boxes */}
        {boxes
          .flatMap((boxStack) => boxStack.boxes)
          .map((box) => {
            if (box.type === BOX_TYPES.EMPTY_SUB_BLOCK || box.isOriginal) return null
            return renderBox(box)
          })}

        {/* Canvas Helper Text */}
        {boxes.filter((boxStack) => !boxStack.boxes.some((box) => box.isOriginal)).length === 0 && (
          <div
            style={{
              position: "absolute",
              top: `calc(50% + ${canvasOffsetY}px)`, // Apply canvas offset to helper text
              left: `calc(50% + ${canvasOffsetX}px)`, // Apply canvas offset to helper text
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              color: "#64748b", // slate-500
              pointerEvents: "none", // Prevent helper text from interfering with panning
            }}
          >
            <div
              style={{
                fontSize: "48px",
                marginBottom: "16px",
                opacity: 0.5,
              }}
            >
              🧩
            </div>
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "600",
                margin: "0 0 8px 0",
              }}
            >
              Start Building
            </h3>
            <p
              style={{
                fontSize: "14px",
                margin: "0",
                opacity: 0.8,
              }}
            >
              Drag blocks from the library to create your pseudocode
            </p>
          </div>
        )}
      </div>

      {/* Drop target indicator */}
      {dropTargetBox && dropTargetBox.type !== BOX_TYPES.EMPTY_SUB_BLOCK && (
        <div
          style={{
            position: "absolute",
            // The left should align with where the *next* block will go.
            // This is the dropTargetBox's base X + its indentation (which is `dropTargetBox.indentation * BOX_HEIGHT`)
            // plus an additional BOX_HEIGHT if it's a WRAPPER or MID_WRAPPER.
            left:
              dropTargetBox.x + LIBRARY_WIDTH + 
              (dropTargetBox.indentation + (dropTargetBox.type === BOX_TYPES.WRAPPER || dropTargetBox.type === BOX_TYPES.MID_WRAPPER ? 1 : 0)) * BOX_HEIGHT +
              LIBRARY_WIDTH + canvasOffsetX, // Apply canvas offset
            top: dropTargetBox.y + BOX_HEIGHT + canvasOffsetY, // Apply canvas offset
            width: BOX_WIDTH,
            height: 3,
            backgroundColor: "#3b82f6", // blue-500
            pointerEvents: "none",
            zIndex:
              dropTargetBox.indentation +
              100 * boxes.findIndex((boxStack) => boxStack.boxes.some((b) => b.id === dropTargetBox.id)) +
              1,
            borderRadius: "2px",
            boxShadow: "0 0 8px rgba(59, 130, 246, 0.5)",
          }}
        ></div>
      )}
    </div>
  )
}
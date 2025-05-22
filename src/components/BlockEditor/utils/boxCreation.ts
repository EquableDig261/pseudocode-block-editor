
import { BOX_TYPES, BOX_HEIGHT, LIBRARY_X_SPACING, LIBRARY_Y_SPACING, LIBRARY_BOXES, SUB_BOX_TYPES } from "../constants";
import { RETURN_TYPES, COLORS } from "./../../constants";
import { Box, BoxStack } from "../types"
import { RefObject } from "react"

export const getEmptySubBlock = (id: number, acceptedTypes: string[]) : Box => {
    return {
        id: id, x: 0, y: 0, isOriginal: false, verticalOffset: 0, color: "#f0f0f0", indentation: 0, type: BOX_TYPES.EMPTY_SUB_BLOCK, contents: [], returnType: null, acceptedReturnTypes: acceptedTypes
    }
}

export const getEmptyInputBlock = (id: number, returnType : string) : Box => {
    const contents = (returnType === RETURN_TYPES.NUMBER || returnType === RETURN_TYPES.STRING) ? "" : "true";
    return getInputBlock(id, returnType, contents);
}

export const getInputBlock = (id: number, returnType : string, content : string) : Box => {
    const type =  (returnType === RETURN_TYPES.NUMBER) ? BOX_TYPES.NUM_INPUT : (returnType === RETURN_TYPES.STRING) ? BOX_TYPES.TEXT_INPUT : BOX_TYPES.BOOL_INPUT;
    return {
        id: id, x: 0, y: 0, isOriginal: false, verticalOffset: 0, color: "#f0f0f0", indentation: 0, type: type, contents: [content], returnType: null, acceptedReturnTypes: []
    }
}

export const getWholeInputSubBlock = (id: number, returnType : string, content: string, expected: string[],) : Box => {
    const color = (returnType === RETURN_TYPES.NUMBER) ? COLORS.DARK_BLUE : (returnType === RETURN_TYPES.STRING) ? COLORS.LIGHT_GREEN : (returnType === RETURN_TYPES.BOOLEAN) ? COLORS.ORANGE : COLORS.PURPLE;
    return {
        id: id, x: 0, y: 0, isOriginal: false, verticalOffset: 0, color: color, indentation: 0, type: BOX_TYPES.SUB_BLOCK, contents: [returnType === RETURN_TYPES.VARIABLE ? content : getInputBlock(id+1, returnType, content)], returnType: returnType, acceptedReturnTypes: expected
    }
}

export const createNewVariable = (variableName: string, boxes: BoxStack[], id: number) : (BoxStack | undefined) => {
    if (variableName !== "") {
        const numOriginalBoxes = boxes.filter((boxStack) => boxStack.boxes.some((box) => box.isOriginal)).length;
        const heightOffset = boxes.map((boxStack) => {
            if (boxStack.boxes.some(box => box.isOriginal)) {
                return boxStack.boxes.length - 1;
            }
        }).reduce((acc, val) => (acc && val) ? acc + val : acc) || 0;
        return  {boxes: [{
            id: id,
            x: LIBRARY_X_SPACING,
            y: LIBRARY_Y_SPACING * (numOriginalBoxes) + (heightOffset) * BOX_HEIGHT + (LIBRARY_Y_SPACING + 18),
            isOriginal: true,
            verticalOffset: 0,
            color: COLORS.PURPLE,
            indentation: 0,
            type: BOX_TYPES.SUB_BLOCK,
            contents: [variableName],
            returnType: RETURN_TYPES.VARIABLE,
            acceptedReturnTypes: [],
        }], isDragging: false}
    }
}

export const getOriginalBoxes = (id: RefObject<number>): BoxStack[] => {
    let heightOffset = 0;
    return LIBRARY_BOXES.map((stack, index) => {
        heightOffset += stack.boxes.length - 1;
        return {boxes: stack.boxes.map((b, i) => ({
            id: id.current++,
            x: LIBRARY_X_SPACING,
            y: LIBRARY_Y_SPACING * (index) + i * BOX_HEIGHT + (heightOffset - stack.boxes.length + 1) * BOX_HEIGHT,
            isOriginal: true,
            verticalOffset: 0,
            color: stack.color,
            indentation: 0,
            type: b.type,
            contents: b.contents.map(content => {
                if (typeof content === "string") return content;
                if (content.subBoxType === SUB_BOX_TYPES.INPUT) return getEmptyInputBlock(id.current++, content.returnTypes[0]);
                return getEmptySubBlock(id.current++, content.returnTypes);
            }),
            returnType: b.returnType,
            acceptedReturnTypes: [],
        })),
        isDragging: false,
        };
    });
}
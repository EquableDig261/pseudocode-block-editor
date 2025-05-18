
import { RETURN_TYPES, BOX_TYPES, COLORS } from "./../constants";
import { Box } from "./../types"

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
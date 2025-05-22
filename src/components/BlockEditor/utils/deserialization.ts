import { BoxStack, LinePattern, Box } from "./../types"
import { POSSIBLE_LINE_PATTERNS, BOX_HEIGHT, BOX_TYPES} from "./../constants";
import { COLORS, SPLITTING_PATTERN, RETURN_TYPES, EXTRUDE_CONDITIONS } from "./../../constants"
import { getEmptySubBlock, getWholeInputSubBlock } from "./boxCreation"
import { ExtrudeCondition, ExtrudeConditionType } from "@/components/types";

let boxExtrusionIndentation = 0;

export const deserialize = (nextId: React.RefObject<number>) : BoxStack[] => {
    let editorContent = localStorage.getItem("editorContent")
    if (!editorContent) editorContent = ""
    const values:string[] = editorContent.split("\n");
    boxExtrusionIndentation = 0;
    let index = 0
    const allBoxes = values.map((value) => {
            value = value.replace(/[\r\n\t]|^\s+/g, '');
            const linePattern = POSSIBLE_LINE_PATTERNS.find(linePattern => value.match(linePattern.pattern))
            if (linePattern) return matchLine(value, linePattern, index++, nextId);
            if (value === "") return null;
            return {id: nextId.current++, x: 450, y: index++ * BOX_HEIGHT + 50, isOriginal: false, verticalOffset: 0, color: COLORS.GREY, indentation: boxExtrusionIndentation, type: BOX_TYPES.BLOCK, contents: ["//", {id: nextId.current++, x: 0, y: 0, isOriginal: false, verticalOffset: 0, color: COLORS.EMPTY, indentation: 0, type: BOX_TYPES.COMMENT_INPUT, contents: [value.replace(/^\/\/\s*/g, '')], returnType: null, acceptedReturnTypes: []}], returnType: null, acceptedReturnTypes: []}
        })

    const emptyBoxStacks: BoxStack[] = [{boxes: [], isDragging: false}];
    return allBoxes.reduce((previous: BoxStack[], current, index, array) => {
        if (current === null) return previous;
        if (index === 0) {
            previous[previous.length - 1].boxes.push(current);
            return previous
        }
        current.x += 300 * (previous.length - 1);
        current.y = previous[previous.length - 1].boxes.length * BOX_HEIGHT + 50
        if (current.indentation === 0 && array[index - 1] === null && current.type !== BOX_TYPES.END_WRAPPER) {
            current.x += 300
            current.y = 50
            previous.push({boxes: [current], isDragging: false});
        }
        else {
            previous[previous.length - 1].boxes.push(current);
        }
        return previous;
    }, emptyBoxStacks)
};

const matchLine = (text: string, linePattern : LinePattern, index: number, nextId: React.RefObject<number>) : Box => {
    const inner = text.match(linePattern.pattern);
    let boxIndex = 1;
    const contents : (Box | string)[] = linePattern.order.map(s => {
        if (typeof s === "string") return s;
        if (!inner) return "";
        const group = inner[boxIndex++].match(SPLITTING_PATTERN);
        if (group) return getTree(group, s.acceptedReturnTypes, nextId)
        return getEmptySubBlock(nextId.current++, s.acceptedReturnTypes)
    })
    let indentation : number;
    switch (linePattern.boxType) {
        case BOX_TYPES.WRAPPER: 
            indentation = boxExtrusionIndentation++;
            break;
        case BOX_TYPES.MID_WRAPPER: 
            indentation = boxExtrusionIndentation - 1;
            break;
        case BOX_TYPES.END_WRAPPER: 
            indentation = --boxExtrusionIndentation;
            break;
        default: indentation = boxExtrusionIndentation;
    }
    return {id: nextId.current++, x: 450, y: index*BOX_HEIGHT + 50, isOriginal:false, verticalOffset:0, color: linePattern.color, indentation: indentation, type: linePattern.boxType, contents: contents, returnType: null, acceptedReturnTypes: []}
}


const getTree = (text : (Box | string)[], acceptedReturnTypes: string[], nextId: React.RefObject<number>) : Box => {
    while (text.includes("(")) {
        text = extrude(text, nextId)
    }
    return {...innerExtrude(text, nextId), acceptedReturnTypes: acceptedReturnTypes};
}

const extrude = (text : (Box | string)[], nextId: React.RefObject<number>) : (Box | string)[] => {
    let lastBrace = -1;
    text.forEach((t, index) => {
    if (t === "(") lastBrace = index;
    if (t === ")" && lastBrace >= 0) {
        const spliceWholeArray = (index - lastBrace + 1 === text.length);
        text.splice(lastBrace, index - lastBrace + 1,{id: nextId.current++, x: 0, y: 0, isOriginal:false, verticalOffset:0, color: COLORS.LIGHT_GREEN, indentation: 0, type: BOX_TYPES.SUB_BLOCK, contents: [innerExtrude(text.slice(lastBrace + 1, index), nextId)], returnType: null, acceptedReturnTypes: []});
    if (spliceWholeArray && typeof text[0] !== "string") text = text[0].contents
    }
    })
    return text;
}


const innerExtrude = (text : (Box | string)[], nextId: React.RefObject<number>) : Box => {
    EXTRUDE_CONDITIONS.forEach(condition => {
        while (text.includes(condition.text)) {
            const target = text.findIndex(str => str === condition.text);
            const extrudeVariant = getExtrudeVariant(condition, target, text)
            const leftString = (condition.l) ? getAdjacentString(text, target - 1, extrudeVariant.expectedL, nextId) : null;
            const rightString = (condition.r) ? getAdjacentString(text, target + 1, extrudeVariant.expectedR, nextId) : null;
            const centreText = (condition.l ? " " : "") + text[target] + (condition.r ? " " : "")
            const replacement = {id: nextId.current++, x: 0, y: 0, isOriginal:false, verticalOffset:0, color: extrudeVariant.color, indentation: 0, type: BOX_TYPES.SUB_BLOCK, contents: [leftString, centreText, rightString].filter(v => v !== null), returnType: null, acceptedReturnTypes: []}
            
            const left = (leftString && leftString.type !== BOX_TYPES.EMPTY_SUB_BLOCK ? 1 : 0)
            const right = (rightString && rightString.type !== BOX_TYPES.EMPTY_SUB_BLOCK ? 1 : 0)
            text.splice(target - left, 1 + left + right, replacement);
        }
    })
    if (typeof text[0]=== "string") {
        const s : string = text[0] as string
        const returnType = !isNaN(Number(s)) ? RETURN_TYPES.NUMBER : s === "true" || s === "false" ? RETURN_TYPES.BOOLEAN : s.includes('"') || s.includes("'") ? RETURN_TYPES.STRING : RETURN_TYPES.VARIABLE;
        return getWholeInputSubBlock((nextId.current+=2) - 2, returnType, s.replace(/"|'/g, ""), RETURN_TYPES.ANY)
    }
    return text[0]
}

const getAdjacentString = (text : (string | Box)[], expectedIndex : number, acceptedTypes : string[], nextId: React.RefObject<number>) => {
    if (expectedIndex < 0 || expectedIndex >= text.length || EXTRUDE_CONDITIONS.some(condition => condition.text === text[expectedIndex])) {
        return getEmptySubBlock(nextId.current++, acceptedTypes)
    } 
    const s = text[expectedIndex];
    if (typeof s === "string") {
        const returnType = !isNaN(Number(s)) ? RETURN_TYPES.NUMBER : s === "true" || s === "false" ? RETURN_TYPES.BOOLEAN : s.includes('"') || s.includes("'") ? RETURN_TYPES.STRING : RETURN_TYPES.VARIABLE;
        return getWholeInputSubBlock((nextId.current+=2) - 2, returnType, s.replace(/"|'/g, ""), acceptedTypes)
    }
    s.acceptedReturnTypes = acceptedTypes;
    return s;
}

const getExtrudeVariant = (condition: ExtrudeCondition, targetIndex: number, text: (string | Box)[]): ExtrudeConditionType => {
    const leftReturnType = getSideReturnType(text, targetIndex - 1)
    const rightReturnType = getSideReturnType(text, targetIndex + 1)
    return condition.variants.find(variant => (leftReturnType === null || variant.expectedL.includes(leftReturnType)) && (rightReturnType === null || variant.expectedR.includes(rightReturnType))) ?? condition.variants[0];
}

const getSideReturnType = (text: (Box | string)[], index: number) => {
    if (index  < 0 || index >= text.length) return null
    const target = text[index]
    console.log(target)
    if (typeof target !== "string" && target.returnType) {
            return target.returnType
        }
    else if (typeof target === "string") {
        if (target === "true" || target === "false") return RETURN_TYPES.BOOLEAN
        else if (!isNaN(Number(target))) return RETURN_TYPES.NUMBER
        else if (target.match(/^(".*")|('.*')$/)) return RETURN_TYPES.STRING
        else return null
    }
    return null
}
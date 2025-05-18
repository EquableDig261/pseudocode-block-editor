"use client";

import { useState, useRef, useEffect } from "react";
import './BlockEditor.css';

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
  returnType: string | null;
  acceptedReturnTypes: string[];
};

type BoxStack = {
  boxes: (Box)[];
  isDragging: boolean;
};

const getEmptySubBlock = (id: number, acceptedTypes: string[]) : Box => {
    return {
        id: id, x: 0, y: 0, isOriginal: false, verticalOffset: 0, color: "#f0f0f0", indentation: 0, type: BOX_TYPE.EMPTY_SUB_BLOCK, contents: [], returnType: null, acceptedReturnTypes: acceptedTypes
    }
}

const getEmptyInputBlock = (id: number, returnType : string) : Box => {
    const contents = (returnType === RETURN_TYPE.NUMBER || returnType === RETURN_TYPE.STRING) ? "" : "true";
    return getInputBlock(id, returnType, contents);
}

const getInputBlock = (id: number, returnType : string, content : string) : Box => {
    const type =  (returnType === RETURN_TYPE.NUMBER) ? BOX_TYPE.NUM_INPUT : (returnType === RETURN_TYPE.STRING) ? BOX_TYPE.TEXT_INPUT : BOX_TYPE.BOOL_INPUT;
    return {
        id: id, x: 0, y: 0, isOriginal: false, verticalOffset: 0, color: "#f0f0f0", indentation: 0, type: type, contents: [content], returnType: null, acceptedReturnTypes: []
    }
}

const getWholeInputSubBlock = (id: number, returnType : string, content: string, expected: string[],) : Box => {
    const color = (returnType === RETURN_TYPE.NUMBER) ? COLORS.DARK_BLUE : (returnType === RETURN_TYPE.STRING) ? COLORS.LIGHT_GREEN : (returnType === RETURN_TYPE.BOOLEAN) ? COLORS.ORANGE : COLORS.PURPLE;
    return {
        id: id, x: 0, y: 0, isOriginal: false, verticalOffset: 0, color: color, indentation: 0, type: BOX_TYPE.SUB_BLOCK, contents: [returnType === RETURN_TYPE.VARIABLE ? content : getInputBlock(id+1, returnType, content)], returnType: returnType, acceptedReturnTypes: expected
    }
}

// Constants for styling
const BOX_HEIGHT = 34;
const BOX_WIDTH = 160;
const LIBRARY_Y_SPACING = 60;
const LIBRARY_X_SPACING = 20;
const BOX_RADIUS = 12;
const SUB_BLOCK_HEIGHT = 28;
const EMPTY_BLOCK_WIDTH = 40;

// Box shadow for depth
const BOX_SHADOW = "0 2px 4px rgba(0,0,0,0.1)";
const DRAGGING_SHADOW = "0 4px 8px rgba(0,0,0,0.2)";

const RETURN_TYPE = {
    NUMBER: "NUMBER",
    STRING: "STRING",
    BOOLEAN: "BOOLEAN",
    VARIABLE: "VARIABLE",
    ANY: ["VARIABLE", "NUMBER", "STRING", "BOOLEAN"],
}

const BOX_TYPE = {
    BLOCK: "BLOCK",
    WRAPPER: "WRAPPER",
    MID_WRAPPER: "MID_WRAPPER",
    END_WRAPPER: "END_WRAPPER",
    EMPTY_SUB_BLOCK: "EMPTY_SUB_BLOCK",
    SUB_BLOCK: "SUB_BLOCK",
    TEXT_INPUT: "TEXT_INPUT",
    NUM_INPUT: "NUM_INPUT",
    BOOL_INPUT: "BOOL_INPUT",
}
// Colors with better contrast
const COLORS = {
    ORANGE: "#FA9C1B",
    YELLOW: "#ff922b",
    LIGHT_GREEN: "#51cf66",
    FOREST: "#37b24d",
    CYAN: "#30D5C8",
    SKYBLUE: "#4dabf7",
    DARK_BLUE: "#00008B",
    PURPLE: "#9775fa",

    EMPTY: "#e9ecef",
    DROP_TARGET: "#ced4da",
    BACKGROUND: "#1e1e1e",
}

type condition = {
  text : string,
  l : boolean,
  r : boolean,
  color : string,
  expectedL: string[],
  expectedR: string[],
}

const extrudeConditions : condition[] = [
  {text: "*", l: true, r: true, color: COLORS.DARK_BLUE, expectedL: [RETURN_TYPE.NUMBER], expectedR: [RETURN_TYPE.NUMBER]},
  {text: "/", l: true, r: true, color: COLORS.DARK_BLUE, expectedL: [RETURN_TYPE.NUMBER], expectedR: [RETURN_TYPE.NUMBER]},
  {text: "+", l: true, r: true, color: COLORS.DARK_BLUE, expectedL: [RETURN_TYPE.NUMBER], expectedR: [RETURN_TYPE.NUMBER]},
  {text: "-", l: true, r: true, color: COLORS.DARK_BLUE, expectedL: [RETURN_TYPE.NUMBER], expectedR: [RETURN_TYPE.NUMBER]},
  {text: "==", l: true, r: true, color: COLORS.ORANGE, expectedL: [RETURN_TYPE.NUMBER, RETURN_TYPE.STRING], expectedR: [RETURN_TYPE.NUMBER, RETURN_TYPE.STRING]},
  {text: "!=", l: true, r: true, color: COLORS.ORANGE, expectedL: [RETURN_TYPE.NUMBER, RETURN_TYPE.STRING], expectedR: [RETURN_TYPE.NUMBER, RETURN_TYPE.STRING]},
  {text: ">", l: true, r: true, color: COLORS.ORANGE, expectedL: [RETURN_TYPE.NUMBER], expectedR: [RETURN_TYPE.NUMBER]},
  {text: ">=", l: true, r: true, color: COLORS.ORANGE, expectedL: [RETURN_TYPE.NUMBER], expectedR: [RETURN_TYPE.NUMBER]},
  {text: "<", l: true, r: true, color: COLORS.ORANGE, expectedL: [RETURN_TYPE.NUMBER], expectedR: [RETURN_TYPE.NUMBER]},
  {text: "<=", l: true, r: true, color: COLORS.ORANGE, expectedL: [RETURN_TYPE.NUMBER], expectedR: [RETURN_TYPE.NUMBER]},
  {text: "NOT", l: false, r: true, color: COLORS.ORANGE, expectedL: [RETURN_TYPE.BOOLEAN], expectedR: [RETURN_TYPE.BOOLEAN]},
  {text: "AND", l: true, r: true, color: COLORS.ORANGE, expectedL: [RETURN_TYPE.BOOLEAN], expectedR: [RETURN_TYPE.BOOLEAN]},
  {text: "OR", l: true, r: true, color: COLORS.ORANGE, expectedL: [RETURN_TYPE.BOOLEAN], expectedR: [RETURN_TYPE.BOOLEAN]},
]

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

const extractPseudoCode = (boxes : BoxStack[]) => {
    boxes = boxes.filter((boxStack) => !boxStack.boxes.some(box => box.isOriginal));
    const code = (boxes.map((boxStack) => {
        return boxStack.boxes.map((box) => {
            return "\t".repeat(Math.max(0, box.indentation)) + getText(box).reduce((prev, cur) => prev + " " + cur)
        })
    }));
    return code.reduce((prev, curr) => prev + curr.join("\n"), "");
}

const getText = (box: Box) : string[]  => {
    return box.contents.flatMap((content) => {
        if (typeof content === "string") {
            return [content];
        }
        if (content.type === BOX_TYPE.TEXT_INPUT) {
            return [`"` + content.contents[0] + `"`];
        }
        return getText(content);
    })
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
    
    // Define the library box type to include returnType
    type LibraryBox = {
        type: string;
        contents: (string | Box)[];
        returnType: string | null;
    };

    // Box library definition with improved colors
    const boxLibrary: { boxes: LibraryBox[]; color: string; }[] = [        
        // Loops / Wrappers light yellow ig:
        {boxes: [{type: BOX_TYPE.WRAPPER, contents: ["BEGIN"], returnType: null}, {type: BOX_TYPE.END_WRAPPER, contents: ["END"], returnType: null}], color: COLORS.YELLOW},
        {boxes: [{type: BOX_TYPE.WRAPPER, contents: ["IF",  emptyLibSubBlock([RETURN_TYPE.BOOLEAN]), "THEN"], returnType: null}, {type: BOX_TYPE.END_WRAPPER, contents: ["ENDIF"], returnType: null},], color: COLORS.YELLOW},
        {boxes: [{type: BOX_TYPE.WRAPPER, contents: ["WHILE",  emptyLibSubBlock([RETURN_TYPE.BOOLEAN])], returnType: null}, {type: BOX_TYPE.END_WRAPPER, contents: ["ENDWHILE"], returnType: null}], color: COLORS.YELLOW},
        {boxes: [{type: BOX_TYPE.WRAPPER, contents: ["REPEAT"], returnType: null}, {type: BOX_TYPE.END_WRAPPER, contents: ["UNTIL", emptyLibSubBlock([RETURN_TYPE.BOOLEAN])], returnType: null}], color: COLORS.YELLOW},
        {boxes: [{type: BOX_TYPE.WRAPPER, contents: ["CASEWHERE",  emptyLibSubBlock([])], returnType: null}, {type: BOX_TYPE.END_WRAPPER, contents: ["ENDCASE"], returnType: null}], color: COLORS.YELLOW},
        {boxes: [{type: BOX_TYPE.WRAPPER, contents: ["FOR",  emptyLibSubBlock([]), "=", emptyLibSubBlock([RETURN_TYPE.NUMBER]), "to", emptyLibSubBlock([RETURN_TYPE.NUMBER]), "STEP", emptyLibSubBlock([RETURN_TYPE.NUMBER])], returnType: null}, {type: BOX_TYPE.END_WRAPPER, contents: ["NEXT"], returnType: null}], color: COLORS.YELLOW},
        
        // Funcs - cyan
        {boxes: [{type: BOX_TYPE.BLOCK, contents: ["Display", emptyLibSubBlock(RETURN_TYPE.ANY)], returnType: null}], color: COLORS.CYAN},
        {boxes: [{type: BOX_TYPE.BLOCK, contents: ["GET",  emptyLibSubBlock([])], returnType: null}], color: COLORS.CYAN},
        
        // updates - lBlue
        {boxes: [{type: BOX_TYPE.BLOCK, contents: [ emptyLibSubBlock([]), "=",  emptyLibSubBlock(RETURN_TYPE.ANY)], returnType: null}], color: COLORS.SKYBLUE},
        {boxes: [{type: BOX_TYPE.BLOCK, contents: [ emptyLibSubBlock([]), "+=",  emptyLibSubBlock([RETURN_TYPE.NUMBER])], returnType: null}], color: COLORS.SKYBLUE},
        {boxes: [{type: BOX_TYPE.BLOCK, contents: [ emptyLibSubBlock([]), "++"], returnType: null}], color: COLORS.SKYBLUE},
        
        // return Number - dblue
        {boxes: [{type: BOX_TYPE.SUB_BLOCK, contents: [ emptyLibSubBlock([RETURN_TYPE.NUMBER]), "+", emptyLibSubBlock([RETURN_TYPE.NUMBER])], returnType: RETURN_TYPE.NUMBER}], color: COLORS.DARK_BLUE},
        {boxes: [{type: BOX_TYPE.SUB_BLOCK, contents: [ emptyLibSubBlock([RETURN_TYPE.NUMBER]), "-", emptyLibSubBlock([RETURN_TYPE.NUMBER])], returnType: RETURN_TYPE.NUMBER}], color: COLORS.DARK_BLUE},
        {boxes: [{type: BOX_TYPE.SUB_BLOCK, contents: [ emptyLibSubBlock([RETURN_TYPE.NUMBER]), "*", emptyLibSubBlock([RETURN_TYPE.NUMBER])], returnType: RETURN_TYPE.NUMBER}], color: COLORS.DARK_BLUE},
        {boxes: [{type: BOX_TYPE.SUB_BLOCK, contents: [ emptyLibSubBlock([RETURN_TYPE.NUMBER]), "/", emptyLibSubBlock([RETURN_TYPE.NUMBER])], returnType: RETURN_TYPE.NUMBER}], color: COLORS.DARK_BLUE},
        {boxes: [{type: BOX_TYPE.SUB_BLOCK, contents: [ "length of", emptyLibSubBlock([RETURN_TYPE.STRING])], returnType: RETURN_TYPE.NUMBER}], color: COLORS.DARK_BLUE},
        {boxes: [{type: BOX_TYPE.SUB_BLOCK, contents: [inputLibSubBlock(RETURN_TYPE.NUMBER)], returnType: RETURN_TYPE.NUMBER}], color: COLORS.DARK_BLUE},
        
        // return string - lGreen
        {boxes: [{type: BOX_TYPE.SUB_BLOCK, contents: [ emptyLibSubBlock([RETURN_TYPE.STRING]), "+", emptyLibSubBlock([RETURN_TYPE.STRING])], returnType: RETURN_TYPE.STRING}], color: COLORS.LIGHT_GREEN},
        {boxes: [{type: BOX_TYPE.SUB_BLOCK, contents: [inputLibSubBlock(RETURN_TYPE.STRING)], returnType: RETURN_TYPE.STRING}], color: COLORS.LIGHT_GREEN},
        
        // return bool - orange oper
        {boxes: [{type: BOX_TYPE.SUB_BLOCK, contents: [ emptyLibSubBlock([RETURN_TYPE.BOOLEAN]), "AND", emptyLibSubBlock([RETURN_TYPE.BOOLEAN])], returnType: RETURN_TYPE.BOOLEAN}], color: COLORS.ORANGE},
        {boxes: [{type: BOX_TYPE.SUB_BLOCK, contents: [ emptyLibSubBlock([RETURN_TYPE.BOOLEAN]), "OR", emptyLibSubBlock([RETURN_TYPE.BOOLEAN])], returnType: RETURN_TYPE.BOOLEAN}], color: COLORS.ORANGE},
        {boxes: [{type: BOX_TYPE.SUB_BLOCK, contents: [ "NOT (", emptyLibSubBlock([RETURN_TYPE.BOOLEAN]), ")"], returnType: RETURN_TYPE.BOOLEAN}], color: COLORS.ORANGE},
        {boxes: [{type: BOX_TYPE.SUB_BLOCK, contents: [ emptyLibSubBlock([RETURN_TYPE.STRING, RETURN_TYPE.NUMBER]), "==", emptyLibSubBlock([RETURN_TYPE.STRING, RETURN_TYPE.NUMBER])], returnType: RETURN_TYPE.BOOLEAN}], color: COLORS.ORANGE},
        {boxes: [{type: BOX_TYPE.SUB_BLOCK, contents: [ emptyLibSubBlock([RETURN_TYPE.STRING, RETURN_TYPE.NUMBER]), "!=", emptyLibSubBlock([RETURN_TYPE.STRING, RETURN_TYPE.NUMBER])], returnType: RETURN_TYPE.BOOLEAN}], color: COLORS.ORANGE},
        {boxes: [{type: BOX_TYPE.SUB_BLOCK, contents: [ emptyLibSubBlock([RETURN_TYPE.NUMBER]), ">", emptyLibSubBlock([RETURN_TYPE.NUMBER])], returnType: RETURN_TYPE.BOOLEAN}], color: COLORS.ORANGE},
        {boxes: [{type: BOX_TYPE.SUB_BLOCK, contents: [ emptyLibSubBlock([RETURN_TYPE.NUMBER]), ">=", emptyLibSubBlock([RETURN_TYPE.NUMBER])], returnType: RETURN_TYPE.BOOLEAN}], color: COLORS.ORANGE},
        {boxes: [{type: BOX_TYPE.SUB_BLOCK, contents: [ emptyLibSubBlock([RETURN_TYPE.NUMBER]), "<", emptyLibSubBlock([RETURN_TYPE.NUMBER])], returnType: RETURN_TYPE.BOOLEAN}], color: COLORS.ORANGE},
        {boxes: [{type: BOX_TYPE.SUB_BLOCK, contents: [ emptyLibSubBlock([RETURN_TYPE.NUMBER]), "<=", emptyLibSubBlock([RETURN_TYPE.NUMBER])], returnType: RETURN_TYPE.BOOLEAN}], color: COLORS.ORANGE},
        {boxes: [{type: BOX_TYPE.SUB_BLOCK, contents: [inputLibSubBlock(RETURN_TYPE.BOOLEAN)], returnType: RETURN_TYPE.BOOLEAN}], color: COLORS.ORANGE},

        // var - purple
    ]

    // library of Boxes auto dynamically assigned to Stacks
    let heightOffset = 0;
    const originalBoxes: BoxStack[] = boxLibrary.map((stack, index) => {
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
            contents: b.contents,
            returnType: b.returnType,
            acceptedReturnTypes: [],
        })),
        isDragging: false,
        };
    });
    
    const nextId = useRef(libId);


    const getAdjacentString = (text : (string | Box)[], expectedIndex : number, acceptedTypes : string[]) => {
        if (expectedIndex < 0 || expectedIndex >= text.length || extrudeConditions.some(condition => condition.text === text[expectedIndex])) {
            return getEmptySubBlock(nextId.current++, acceptedTypes)
        } 
        const s = text[expectedIndex];
        if (typeof s === "string") {
            const returnType = !isNaN(Number()) ? RETURN_TYPE.NUMBER : s === "true" || s === "false" ? RETURN_TYPE.BOOLEAN : s.includes('"') || s.includes("'") ? RETURN_TYPE.STRING : RETURN_TYPE.VARIABLE;
            return  getWholeInputSubBlock((nextId.current+=2) - 2, returnType, s.replace(/"|'/g, ""), acceptedTypes)
        }
        s.acceptedReturnTypes = acceptedTypes;
        return s;

    }

    const innerExtrude = (text : (Box | string)[]) : Box => {
        extrudeConditions.forEach(condition => {
            while (text.includes(condition.text)) {
                const target = text.findIndex(str => str === condition.text);
                
                const leftString = (condition.l) ? getAdjacentString(text, target - 1, condition.expectedL) : null;
                const rightString = (condition.r) ? getAdjacentString(text, target + 1, condition.expectedR) : null;
                const replacement = {id: nextId.current++, x: 0, y: 0, isOriginal:false, verticalOffset:0, color: condition.color, indentation: 0, type: BOX_TYPE.SUB_BLOCK, contents: [leftString, text[target], rightString].filter(v => v !== null), returnType: null, acceptedReturnTypes: []}
                
                const left = (leftString && leftString.type !== BOX_TYPE.EMPTY_SUB_BLOCK ? 1 : 0)
                const right = (rightString && rightString.type !== BOX_TYPE.EMPTY_SUB_BLOCK ? 1 : 0)
                text.splice(target - left, 1 + left + right, replacement);
            }
        })
        if (typeof text[0]=== "string") {
            const s : string = text[0] as string
            const returnType = !isNaN(Number(s)) ? RETURN_TYPE.NUMBER : s === "true" || s === "false" ? RETURN_TYPE.BOOLEAN : s.includes('"') || s.includes("'") ? RETURN_TYPE.STRING : RETURN_TYPE.VARIABLE;
            return getWholeInputSubBlock((nextId.current+=2) - 2, returnType, s.replace(/"|'/g, ""), RETURN_TYPE.ANY)
        }
        return text[0]
    }

    const extrude = (text : (Box | string)[]) : (Box | string)[] => {
    // find the first ) and track the last ( then inner extrude what is between and return that in place of the brackets and what is between them
        let lastBrace = -1;
        text.forEach((t, index) => {
        if (t === "(") lastBrace = index;
        if (t === ")" && lastBrace >= 0) {
            const spliceWholeArray = (index - lastBrace + 1 === text.length);
            text.splice(lastBrace, index - lastBrace + 1,{id: nextId.current++, x: 0, y: 0, isOriginal:false, verticalOffset:0, color: COLORS.LIGHT_GREEN, indentation: 0, type: BOX_TYPE.SUB_BLOCK, contents: [innerExtrude(text.slice(lastBrace + 1, index))], returnType: null, acceptedReturnTypes: []});
        if (spliceWholeArray && typeof text[0] !== "string") text = text[0].contents
        }
        })
        return text;
    }

    const getTree = (text : (Box | string)[], acceptedReturnTypes: string[]) : Box => {
        while (text.includes("(")) {
        text = extrude(text)
        }
        return {...innerExtrude(text), acceptedReturnTypes: acceptedReturnTypes};
    }

    const getBoxesFromStorage = () : BoxStack => {
        let editorContent = localStorage.getItem("editorContent")
        if (!editorContent) editorContent = ""
        const values:string[] = editorContent.split("\n");
        const regex = /"[^"]*"|'[^']*'|\d+(?:\.\d+)?|==|!=|<=|>=|<|>|\+|-|\*|\/|[a-zA-Z_]\w*|\S/g
        let indentation = 0;
        return {boxes: values.map((value, index) => {
            value = value.replace(/[\r\n\t]|^\s+/g, '');
            if (value.match(/^IF (.*) THEN/)) {
                const match = value.match(/^IF (.*) THEN/)
                if (!match) return null;
                const group: string[] = match[1].match(regex) ?? [];
                return {id: nextId.current++, x: 450, y: index*BOX_HEIGHT + 50, isOriginal:false, verticalOffset:0, color: COLORS.YELLOW, indentation: indentation++, type: BOX_TYPE.WRAPPER, contents: ["IF", getTree(group, [RETURN_TYPE.BOOLEAN]), "THEN"], returnType: null, acceptedReturnTypes: []}
            } else if (value.match(/^ELSE IF (.*) THEN/)) {
                const match = value.match(/^ELSE IF (.*) THEN/)
                if (!match) return null;
                const group: string[] = match[1].match(regex) ?? [];
                return {id: nextId.current++, x: 450, y: index*BOX_HEIGHT + 50, isOriginal:false, verticalOffset:0, color: COLORS.YELLOW, indentation: indentation - 1, type: BOX_TYPE.MID_WRAPPER, contents: ["ELSE IF", getTree(group, [RETURN_TYPE.BOOLEAN]), "THEN"], returnType: null, acceptedReturnTypes: []}
            } else if (value.match(/^WHILE (.*)/)) {
                const match = value.match(/^WHILE (.*)/)
                if (!match) return null;
                const group: string[] = match[1].match(regex) ?? [];
                return {id: nextId.current++, x: 450, y: index*BOX_HEIGHT + 50, isOriginal:false, verticalOffset:0, color: COLORS.YELLOW, indentation: indentation++, type: BOX_TYPE.WRAPPER, contents: ["WHILE", getTree(group, [RETURN_TYPE.BOOLEAN])], returnType: null, acceptedReturnTypes: []}
            } else if (value.match(/^UNTIL (.*)/)) {
                const match = value.match(/^UNTIL (.*)/)
                if (!match) return null;
                const group: string[] = match[1].match(regex) ?? [];
                return {id: nextId.current++, x: 450, y: index*BOX_HEIGHT + 50, isOriginal:false, verticalOffset:0, color: COLORS.YELLOW, indentation: indentation-- - 1, type: BOX_TYPE.END_WRAPPER, contents: ["UNTIL", getTree(group, [RETURN_TYPE.BOOLEAN])], returnType: null, acceptedReturnTypes: []}
            } else if (value.match(/^CASEWHERE (.*)/)) {
                const match = value.match(/^CASEWHERE (.*)/)
                if (!match) return null;
                const group: string[] = match[1].match(regex) ?? [];
                return {id: nextId.current++, x: 450, y: index*BOX_HEIGHT + 50, isOriginal:false, verticalOffset:0, color: COLORS.YELLOW, indentation: indentation++, type: BOX_TYPE.WRAPPER, contents: ["CASEWHERE", getTree(group, [RETURN_TYPE.VARIABLE])], returnType: null, acceptedReturnTypes: []}
            } else if (value.match(/^display (.*)/)) {
                const match = value.match(/^display (.*)/)
                if (!match) return null;
                const group: string[] = match[1].match(regex) ?? [];
                return {id: nextId.current++, x: 450, y: index*BOX_HEIGHT + 50, isOriginal:false, verticalOffset:0, color: COLORS.CYAN, indentation: indentation, type: BOX_TYPE.BLOCK, contents: ["display", getTree(group, RETURN_TYPE.ANY)], returnType: null, acceptedReturnTypes: []}
            } else if (value.match(/^FOR (.*)=(.*) to (.*) STEP (.*)/)) {
                const match = value.match(/^FOR (.*)=(.*) to (.*) STEP (.*)/)
                if (!match) return null;
                const group1: string[] = match[1].match(regex) ?? [];
                const group2: string[] = match[2].match(regex) ?? [];
                const group3: string[] = match[3].match(regex) ?? [];
                const group4: string[] = match[4].match(regex) ?? [];
                return {id: nextId.current++, x: 450, y: index*BOX_HEIGHT + 50, isOriginal:false, verticalOffset:0, color: COLORS.YELLOW,indentation: indentation++, type: BOX_TYPE.WRAPPER, contents: ["FOR", getTree(group1, [RETURN_TYPE.VARIABLE]), "=", getTree(group2, [RETURN_TYPE.NUMBER]), "to", getTree(group3, [RETURN_TYPE.NUMBER]), "STEP", getTree(group4, [RETURN_TYPE.NUMBER])], returnType: null, acceptedReturnTypes: []}
            } else if (value.match(/^([a-zA-Z_]\w*) = (.*)/)) {
                const match = value.match(/^\s*([a-zA-Z_]\w*) = (.*)/)
                if (!match) return null;
                const group1: string = match[1];
                const group2: string[] = match[2].match(regex) ?? [];
                return {id: nextId.current++, x: 450, y: index*BOX_HEIGHT + 50, isOriginal:false, verticalOffset:0, color: COLORS.CYAN,indentation: indentation, type: BOX_TYPE.BLOCK, contents: [{id: nextId.current++, x: 0, y: 0, isOriginal:false, verticalOffset:0, color: COLORS.PURPLE, indentation: 0, type: BOX_TYPE.SUB_BLOCK, contents: [group1], returnType: RETURN_TYPE.VARIABLE, acceptedReturnTypes: []}, "=", getTree(group2, RETURN_TYPE.ANY)], returnType: null, acceptedReturnTypes: []}
            } else if (value.match(/^BEGIN/)) {
                return {id: nextId.current++, x: 450, y: index*BOX_HEIGHT + 50, isOriginal:false, verticalOffset:0, color: COLORS.YELLOW, indentation: indentation++, type: BOX_TYPE.WRAPPER, contents: ["BEGIN"], returnType: null, acceptedReturnTypes: []}
            } else if (value.match(/^ENDIF/)) {
                return {id: nextId.current++, x: 450, y: index*BOX_HEIGHT + 50, isOriginal:false, verticalOffset:0, color: COLORS.YELLOW, indentation: indentation-- -1, type: BOX_TYPE.END_WRAPPER, contents: ["ENDIF"], returnType: null, acceptedReturnTypes: []}
            } else if (value.match(/^END/)) {
                return {id: nextId.current++, x: 450, y: index*BOX_HEIGHT + 50, isOriginal:false, verticalOffset:0, color: COLORS.YELLOW, indentation: indentation-- - 1, type: BOX_TYPE.END_WRAPPER, contents: ["END"], returnType: null, acceptedReturnTypes: []}
            }
            return null;
        }).filter(x => x !== null), isDragging: false}
    };

    const [boxes, setBoxes] = useState<BoxStack[]>(() => {
        const b = getBoxesFromStorage();
        console.log(b)
        return originalBoxes.concat(b);
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
            if (draggingBox.type !== BOX_TYPE.SUB_BLOCK) {
                boxes.forEach((boxStack) => {
                    boxStack.boxes.forEach((box) => {
                        const beingDragged = draggingBoxStack.boxes.some(
                            (draggedBox) => draggedBox.id === box.id
                        );
                        if (beingDragged || box.isOriginal) return;
                        if (box.type === BOX_TYPE.SUB_BLOCK) return;

                        const mouseWithinTarget = Math.abs(box.x + BOX_WIDTH/2 + box.indentation * BOX_HEIGHT + (box.type === BOX_TYPE.WRAPPER || box.type === BOX_TYPE.MID_WRAPPER ? BOX_HEIGHT : 0) - mouseX) < BOX_WIDTH/2 &&
                                                Math.abs(box.y + (BOX_HEIGHT * 1.5) - mouseY) < BOX_HEIGHT / 2
                        const distanceToCentreOfTarget = Math.hypot(box.x + BOX_WIDTH/2 + (box.indentation) * BOX_HEIGHT + (box.type === BOX_TYPE.WRAPPER  || box.type === BOX_TYPE.MID_WRAPPER ? BOX_HEIGHT :0) - mouseX, box.y + (BOX_HEIGHT * 1.5) - mouseY)
                        const closestDistanceToCentre = closestTarget ? Math.hypot(closestTarget.x +  BOX_WIDTH/2 + (box.indentation) * BOX_HEIGHT + (box.type === BOX_TYPE.WRAPPER || box.type === BOX_TYPE.MID_WRAPPER ? BOX_HEIGHT :0) - mouseX, closestTarget.y + (BOX_HEIGHT * 1.5) - mouseY) : Infinity;

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
                                content.type === BOX_TYPE.EMPTY_SUB_BLOCK &&
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
                                    if(draggingBox.returnType && !content.acceptedReturnTypes.includes(draggingBox.returnType) && draggingBox.returnType !== RETURN_TYPE.VARIABLE) return;
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
                    if (dropTargetBox.type === BOX_TYPE.EMPTY_SUB_BLOCK) {
                        // Only allow dropping subBlocks into emptySubBlocks
                        if (draggingBox.type !== BOX_TYPE.SUB_BLOCK) {
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
                        if (draggingBox.type === BOX_TYPE.SUB_BLOCK) {
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
                                indentation: box.indentation + dropTargetBox.indentation + ((dropTargetBox.type === BOX_TYPE.WRAPPER || dropTargetBox.type === BOX_TYPE.MID_WRAPPER) ? 1 : 0),
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
        console.log("CHANGED!!!")
        localStorage.setItem("editorContent", extractPseudoCode(boxes))
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
                                typeof content !== "string" && content.type === BOX_TYPE.EMPTY_SUB_BLOCK 
                                    ? getEmptySubBlock(nextId.current++, content.acceptedReturnTypes) :
                                typeof content !== "string" && box2.returnType && (content.type === BOX_TYPE.NUM_INPUT || content.type === BOX_TYPE.TEXT_INPUT || content.type === BOX_TYPE.BOOL_INPUT)
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
                    const dragIndentation = draggingBox.indentation + (draggingBox.type === BOX_TYPE.MID_WRAPPER ? 1 : 0)

                    let endIndex = originalBoxStack.boxes.findIndex((box, index) => draggingBox && box.indentation < dragIndentation && index > boxIndex) - 1;
                    let startIndex = boxIndex;
                    
                    if (draggingBox.type === BOX_TYPE.WRAPPER) {
                        endIndex = originalBoxStack.boxes.findIndex((box, index) => draggingBox && box.indentation < dragIndentation && index > boxIndex) - 1;
                    }
                    else if (draggingBox.type === BOX_TYPE.END_WRAPPER) {
                        startIndex = originalBoxStack.boxes.length - 1 - originalBoxStack.boxes.toReversed().findIndex((box, index) => draggingBox && box.indentation === dragIndentation && box.type === BOX_TYPE.WRAPPER && boxIndex > originalBoxStack.boxes.length - index - 1);
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
                            if (box.type === BOX_TYPE.WRAPPER) {
                                currentIndentation += 1;
                            } else if (box.type === BOX_TYPE.END_WRAPPER) {
                                currentIndentation -= 1;
                                previousIndentation -= 1;
                            } else if (box.type === BOX_TYPE.MID_WRAPPER) {
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
                type: BOX_TYPE.SUB_BLOCK,
                contents: [newVar],
                returnType: RETURN_TYPE.VARIABLE,
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
                            fontWeight: box.type === BOX_TYPE.SUB_BLOCK || box.type === BOX_TYPE.EMPTY_SUB_BLOCK ? 400 : 500,
                            userSelect: "none",
                            fontSize: box.type === BOX_TYPE.SUB_BLOCK ? "14px" : "15px",
                            padding: "0 4px",
                        }}
                        draggable={false}
                    >
                        {content}
                    </span>
                );
            } else {
                // For nested Box objects
                const isEmptySubBlock = content.type === BOX_TYPE.EMPTY_SUB_BLOCK;
                if (content.type === BOX_TYPE.NUM_INPUT || content.type === BOX_TYPE.TEXT_INPUT) {
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
                        type={content.type === BOX_TYPE.NUM_INPUT ? "number" : "text"}
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
                            fontWeight: content.type === BOX_TYPE.SUB_BLOCK ? 400 : 500,
                            appearance: "textfield", // Changed from "none" to "textfield" for better number input support
                            MozAppearance: "textfield", // Firefox
                            WebkitAppearance: "none", // WebKit browsers
                            outline: "none",
                            border: "none",
                        }}
                        />
                    );
                } else if (content.type === BOX_TYPE.BOOL_INPUT) {
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
                            height: content.type === BOX_TYPE.SUB_BLOCK || isEmptySubBlock ? SUB_BLOCK_HEIGHT : SUB_BLOCK_HEIGHT,
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
                            fontWeight: content.type === BOX_TYPE.SUB_BLOCK ? 400 : 500,
                        }}
                    ><option value="true">true</option>
                    <option value="false">false</option>
                    </select>)
                }else {
                    let leftColor = COLORS.DARK_BLUE;
                    let rightColor = COLORS.DARK_BLUE;
                    let topColor = COLORS.DARK_BLUE;
                    let bottomColor = COLORS.DARK_BLUE;
                    const accNum = content.acceptedReturnTypes.includes(RETURN_TYPE.NUMBER);
                    const accBool = content.acceptedReturnTypes.includes(RETURN_TYPE.BOOLEAN);
                    const accStr = content.acceptedReturnTypes.includes(RETURN_TYPE.STRING);
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
                                height: content.type === BOX_TYPE.SUB_BLOCK || isEmptySubBlock ? SUB_BLOCK_HEIGHT : SUB_BLOCK_HEIGHT,
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
                                fontWeight: content.type === BOX_TYPE.SUB_BLOCK ? 400 : 500,
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
                    backgroundColor: `rgb(161, 161, 161)`,
                    border: `4px solid rgb(0, 0, 0)`,
                    borderTopRightRadius: "20px",
                    borderBottomRightRadius: "20px",
                    direction: "rtl",
                }}>
                <div style= {{direction: "ltr"}}>
                {/* Title area */}
                <div style={{ position: "relative", width: "100%", height: "100%" }} >
                {/* Render Library Boxes */}
                {boxes
                    .flatMap((boxStack) => boxStack.boxes)
                    .map((box) => {
                    if (box.type === BOX_TYPE.EMPTY_SUB_BLOCK || !box.isOriginal) return null;

                    const isDragging = boxes.some(
                        (boxStack2) =>
                        boxStack2.boxes.some((b) => b.id === box.id) && boxStack2.isDragging
                    );
                    const isSubBlock = box.type === BOX_TYPE.SUB_BLOCK;

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
                if (box.type === BOX_TYPE.EMPTY_SUB_BLOCK) return null;
                if (box.isOriginal) return null;

                const isDragging = boxes.some(boxStack2 => 
                    boxStack2.boxes.some(b => b.id === box.id) && boxStack2.isDragging);
                const isSubBlock = box.type === BOX_TYPE.SUB_BLOCK;
                
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
            {dropTargetBox && dropTargetBox.type !== BOX_TYPE.EMPTY_SUB_BLOCK && (
                <div
                    style={{
                        position: "absolute",
                        left: dropTargetBox.x + dropTargetBox.indentation * BOX_HEIGHT + (dropTargetBox.type === BOX_TYPE.WRAPPER || dropTargetBox.type === BOX_TYPE.MID_WRAPPER ? BOX_HEIGHT : 0),
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
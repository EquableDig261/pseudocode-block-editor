import { LinePattern, LibraryBox} from "./types"
import { RETURN_TYPES, COLORS } from "./../constants";

// Constants for styling
export const BOX_HEIGHT = 34;
export const BOX_WIDTH = 160;
export const LIBRARY_Y_SPACING = 60;
export const LIBRARY_X_SPACING = 20;
export const BOX_RADIUS = 12;
export const SUB_BLOCK_HEIGHT = 28;
export const EMPTY_BLOCK_WIDTH = 40;

// Box shadow for depth
export const BOX_SHADOW = "0 2px 4px rgba(0,0,0,0.1)";
export const DRAGGING_SHADOW = "0 4px 8px rgba(0,0,0,0.2)";

export const BOX_TYPES = {
    BLOCK: "BLOCK",
    WRAPPER: "WRAPPER",
    MID_WRAPPER: "MID_WRAPPER",
    END_WRAPPER: "END_WRAPPER",
    EMPTY_SUB_BLOCK: "EMPTY_SUB_BLOCK",
    SUB_BLOCK: "SUB_BLOCK",
    TEXT_INPUT: "TEXT_INPUT",
    NUM_INPUT: "NUM_INPUT",
    BOOL_INPUT: "BOOL_INPUT",
    COMMENT_INPUT: "COMMENT_INPUT",
}

export const SUB_BOX_TYPES = {
    EMPTY: "EMPTY",
    INPUT:"INPUT",
}

export const POSSIBLE_LINE_PATTERNS : LinePattern[] = [
    {pattern: /^IF(.*)THEN/, order: ["IF", {acceptedReturnTypes: [RETURN_TYPES.BOOLEAN]}, "THEN"], color: COLORS.YELLOW, boxType: BOX_TYPES.WRAPPER},
    {pattern: /^ELSE IF(.*)THEN/, order: ["ELSE IF", {acceptedReturnTypes: [RETURN_TYPES.BOOLEAN]}, "THEN"], color: COLORS.YELLOW, boxType: BOX_TYPES.MID_WRAPPER},
    {pattern: /^ELSE/, order: ["ELSE"], color: COLORS.YELLOW, boxType: BOX_TYPES.MID_WRAPPER},
    {pattern: /^ENDIF/, order: ["ENDIF"], color: COLORS.YELLOW, boxType: BOX_TYPES.END_WRAPPER},
    
    {pattern: /^WHILE(.*)/, order: ["WHILE", {acceptedReturnTypes: [RETURN_TYPES.BOOLEAN]}], color: COLORS.YELLOW, boxType: BOX_TYPES.WRAPPER},
    {pattern: /^ENDWHILE/, order: ["ENDWHILE"], color: COLORS.YELLOW, boxType: BOX_TYPES.END_WRAPPER},

    {pattern: /^FOR(.*)=(.*)to(.*)STEP(.*)/, order: ["FOR", {acceptedReturnTypes: [RETURN_TYPES.VARIABLE]}, "=", {acceptedReturnTypes: [RETURN_TYPES.NUMBER]}, "to", {acceptedReturnTypes: [RETURN_TYPES.NUMBER]}, "STEP", {acceptedReturnTypes: [RETURN_TYPES.NUMBER]}], color: COLORS.YELLOW, boxType: BOX_TYPES.WRAPPER},
    {pattern: /^ENDFOR/, order: ["ENDFOR"], color: COLORS.YELLOW, boxType: BOX_TYPES.END_WRAPPER},
    
    {pattern: /^REPEAT/, order: ["REPEAT"], color: COLORS.YELLOW, boxType: BOX_TYPES.WRAPPER},
    {pattern: /^UNTIL(.*)/, order: ["UNTIL", {acceptedReturnTypes: [RETURN_TYPES.BOOLEAN]}], color: COLORS.YELLOW, boxType: BOX_TYPES.END_WRAPPER},

    {pattern: /^CASEWHERE(.*)/, order: ["CASEWHERE", {acceptedReturnTypes: [RETURN_TYPES.BOOLEAN]}], color: COLORS.YELLOW, boxType: BOX_TYPES.WRAPPER},
    {pattern: /^ENDCASE/, order: ["ENDCASE"], color: COLORS.YELLOW, boxType: BOX_TYPES.END_WRAPPER},
    
    {pattern: /^BEGIN/, order: ["BEGIN"], color: COLORS.YELLOW, boxType: BOX_TYPES.WRAPPER},
    {pattern: /^END/, order: ["END"], color: COLORS.YELLOW, boxType: BOX_TYPES.END_WRAPPER},

    {pattern: /^display(.*)/, order: ["display", {acceptedReturnTypes: RETURN_TYPES.ANY}], color: COLORS.CYAN, boxType: BOX_TYPES.BLOCK},
    {pattern: /^get(.*)/, order: ["get", {acceptedReturnTypes: [RETURN_TYPES.VARIABLE]}], color: COLORS.CYAN, boxType: BOX_TYPES.BLOCK},

    {pattern: /^([^\s]*)\s*=(.*)/, order: [{acceptedReturnTypes: [RETURN_TYPES.VARIABLE]}, "=", {acceptedReturnTypes: RETURN_TYPES.ANY}], color: COLORS.SKYBLUE, boxType: BOX_TYPES.BLOCK},
];


// Box library definition with improved colors
export const LIBRARY_BOXES: { boxes: LibraryBox[]; color: string; }[] = [        
    // Loops / Wrappers light yellow ig:
    {boxes: [{type: BOX_TYPES.WRAPPER, contents: ["BEGIN"], returnType: null}, {type: BOX_TYPES.END_WRAPPER, contents: ["END"], returnType: null}], color: COLORS.YELLOW},
    {boxes: [{type: BOX_TYPES.WRAPPER, contents: ["IF",  {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.BOOLEAN]}, "THEN"], returnType: null}, {type: BOX_TYPES.END_WRAPPER, contents: ["ENDIF"], returnType: null},], color: COLORS.YELLOW},
    {boxes: [{type: BOX_TYPES.MID_WRAPPER, contents: ["ELSE IF",  {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.BOOLEAN]}, "THEN"], returnType: null}], color: COLORS.YELLOW},
    {boxes: [{type: BOX_TYPES.MID_WRAPPER, contents: ["ELSE"], returnType: null}], color: COLORS.YELLOW},
    {boxes: [{type: BOX_TYPES.WRAPPER, contents: ["WHILE",  {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.BOOLEAN]}], returnType: null}, {type: BOX_TYPES.END_WRAPPER, contents: ["ENDWHILE"], returnType: null}], color: COLORS.YELLOW},
    {boxes: [{type: BOX_TYPES.WRAPPER, contents: ["REPEAT"], returnType: null}, {type: BOX_TYPES.END_WRAPPER, contents: ["UNTIL", {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.BOOLEAN]}], returnType: null}], color: COLORS.YELLOW},
    {boxes: [{type: BOX_TYPES.WRAPPER, contents: ["CASEWHERE",  {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.VARIABLE]}], returnType: null}, {type: BOX_TYPES.END_WRAPPER, contents: ["ENDCASE"], returnType: null}], color: COLORS.YELLOW},
    {boxes: [{type: BOX_TYPES.WRAPPER, contents: ["FOR",  {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.VARIABLE]}, "=", {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.NUMBER]}, "to", {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.NUMBER]}, "STEP", {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.NUMBER]}], returnType: null}, {type: BOX_TYPES.END_WRAPPER, contents: ["NEXT"], returnType: null}], color: COLORS.YELLOW},
    
    // Funcs - cyan
    {boxes: [{type: BOX_TYPES.BLOCK, contents: ["display", {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: RETURN_TYPES.ANY}], returnType: null}], color: COLORS.CYAN},
    {boxes: [{type: BOX_TYPES.BLOCK, contents: ["get",  {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.VARIABLE]}], returnType: null}], color: COLORS.CYAN},
    
    // updates - lBlue
    {boxes: [{type: BOX_TYPES.BLOCK, contents: [ {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.VARIABLE]}, "=",  {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: RETURN_TYPES.ANY}], returnType: null}], color: COLORS.SKYBLUE},
    {boxes: [{type: BOX_TYPES.BLOCK, contents: [ {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.VARIABLE]}, "+=",  {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.NUMBER]}], returnType: null}], color: COLORS.SKYBLUE},
    {boxes: [{type: BOX_TYPES.BLOCK, contents: [ {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.VARIABLE]}, "++"], returnType: null}], color: COLORS.SKYBLUE},
    
    // return Number - dblue
    {boxes: [{type: BOX_TYPES.SUB_BLOCK, contents: [ {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.NUMBER]}, "+", {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.NUMBER]}], returnType: RETURN_TYPES.NUMBER}], color: COLORS.DARK_BLUE},
    {boxes: [{type: BOX_TYPES.SUB_BLOCK, contents: [ {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.NUMBER]}, "-", {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.NUMBER]}], returnType: RETURN_TYPES.NUMBER}], color: COLORS.DARK_BLUE},
    {boxes: [{type: BOX_TYPES.SUB_BLOCK, contents: [ {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.NUMBER]}, "*", {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.NUMBER]}], returnType: RETURN_TYPES.NUMBER}], color: COLORS.DARK_BLUE},
    {boxes: [{type: BOX_TYPES.SUB_BLOCK, contents: [ {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.NUMBER]}, "/", {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.NUMBER]}], returnType: RETURN_TYPES.NUMBER}], color: COLORS.DARK_BLUE},
    {boxes: [{type: BOX_TYPES.SUB_BLOCK, contents: [ "length of", {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.STRING]}], returnType: RETURN_TYPES.NUMBER}], color: COLORS.DARK_BLUE},
    {boxes: [{type: BOX_TYPES.SUB_BLOCK, contents: [{subBoxType: SUB_BOX_TYPES.INPUT, returnTypes: [RETURN_TYPES.NUMBER]}], returnType: RETURN_TYPES.NUMBER}], color: COLORS.DARK_BLUE},
    
    // return string - lGreen
    {boxes: [{type: BOX_TYPES.SUB_BLOCK, contents: [ {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.STRING, RETURN_TYPES.NUMBER]}, "+", {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.STRING, RETURN_TYPES.NUMBER]}], returnType: RETURN_TYPES.STRING}], color: COLORS.LIGHT_GREEN},
    {boxes: [{type: BOX_TYPES.SUB_BLOCK, contents: [{subBoxType: SUB_BOX_TYPES.INPUT, returnTypes: [RETURN_TYPES.STRING]}], returnType: RETURN_TYPES.STRING}], color: COLORS.LIGHT_GREEN},
    
    // return bool - orange oper
    {boxes: [{type: BOX_TYPES.SUB_BLOCK, contents: [ {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.BOOLEAN]}, "AND", {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.BOOLEAN]}], returnType: RETURN_TYPES.BOOLEAN}], color: COLORS.ORANGE},
    {boxes: [{type: BOX_TYPES.SUB_BLOCK, contents: [ {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.BOOLEAN]}, "OR", {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.BOOLEAN]}], returnType: RETURN_TYPES.BOOLEAN}], color: COLORS.ORANGE},
    {boxes: [{type: BOX_TYPES.SUB_BLOCK, contents: [ "NOT (", {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.BOOLEAN]}, ")"], returnType: RETURN_TYPES.BOOLEAN}], color: COLORS.ORANGE},
    {boxes: [{type: BOX_TYPES.SUB_BLOCK, contents: [ {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.STRING, RETURN_TYPES.NUMBER]}, "==", {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.STRING, RETURN_TYPES.NUMBER]}], returnType: RETURN_TYPES.BOOLEAN}], color: COLORS.ORANGE},
    {boxes: [{type: BOX_TYPES.SUB_BLOCK, contents: [ {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.STRING, RETURN_TYPES.NUMBER]}, "!=", {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.STRING, RETURN_TYPES.NUMBER]}], returnType: RETURN_TYPES.BOOLEAN}], color: COLORS.ORANGE},
    {boxes: [{type: BOX_TYPES.SUB_BLOCK, contents: [ {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.NUMBER]}, ">", {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.NUMBER]}], returnType: RETURN_TYPES.BOOLEAN}], color: COLORS.ORANGE},
    {boxes: [{type: BOX_TYPES.SUB_BLOCK, contents: [ {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.NUMBER]}, ">=", {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.NUMBER]}], returnType: RETURN_TYPES.BOOLEAN}], color: COLORS.ORANGE},
    {boxes: [{type: BOX_TYPES.SUB_BLOCK, contents: [ {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.NUMBER]}, "<", {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.NUMBER]}], returnType: RETURN_TYPES.BOOLEAN}], color: COLORS.ORANGE},
    {boxes: [{type: BOX_TYPES.SUB_BLOCK, contents: [ {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.NUMBER]}, "<=", {subBoxType: SUB_BOX_TYPES.EMPTY, returnTypes: [RETURN_TYPES.NUMBER]}], returnType: RETURN_TYPES.BOOLEAN}], color: COLORS.ORANGE},
    {boxes: [{type: BOX_TYPES.SUB_BLOCK, contents: [{subBoxType: SUB_BOX_TYPES.INPUT, returnTypes: [RETURN_TYPES.BOOLEAN]}], returnType: RETURN_TYPES.BOOLEAN}], color: COLORS.ORANGE},

    // var - purple
]
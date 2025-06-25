import { ExtrudeCondition, LinePattern,  } from "./types"
import { 
  ifInterpretation, 
  beginInterpretation, 
  displayInterpretation, 
  elseIfInterpretation, 
  elseInterpretation, 
  endIfInterpretation,
  endInterpretation,
  endWhileInterpretation,
  equalsInterpretation,
  forInterpretation,
  getInterpretation,
  nextInterpretation,
  repeatInterpretation,
  untilInterpretation,
  whileInterpretation,
} from "./interpretationSubstituteMethods"

export const SPLITTING_PATTERN = /"[^"]*"|'[^']*'|\d+(?:\.\d+)?|==|!=|<=|>=|<|>|\+|-|\*|\/|[a-zA-Z_]\w*\[\d*\]|[a-zA-Z_]\w*|{[^}]*}|\S/g

export const COLORS = {
    ORANGE: "#FA9C1B",
    YELLOW: "#ff922b",
    LIGHT_GREEN: "#51cf66",
    FOREST: "#37b24d",
    CYAN: "#30D5C8",
    SKYBLUE: "#4dabf7",
    DARK_BLUE: "#00008B",
    PURPLE: "#9775fa",
    GREY: "#808080",

    EMPTY: "#e9ecef",
    DROP_TARGET: "#ced4da",
    BACKGROUND: "#1e1e1e",
}

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

export const RETURN_TYPES = {
    NUMBER: "NUMBER",
    STRING: "STRING",
    BOOLEAN: "BOOLEAN",
    VARIABLE: "VARIABLE",
    ANY: ["VARIABLE", "NUMBER", "STRING", "BOOLEAN"],
}

export const EXTRUDE_CONDITIONS : ExtrudeCondition[] = [
  {text: "*", l: true, r: true, variants: [{color: COLORS.DARK_BLUE, expectedL: [RETURN_TYPES.NUMBER], expectedR: [RETURN_TYPES.NUMBER]}]},
  {text: "/", l: true, r: true, variants: [{color: COLORS.DARK_BLUE, expectedL: [RETURN_TYPES.NUMBER], expectedR: [RETURN_TYPES.NUMBER]}]},
  {text: "+", l: true, r: true, variants: [{color: COLORS.DARK_BLUE, expectedL: [RETURN_TYPES.NUMBER], expectedR: [RETURN_TYPES.NUMBER]}, {color: COLORS.LIGHT_GREEN, expectedL: [RETURN_TYPES.NUMBER, RETURN_TYPES.STRING], expectedR: [RETURN_TYPES.NUMBER, RETURN_TYPES.STRING]}]},
  {text: "-", l: true, r: true, variants: [{color: COLORS.DARK_BLUE, expectedL: [RETURN_TYPES.NUMBER], expectedR: [RETURN_TYPES.NUMBER]}]},
  {text: "==", l: true, r: true, variants: [{color: COLORS.ORANGE, expectedL: [RETURN_TYPES.NUMBER, RETURN_TYPES.STRING], expectedR: [RETURN_TYPES.NUMBER, RETURN_TYPES.STRING]}]},
  {text: "!=", l: true, r: true, variants: [{color: COLORS.ORANGE, expectedL: [RETURN_TYPES.NUMBER, RETURN_TYPES.STRING], expectedR: [RETURN_TYPES.NUMBER, RETURN_TYPES.STRING]}]},
  {text: ">", l: true, r: true, variants: [{color: COLORS.ORANGE, expectedL: [RETURN_TYPES.NUMBER], expectedR: [RETURN_TYPES.NUMBER]}]},
  {text: ">=", l: true, r: true, variants: [{color: COLORS.ORANGE, expectedL: [RETURN_TYPES.NUMBER], expectedR: [RETURN_TYPES.NUMBER]}]},
  {text: "<", l: true, r: true, variants: [{color: COLORS.ORANGE, expectedL: [RETURN_TYPES.NUMBER], expectedR: [RETURN_TYPES.NUMBER]}]},
  {text: "<=", l: true, r: true, variants: [{color: COLORS.ORANGE, expectedL: [RETURN_TYPES.NUMBER], expectedR: [RETURN_TYPES.NUMBER]}]},
  {text: "NOT", l: false, r: true, variants: [{color: COLORS.ORANGE, expectedL: [RETURN_TYPES.BOOLEAN], expectedR: [RETURN_TYPES.BOOLEAN]}]},
  {text: "AND", l: true, r: true, variants: [{color: COLORS.ORANGE, expectedL: [RETURN_TYPES.BOOLEAN], expectedR: [RETURN_TYPES.BOOLEAN]}]},
  {text: "OR", l: true, r: true, variants: [{color: COLORS.ORANGE, expectedL: [RETURN_TYPES.BOOLEAN], expectedR: [RETURN_TYPES.BOOLEAN]}]},
]


export const POSSIBLE_LINE_PATTERNS : LinePattern[] = [ // if I fit pattern get my groups (foreach throughem and ignore index === 0) and shove them into my function
    {pattern: /^IF(.*)THEN/, interpretation: ifInterpretation, replaceVariables: [true], type: BOX_TYPES.WRAPPER},
    {pattern: /^ELSE IF(.*)THEN/, interpretation: elseIfInterpretation, replaceVariables: [true], type: BOX_TYPES.MID_WRAPPER},
    {pattern: /^ELSE/, interpretation: elseInterpretation, replaceVariables: [], type: BOX_TYPES.MID_WRAPPER},
    {pattern: /^ENDIF/, interpretation: endIfInterpretation, replaceVariables: [], type: BOX_TYPES.END_WRAPPER},
    
    {pattern: /^WHILE(.*)/, interpretation: whileInterpretation, replaceVariables: [true], type: BOX_TYPES.WRAPPER},
    {pattern: /^ENDWHILE/, interpretation: endWhileInterpretation, replaceVariables: [], type: BOX_TYPES.END_WRAPPER},

    {pattern: /^FOR(.*)=(.*)to(.*)STEP(.*)/, interpretation: forInterpretation, replaceVariables: [false, true, true, true], type: BOX_TYPES.WRAPPER},
    {pattern: /^NEXT/, interpretation: nextInterpretation, replaceVariables: [], type: BOX_TYPES.END_WRAPPER},
    
    {pattern: /^REPEAT/, interpretation: repeatInterpretation, replaceVariables: [], type: BOX_TYPES.WRAPPER},
    {pattern: /^UNTIL(.*)/, interpretation: untilInterpretation, replaceVariables: [true], type: BOX_TYPES.END_WRAPPER},
    
    {pattern: /^BEGIN/, interpretation: beginInterpretation, replaceVariables: [], type: BOX_TYPES.WRAPPER},
    {pattern: /^END/, interpretation: endInterpretation, replaceVariables: [], type: BOX_TYPES.END_WRAPPER},

    {pattern: /^display(.*)/, interpretation: displayInterpretation, replaceVariables: [true], type: BOX_TYPES.BLOCK},
    {pattern: /^get(.*)/, interpretation: getInterpretation, replaceVariables: [false], type: BOX_TYPES.BLOCK},

    {pattern: /^([^\s]*)\s*=(.*)/, interpretation: equalsInterpretation, replaceVariables: [false, true], type: BOX_TYPES.BLOCK},
];

export const KEYWORDS = ["IF", "ELSE", "THEN", "BEGIN", "END", "WHILE", "FOR", "STEP", "NEXT", "to", "ENDWHILE", "ENDIF", "display", "get", "REPEAT", "UNTIL", "AND", "OR", "NOT", "true", "false"]
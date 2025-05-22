import { ExtrudeCondition } from "./types"

export const SPLITTING_PATTERN = /"[^"]*"|'[^']*'|\d+(?:\.\d+)?|==|!=|<=|>=|<|>|\+|-|\*|\/|[a-zA-Z_]\w*|\S/g

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

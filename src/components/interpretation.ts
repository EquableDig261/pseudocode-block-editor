import { EXTRUDE_CONDITIONS, SPLITTING_PATTERN } from "./constants"

type indentationData = {
    beginIndentLine: number,
    hasTriggeredIf: boolean,
}

type interpretationData = {
    currentLineNumber: number,
    currentIndent: number,
    indentationData: indentationData[],
    realIndent: number,
    variables: variables[],
    lines: string[],
    setOutput: React.Dispatch<React.SetStateAction<string[]>>,
    getInput: (prompt: string) => Promise<string>,
} 
type variables = {
    name: string,
    isArray: boolean,
    contents: (string | boolean | number | (string | boolean | number)[]),
}

type LinePattern = {
    pattern: {
        [Symbol.match](string: string): RegExpMatchArray | null;
    };
    interpretation: (groups: (string | number | boolean)[], data: interpretationData) => (interpretationData | Promise<interpretationData>);
    replaceVariables: boolean[];
};

const ifInterpretation = (groups: (string | number | boolean)[], data: interpretationData) => {
    if (data.currentIndent === data.realIndent && groups[0] === true) {
        data.currentIndent += 1;
        data.indentationData[data.indentationData.length - 1].hasTriggeredIf = true;
        data.indentationData.push({beginIndentLine: data.currentLineNumber, hasTriggeredIf: false});
    }
    return data;
}

const elseIfInterpretation = (groups: (string | number | boolean)[], data: interpretationData) => {
    if (data.currentIndent === data.realIndent && !data.indentationData[data.indentationData.length - 1].hasTriggeredIf && groups[0] === true) {
        data.currentIndent += 1;
        data.indentationData[data.indentationData.length - 1].hasTriggeredIf = true
        data.indentationData.push({beginIndentLine: data.currentLineNumber, hasTriggeredIf: false})
    }
    else if (data.currentIndent > data.realIndent) {
        data.currentIndent -= 1;
        data.indentationData.pop()
    }
    return data;
}

const elseInterpretation = (groups: (string | number | boolean)[], data: interpretationData) => {
    if (data.currentIndent === data.realIndent && !data.indentationData[data.indentationData.length - 1].hasTriggeredIf) {
        data.currentIndent += 1;
        data.indentationData.push({beginIndentLine: data.currentLineNumber, hasTriggeredIf: false})
    } else if (data.currentIndent > data.realIndent) {
        data.currentIndent -= 1;
        data.indentationData.pop()
    }
    return data;
}

const endIfInterpretation = (groups: (string | number | boolean)[], data: interpretationData) => {
    if (data.currentIndent > data.realIndent) {
        data.currentIndent -= 1;
        data.indentationData.pop()
    }
    if (data.currentIndent === data.realIndent) {
        data.indentationData[data.indentationData.length - 1].hasTriggeredIf = false
    }
    return data;
}

const whileInterpretation = (groups: (string | number | boolean)[], data: interpretationData) => {
    if (data.currentIndent === data.realIndent && groups[0] === true) {
        data.currentIndent += 1;
        data.indentationData.push({beginIndentLine: data.currentLineNumber, hasTriggeredIf: false})
    }
    return data;
}

const endWhileInterpretation = (groups: (string | number | boolean)[], data: interpretationData) => {
    if (data.currentIndent > data.realIndent) { 
        data.currentIndent -= 1;
        data.currentLineNumber = data.currentLineNumber = data.indentationData[data.indentationData.length - 1].beginIndentLine
        data.indentationData.pop()
    }
    return data;
}

const forInterpretation = (groups: (string | number | boolean)[], data: interpretationData) => {
    if (data.currentIndent === data.realIndent)  {
        const variableIndex =  data.variables.findIndex(variable => variable.name === groups[0])
        if (variableIndex === -1 && typeof groups[0] === "string") {
            data.variables.push({name: groups[0] as string, isArray: false, contents: groups[1]})
        }
        else if (typeof data.variables[variableIndex].contents === "number" && typeof groups[3] === "number") data.variables[variableIndex].contents += groups[3] as number
    
        const variable =  data.variables.find(variable => variable.name === groups[0])
        if (variable !== undefined && variable.contents <= groups[2])  {
            data.currentIndent += 1;
            data.indentationData.push({beginIndentLine: data.currentLineNumber, hasTriggeredIf: false})
        }
    }
    return data;
}

const endForInterpretation = (groups: (string | number | boolean)[], data: interpretationData) => {
    if (data.currentIndent > data.realIndent) { 
        data.currentIndent -= 1;
        data.currentLineNumber = data.indentationData[data.indentationData.length - 1].beginIndentLine
        data.indentationData.pop()
    }
    return data;
}

const repeatInterpretation = (groups: (string | number | boolean)[], data: interpretationData) => {
    if (data.currentIndent === data.realIndent) {
        data.currentIndent += 1;
        data.indentationData.push({beginIndentLine: data.currentLineNumber, hasTriggeredIf: false})
    }
    return data;
}

const untilInterpretation = (groups: (string | number | boolean)[], data: interpretationData) => {
    if (data.currentIndent > data.realIndent) {
        data.currentIndent -= 1;
        if (groups[0] === false) {
            data.currentLineNumber = data.currentLineNumber = data.indentationData[data.indentationData.length - 1].beginIndentLine
        }
        data.indentationData.pop()
    }
    return data;
}

const beginInterpretation = (groups: (string | number | boolean)[], data: interpretationData) => {
    data.currentIndent = 1
    data.indentationData.push({beginIndentLine: data.currentIndent, hasTriggeredIf: false})
    return data
}

const endInterpretation = (groups: (string | number | boolean)[], data: interpretationData) => {
    data.currentIndent = -1
    return data
}

const displayInterpretation = (groups: (string | number | boolean)[], data: interpretationData) => {
    if (data.realIndent === data.currentIndent) data.setOutput(prev => [...prev, String(groups[0]), ""])
    return data
}

const getInterpretation = async (groups: (string | number | boolean)[], data: interpretationData): Promise<interpretationData> => {
    if (data.realIndent === data.currentIndent && typeof groups[0] === "string") {
        const input = await data.getInput(groups[0] + ":");
        const variableIndex =  data.variables.findIndex(variable => variable.name === groups[0])
        if (variableIndex === -1) data.variables.push({name: groups[0], isArray: false, contents: input})
        else data.variables[variableIndex].contents = input
    }
    return data;
}

const equalsInterpretation = (groups: (string | number | boolean)[], data: interpretationData) => {
    if (data.realIndent === data.currentIndent) {
        const variableIndex =  data.variables.findIndex(variable => variable.name === groups[0])
        let value : (string | number | boolean | string[] | number[] | boolean[]) = groups[1]
        if (typeof groups[1] === "string" && groups[1].match(/{.*}/)) {
            value = groups[1].replace(/[{}]/g, "").split(",").map(group => group.trim())
        }
            if (variableIndex === -1 && typeof groups[0] === "string") data.variables.push({name: groups[0] as string, isArray: value !== groups[1], contents: value})
            else data.variables[variableIndex].contents = value
    }
    return data
}

const POSSIBLE_LINE_PATTERNS : LinePattern[] = [ // if I fit pattern get my groups (foreach throughem and ignore index === 0) and shove them into my function
    {pattern: /^IF(.*)THEN/, interpretation: ifInterpretation, replaceVariables: [true]},
    {pattern: /^ELSE IF(.*)THEN/, interpretation: elseIfInterpretation, replaceVariables: [true]},
    {pattern: /^ELSE/, interpretation: elseInterpretation, replaceVariables: []},
    {pattern: /^ENDIF/, interpretation: endIfInterpretation, replaceVariables: []},
    
    {pattern: /^WHILE(.*)/, interpretation: whileInterpretation, replaceVariables: [true]},
    {pattern: /^ENDWHILE/, interpretation: endWhileInterpretation, replaceVariables: []},

    {pattern: /^FOR(.*)=(.*)to(.*)STEP(.*)/, interpretation: forInterpretation, replaceVariables: [false, true, true, true]},
    {pattern: /^ENDFOR/, interpretation: endForInterpretation, replaceVariables: []},
    
    {pattern: /^REPEAT/, interpretation: repeatInterpretation, replaceVariables: []},
    {pattern: /^UNTIL(.*)/, interpretation: untilInterpretation, replaceVariables: [true]},

    // {pattern: /^CASEWHERE(.*)/, order: ["CASEWHERE", {acceptedReturnTypes: [RETURN_TYPES.BOOLEAN]}], color: COLORS.YELLOW, boxType: BOX_TYPES.WRAPPER},
    // {pattern: /^ENDCASE/, order: ["ENDCASE"], color: COLORS.YELLOW, boxType: BOX_TYPES.END_WRAPPER},
    
    {pattern: /^BEGIN/, interpretation: beginInterpretation, replaceVariables: []},
    {pattern: /^END/, interpretation: endInterpretation, replaceVariables: []},

    {pattern: /^display(.*)/, interpretation: displayInterpretation, replaceVariables: [true]},
    {pattern: /^get(.*)/, interpretation: getInterpretation, replaceVariables: [false]},

    {pattern: /^([^\s]*)\s*=(.*)/, interpretation: equalsInterpretation, replaceVariables: [false, true]},
];

export const interpret = async (setLines: React.Dispatch<React.SetStateAction<string[]>>, getInput: (prompt: string) => Promise<string>) => {
    let editorContent = localStorage.getItem("editorContent")
    if (!editorContent) editorContent = ""
    const lines:string[] = editorContent.split("\n");
    let data : interpretationData = {
        indentationData: [],
        currentLineNumber: 1,
        currentIndent: -1,
        realIndent: 0,
        variables: [],
        lines: lines,
        setOutput: setLines,
        getInput: getInput,
    }
    while (data.currentLineNumber <= lines.length){
        const preLineNumber = data.currentLineNumber
        data = await interpretLine(lines[data.currentLineNumber - 1], data)
        if (data.currentLineNumber === preLineNumber) data.currentLineNumber++;
    }
}

const interpretLine = async (line: string, data: interpretationData) : Promise<interpretationData> => {
    let cleaned = line.replace(/\u00A0|\u2003|\u2002|\u2009/g, ' ');
    cleaned = line.replace(/\t/g, '    ');
    const matchResult = cleaned.match(/^\s*/);
    const whitespaceArray = matchResult && typeof matchResult[0] === "string" ? matchResult[0].split("") : "";
    data.realIndent = Math.ceil(whitespaceArray.length / 4)
    line = line.trim()
    const pattern = POSSIBLE_LINE_PATTERNS.find(pattern => line.match(pattern.pattern))
    if (pattern !== undefined) {
        const groups = line.match(pattern.pattern)
        if (groups === null) return data   
        const parts : (string | number | boolean)[] = groups.slice(1).map((group, index) => {
            let match : (string | number | boolean)[] = group.match(SPLITTING_PATTERN) ?? []
            if (pattern.replaceVariables[index]) match = match.map(item => {
                data.variables.forEach(variable => {
                    if (variable.name === item) {
                        if (variable.isArray) item = "[" + (variable.contents as (string | boolean | number)[]).join(", ") + "]"
                        else item = variable.contents as (string | boolean | number)
                    }
                    else if (variable.isArray && typeof item === "string" && (item.match(/([a-zA-Z_]\w*)\[\d+\]/)?.[1] === variable.name)) {
                        item = (variable.contents as (number[] | string[] | boolean[]))[(item.match(/[a-zA-Z_]\w*\[(\d+)\]/)?? [0])[1] as number]
                    }
                })
                return item;
            })
            return getValue(match)
        })
        if (parts === null) return data
        data = await pattern.interpretation(parts, data);
    }
    return data
}

const getValue = (text: (string | number | boolean)[]) : string | number | boolean => {
    while (text.includes("(")) {
        text = evaluate(text)
    }
    return innerEvaluate(text)
}

const evaluate = (text : (string | number | boolean)[]) : (string | boolean | number)[] => {
    let lastBrace = -1;
    text.forEach((t, index) => {
    if (t === "(") lastBrace = index;
    if (t === ")" && lastBrace >= 0) {
        text.splice(lastBrace, index - lastBrace + 1, innerEvaluate(text.slice(lastBrace + 1, index)));
    }
    })
    return text;
}


const innerEvaluate = (text : (string | number | boolean)[]) : (string | boolean | number) => {
    if (text.length === 1){
        return getAdjacentString(text, 0);
    }
    EXTRUDE_CONDITIONS.forEach(condition => {
        while (text.includes(condition.text)) {
            const target = text.findIndex(str => str === condition.text);
            const leftString = (condition.l) ? getAdjacentString(text, target - 1) : null;
            const rightString = (condition.r) ? getAdjacentString(text, target + 1) : null;
            let replacement = null
            switch (condition.text) {
                case "*":
                    if (typeof leftString === "number" && typeof rightString === "number") replacement = leftString * rightString;
                    break;
                case "/":
                    if (typeof leftString === "number" && typeof rightString === "number") replacement = leftString / rightString;
                    break;
                case "+":
                    if (typeof leftString === "number" && typeof rightString === "number") replacement = leftString + rightString;
                    if (typeof leftString === "string" && typeof rightString === "string") replacement = leftString + rightString;
                    if (typeof leftString === "string" && typeof rightString === "number") replacement = leftString + String(rightString);
                    if (typeof leftString === "number" && typeof rightString === "string") replacement = String(leftString) + rightString;
                    break;
                case "-":
                    if (typeof leftString === "number" && typeof rightString === "number") replacement = leftString - rightString;
                    break;
                case "==":
                    replacement = leftString === rightString;
                    break;
                case "!=":
                    replacement = leftString !== rightString;
                    break;
                case ">=":
                    if (typeof leftString === "number" && typeof rightString === "number") replacement = leftString >= rightString;
                    break;
                case ">":
                    if (typeof leftString === "number" && typeof rightString === "number") replacement = leftString > rightString;
                    break;
                case "<=":
                    if (typeof leftString === "number" && typeof rightString === "number") replacement = leftString <= rightString;
                    break;
                case "<":
                    if (typeof leftString === "number" && typeof rightString === "number") replacement = leftString < rightString;
                    break;
                case "NOT":
                    if (typeof rightString === "boolean") replacement = !rightString;
                    break;
                case "AND":
                    if (typeof leftString === "boolean" && typeof rightString === "boolean") replacement = leftString && rightString;
                    break;
                case "OR":
                    if (typeof leftString === "boolean" && typeof rightString === "boolean") replacement = leftString || rightString;
                    break;
            }
            const left = (leftString ? 1 : 0)
            const right = (rightString ? 1 : 0)
            if (replacement === null) return text // THROW ERROR 
            text.splice(target - left, 1 + left + right, replacement);
        }
    })
    return text[0];
}

const getAdjacentString = (text : (string | boolean| number)[], expectedIndex : number) : (number | string | boolean) => {
    if (expectedIndex < 0 || expectedIndex >= text.length || EXTRUDE_CONDITIONS.some(condition => condition.text === text[expectedIndex])) {
        // THROW ERROR
    } 
    const returnText = text[expectedIndex]
    if (typeof returnText === "string" && returnText.match(/^(".*"|'.*')$/)) return returnText.slice(1, -1);
    if (typeof returnText === "string" && !isNaN(Number(returnText))) return Number(returnText);
    if (typeof returnText === "string" && (returnText === "true" || returnText === "false")) return returnText === "true" ? true : false
    return text[expectedIndex];
}

// const getLastWhile = (lines: string[], currentLineNumber: number): number => {
//     let numWhiles = 0;
//     let numEndWhiles = 0;
//     let whileIndex = 0;
//     lines.toReversed().forEach((line, index) => {
//         line = line.trim()
//         if (lines.length - index >= currentLineNumber) return
//         if (line.match(/^ENDWHILE/)) numEndWhiles++
//         else if (line.match(/^WHILE(.*)/) && ++numWhiles > numEndWhiles) {
//             whileIndex = lines.length - index
//         }
//     })
//     return whileIndex
// }

// const getLastRepeat = (lines: string[], currentLineNumber: number): number => {
//     let numRepeats = 0;
//     let numUntils = 0;
//     let repeatIndex = 0;
//     lines.toReversed().forEach((line, index) => {
//         line = line.trim()
//         if (lines.length - index >= currentLineNumber) return
//         if (line.match(/^UNTIL(.*)/)) numUntils++
//         else if (line.match(/^REPEAT/) && ++numRepeats > numUntils) {
//             repeatIndex = lines.length - index
//         }
//     })
//     return repeatIndex
// }

// const getLastFor = (lines: string[], currentLineNumber: number): number => {
//     let numFors = 0;
//     let numEndFors = 0;
//     let forIndex = 0;
//     lines.toReversed().forEach((line, index) => {
//         line = line.trim()
//         if (lines.length - index >= currentLineNumber) return
//         if (line.match(/^ENDFOR/)) numEndFors++
//         else if (line.match(/^FOR(.*)=(.*)to(.*)STEP(.*)/) && ++numFors > numEndFors) {
//             forIndex = lines.length - index
//         }
//     })
//     return forIndex
// }




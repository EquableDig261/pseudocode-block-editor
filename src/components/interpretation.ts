import { EXTRUDE_CONDITIONS, SPLITTING_PATTERN, POSSIBLE_LINE_PATTERNS } from "./constants"
import { InterpretationData } from "./types"

// Added shouldStop as a function to check for the stop signal
export const interpret = async (setLines: React.Dispatch<React.SetStateAction<string[]>>, getInput: (prompt: string) => Promise<string>, shouldStop: () => boolean) => {
    let editorContent = localStorage.getItem("editorContent")
    if (!editorContent) editorContent = ""
    const lines:string[] = editorContent.split("\n");
    let data : InterpretationData = {
        indentationData: [],
        currentLineNumber: 1,
        currentIndent: -1,
        realIndent: 0,
        variables: [],
        lines: lines,
        setOutput: setLines,
        getInput: getInput,
    }

    try {
        while (data.currentLineNumber <= lines.length){
            // Yield control to the event loop to prevent freezing
            await new Promise(resolve => setTimeout(resolve, 0));

            // Check if stop has been requested
            if (shouldStop()) {
                throw new Error("Execution stopped by user.");
            }

            const preLineNumber = data.currentLineNumber
            data = await interpretLine(lines[data.currentLineNumber - 1], data)
            if (data.currentLineNumber === preLineNumber) data.currentLineNumber++;
        }
    } catch (error) {
        // Re-throw the error so it can be caught by the calling component (Terminal.tsx)
        throw error;
    }
}

const interpretLine = async (line: string, data: InterpretationData) : Promise<InterpretationData> => {
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

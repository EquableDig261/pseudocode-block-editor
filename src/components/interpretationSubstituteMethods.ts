import { InterpretationData } from "./types";

export const ifInterpretation = (groups: (string | number | boolean)[], data: InterpretationData) => {
    if (data.currentIndent === data.realIndent && groups[0] === true) {
        data.currentIndent += 1;
        data.indentationData[data.indentationData.length - 1].hasTriggeredIf = true;
        data.indentationData.push({beginIndentLine: data.currentLineNumber, hasTriggeredIf: false});
    }
    return data;
}

export const elseIfInterpretation = (groups: (string | number | boolean)[], data: InterpretationData) => {
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

export const elseInterpretation = (groups: (string | number | boolean)[], data: InterpretationData) => {
    if (data.currentIndent === data.realIndent && !data.indentationData[data.indentationData.length - 1].hasTriggeredIf) {
        data.currentIndent += 1;
        data.indentationData.push({beginIndentLine: data.currentLineNumber, hasTriggeredIf: false})
    } else if (data.currentIndent > data.realIndent) {
        data.currentIndent -= 1;
        data.indentationData.pop()
    }
    return data;
}

export const endIfInterpretation = (groups: (string | number | boolean)[], data: InterpretationData) => {
    if (data.currentIndent > data.realIndent) {
        data.currentIndent -= 1;
        data.indentationData.pop()
    }
    if (data.currentIndent === data.realIndent) {
        data.indentationData[data.indentationData.length - 1].hasTriggeredIf = false
    }
    return data;
}

export const whileInterpretation = (groups: (string | number | boolean)[], data: InterpretationData) => {
    if (data.currentIndent === data.realIndent && groups[0] === true) {
        data.currentIndent += 1;
        data.indentationData.push({beginIndentLine: data.currentLineNumber, hasTriggeredIf: false})
    }
    return data;
}

export const endWhileInterpretation = (groups: (string | number | boolean)[], data: InterpretationData) => {
    if (data.currentIndent > data.realIndent) { 
        data.currentIndent -= 1;
        data.currentLineNumber = data.currentLineNumber = data.indentationData[data.indentationData.length - 1].beginIndentLine
        data.indentationData.pop()
    }
    return data;
}

export const forInterpretation = (groups: (string | number | boolean)[], data: InterpretationData) => {
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

export const nextInterpretation = (groups: (string | number | boolean)[], data: InterpretationData) => {
    if (data.currentIndent > data.realIndent) { 
        data.currentIndent -= 1;
        data.currentLineNumber = data.indentationData[data.indentationData.length - 1].beginIndentLine
        data.indentationData.pop()
    }
    return data;
}

export const repeatInterpretation = (groups: (string | number | boolean)[], data: InterpretationData) => {
    if (data.currentIndent === data.realIndent) {
        data.currentIndent += 1;
        data.indentationData.push({beginIndentLine: data.currentLineNumber, hasTriggeredIf: false})
    }
    return data;
}

export const untilInterpretation = (groups: (string | number | boolean)[], data: InterpretationData) => {
    if (data.currentIndent > data.realIndent) {
        data.currentIndent -= 1;
        if (groups[0] === false) {
            data.currentLineNumber = data.currentLineNumber = data.indentationData[data.indentationData.length - 1].beginIndentLine
        }
        data.indentationData.pop()
    }
    return data;
}

export const beginInterpretation = (groups: (string | number | boolean)[], data: InterpretationData) => {
    data.currentIndent = 1
    data.indentationData.push({beginIndentLine: data.currentIndent, hasTriggeredIf: false})
    return data
}

export const endInterpretation = (groups: (string | number | boolean)[], data: InterpretationData) => {
    data.currentIndent = -1
    return data
}

export const displayInterpretation = (groups: (string | number | boolean)[], data: InterpretationData) => {
    if (data.realIndent === data.currentIndent) data.setOutput(prev => [...prev, String(groups[0])])
    return data
}

export const getInterpretation = async (groups: (string | number | boolean)[], data: InterpretationData): Promise<InterpretationData> => {
    if (data.realIndent === data.currentIndent && typeof groups[0] === "string") {
        const input = await data.getInput(groups[0] + ":");
        const variableIndex =  data.variables.findIndex(variable => variable.name === groups[0])
        if (variableIndex === -1) data.variables.push({name: groups[0], isArray: false, contents: input})
        else data.variables[variableIndex].contents = input
    }
    return data;
}

export const equalsInterpretation = (groups: (string | number | boolean)[], data: InterpretationData) => {
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
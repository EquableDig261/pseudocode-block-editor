

type pass = {
    variables: {name: string, value: string}[],
    codeIndentation: number,
    actualIndentation: number,
};

export const interpret = (code : string[][]) => {
    code.forEach(block => {
        let data: pass = {variables: [], codeIndentation: 0, actualIndentation: 0}
        block.forEach(line => {
            data = handleLine(line, data)
        })
    })
}


const handleLine = (line : string, data : pass) : pass => {
    const splitLine = line.split(" ")
    const type = splitLine[0];
    switch(type) {
        case "IF": data = handleIf(splitLine, data); break;
        case "ENDIF": data = handleEndIf(splitLine, data); break;
        case "Display": handleDisplay(splitLine, data); break;
        default: console.log("FUCK"); break;
    }
    return data;
}



const handleIf = (line: string[], data : pass) : pass => {
    if (data.actualIndentation === data.codeIndentation && handleBoolSub(line.slice(1), data)) data.actualIndentation += 1;
    data.codeIndentation += 1;
    return data;
}

const handleEndIf = (line: string[], data : pass) : pass => {
    data.codeIndentation -= 1;
    data.actualIndentation = Math.min(data.codeIndentation, data.actualIndentation);
    return data
}

const handleDisplay = (line: string[], data : pass) => {
    if (data.actualIndentation === data.codeIndentation) console.log(handleSub(line.splice(1), data))
}

const handleBoolSub = (line : string[], data : pass) : boolean => {
    if (line.length === 1) {
        return line[0] === "true" ? true : false
    }
    return false;
} 

const handleSub = (line : string[], data : pass) => {
    if (line.length === 1) {
        return line[0]
    }
    return "ERROR";
} 
export type ExtrudeCondition = {
    text : string,
    l : boolean,
    r : boolean,
    variants: ExtrudeConditionType[],
}

export type ExtrudeConditionType = {
    color : string,
    expectedL: string[],
    expectedR: string[],  
}

export type LinePattern = {
    pattern: {
        [Symbol.match](string: string): RegExpMatchArray | null;
    };
    interpretation: (groups: (string | number | boolean)[], data: InterpretationData) => (InterpretationData | Promise<InterpretationData>);
    replaceVariables: boolean[];
    type: string;
};

export type IndentationData = {
    beginIndentLine: number,
    hasTriggeredIf: boolean,
}

export type InterpretationData = {
    currentLineNumber: number,
    currentIndent: number,
    indentationData: IndentationData[],
    realIndent: number,
    variables: Variables[],
    lines: string[],
    setOutput: React.Dispatch<React.SetStateAction<string[]>>,
    getInput: (prompt: string) => Promise<string>,
} 

export type Variables = {
    name: string,
    isArray: boolean,
    contents: (string | boolean | number | (string | boolean | number)[]),
}
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
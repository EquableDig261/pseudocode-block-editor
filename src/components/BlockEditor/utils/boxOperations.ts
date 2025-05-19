import { Box, BoxStack } from "../types";
import { getEmptySubBlock } from "./utility";

export const getContents = (box: Box): (string | Box)[] => {
    return box.contents.flatMap(content => {
        if (typeof content === "string") {
            return [content];
        } else {
            return [content, ...getContents(content)];
        }
    });
};

export const replaceContents = (contents: (string | Box)[], dropTargetId: number, replacementBox: Box): (string | Box)[] => {
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

export const removeSubBox = (targetId: number, box: Box, newEmptyBoxId: number, newEmptyBoxType: string | null): Box => {
    if (box.id === targetId) {
        return getEmptySubBlock(newEmptyBoxId, box.acceptedReturnTypes ?? newEmptyBoxType);
    }
    return {...box, contents: box.contents.map((content) => {
        if (typeof content === "string") return content;
        return removeSubBox(targetId, content, newEmptyBoxId, newEmptyBoxType);
    })}
}

export const boxIsASubBoxOf = (target: Box, box: Box): boolean => {
    for (const content of box.contents) {
        if (typeof content === "string") continue;
        if (content.id === target.id) return true;
        if (boxIsASubBoxOf(content, target)) return true;
    }
    return false;
};

export const recurseUpdateInputBox = (targetId : number, contents: string, boxes : (Box | string)[]) : (Box | string)[] => {
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

export const updateInputBox = (boxes: BoxStack[], targetId: number, contents: string) : (BoxStack[]) => {
    return boxes.map((boxStack) => ({
        ...boxStack,
        boxes: recurseUpdateInputBox(targetId, contents, boxStack.boxes),
      } as BoxStack));
}

export const value = (contentId: number, boxes: BoxStack[]) => {
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
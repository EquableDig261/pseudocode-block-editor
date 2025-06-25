import {BoxStack, Box} from "./../types"
import {BOX_TYPES} from "./../../constants"

export const serialize = (boxes : BoxStack[]) => {
    boxes = boxes.filter((boxStack) => !boxStack.boxes.some(box => box.isOriginal));
    const code = (boxes.map((boxStack) => {
        return boxStack.boxes.map((box) => {
            return "\t".repeat(Math.max(0, box.indentation)) + getText(box).reduce((prev, cur) => prev + cur)
        })
    }));
    return code.reduce((prev, curr) => prev + "\n\n" + curr.join("\n"), "").replace(/^\s*/g, "");
}

const getText = (box: Box) : string[]  => {
    return box.contents.flatMap((content) => {
        if (typeof content === "string") {
            return [content];
        }
        if (content.type === BOX_TYPES.TEXT_INPUT) {
            return [`"` + content.contents[0] + `"`];
        }
        return getText(content);
    })
}

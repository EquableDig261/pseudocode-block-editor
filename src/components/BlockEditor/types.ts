export type Box = {
  id: number;
  x: number;
  y: number;
  isOriginal: boolean;
  verticalOffset: number;
  color: string;
  indentation: number;
  type: string;
  contents: (Box | string)[];
  returnType: string | null;
  acceptedReturnTypes: string[];
};

export type BoxStack = {
  boxes: (Box)[];
  isDragging: boolean;
};

export type AcceptedBoxTypes = {
    acceptedReturnTypes: string[]
}

export type SubBox = {
    subBoxType: string
    returnTypes: string[];
}

export type LinePattern = {
    pattern: {
        [Symbol.match](string: string): RegExpMatchArray | null;
    };
    order: (string | AcceptedBoxTypes)[];
    color: string;
    boxType: string;
};

export type LibraryBox = {
    type: string;
    contents: (string | SubBox)[];
    returnType: string | null;
};
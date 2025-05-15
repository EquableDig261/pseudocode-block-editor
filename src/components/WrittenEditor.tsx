'use client';

import React, { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';

// Dynamically load MonacoEditor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react').then(mod => mod.default), {
  ssr: false,
});

const languageId = 'mylang';

const keywords = [
  "IF", "ELSE", "THEN", "BEGIN", "END", "WHILE", "FOR", "STEP", "NEXT", "ENDWHILE", "ENDIF", "display", "get", "REPEAT", "UNTIL", "CASEWHERE", "ENDCASE", "AND", "OR", "NOT"
];

type tree = (string | tree)[];

type condition = {
  text : string,
  l : boolean,
  r : boolean,
}

const extrudeConditions : condition[] = [
  {text: "*", l: true, r: true},
  {text: "/", l: true, r: true},
  {text: "+", l: true, r: true},
  {text: "-", l: true, r: true},
  {text: "==", l: true, r: true},
  {text: "!=", l: true, r: true},
  {text: ">", l: true, r: true},
  {text: ">=", l: true, r: true},
  {text: "<", l: true, r: true},
  {text: "<=", l: true, r: true},
  {text: "NOT", l: false, r: true},
  {text: "AND", l: true, r: true},
  {text: "OR", l: true, r: true},
]

export default function WrittenEditor() {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null); // Ref to hold the Monaco editor instance

  useEffect(() => {
    loader.init().then(monaco => {
      if (monaco.languages.getLanguages().some(lang => lang.id === languageId)) return;

      // Register a new language
      monaco.languages.register({ id: languageId });

      // Set tokenizer rules
      monaco.languages.setMonarchTokensProvider(languageId, {
        tokenizer: {
          root: [
            [/\b(IF|ELSE|THEN|BEGIN|END|WHILE|FOR|STEP|NEXT|ENDWHILE|ENDIF|display|get|REPEAT|UNTIL|CASEWHERE|ENDCASE|AND|OR|NOT|length|of|is|OTHERWISE:)\b/, 'keyword'],
            [/[a-z_$][\w$]*/, 'identifier'],
            [/\d+/, 'number'],
            [/=/, 'operator'],
            [/".*?"/, 'string'],
            [/\s+/, 'white'],
          ],
        },
      });

      // Register completion item provider for language
      monaco.languages.registerCompletionItemProvider(languageId, {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range: monaco.IRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          let suggestions = [
            {
              label: 'THEN',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'THEN\n\t',
              sortText: "000",
              range,
            },
            {
              label: 'FOR...NEXT',
              filterText: 'FOR',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'FOR $0\nNEXT ',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              sortText: "000",
              range,
            },
            {
              label: 'ELSE IF',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'ELSE IF ',
              sortText: "000",
              range,
            },
            {
              label: 'length of',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'length of ',
              range,
            },
            {
              label: 'BEGIN...END',
              filterText: 'BEGIN',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'BEGIN\n\t$0\nEND',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              sortText: "000",
              range: range,
            },
            {
              label: 'IF...ENDIF',
              filterText: 'IF',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'IF $0\nENDIF',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              sortText: "000",
              range: range,
            },
            {
              label: 'CASEWHERE...ENDCASE',
              filterText: 'CASEWHERE',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'CASEWHERE $0\nENDCASE',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              sortText: "000",
              range: range,
            },
            {
              label: 'REPEAT...UNTIL',
              filterText: 'REPEAT',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'REPEAT\n\t\nUNTIL ',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              sortText: "000",
              range: range,
            }
          ];

          suggestions = suggestions.concat(keywords.map((keyword) => ({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range,
          })));

          return {
            suggestions,
          };
        },
      });

      // Set language configuration
      monaco.languages.setLanguageConfiguration(languageId, {
        brackets: [['{', '}'], ['[', ']'], ['(', ')']],
        autoClosingPairs: [
          { open: '{', close: '}' },
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '"', close: '"', notIn: ['string'] },
        ],
        onEnterRules: [
          {
            beforeText: /(IF|WHILE|REPEAT|BEGIN|FOR|CASEWHERE)\b/i,
            action: { indentAction: monaco.languages.IndentAction.Indent }
          },
        ],
      });

      // Define a custom theme
      monaco.editor.defineTheme('myCustomTheme', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'keyword', foreground: 'a47dab', fontStyle: 'bold' },
          { token: 'number', foreground: '4ec9b0' },
          { token: 'string', foreground: 'ce9178' },
        ],
        colors: {
          // Customize theme further if needed
        },
      });

      // Set initial markers or error handling
      const editors = monaco.editor.getEditors();
      const model = editors.length > 0 ? editors[0].getModel() : null;
      if (model) {
        monaco.editor.setModelMarkers(model, 'myLangOwner', [
          {
            startLineNumber: 2,
            startColumn: 1,
            endLineNumber: 2,
            endColumn: 5,
            message: 'Unexpected token',
            severity: monaco.MarkerSeverity.Error,
          },
        ]);
      }
    });
  }, []);

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor): void => {
    editorRef.current = editor;
  };

  const innerExtrude = (text : tree, conditions : condition[]) : tree => {
    let changeFlag = false;
    conditions.forEach(cond => {
      const left = (cond.l ? 1 : 0)
      const right = (cond.r ? 1 : 0)
      while (text.includes(cond.text)) {
        const target = text.findIndex(str => str === cond.text);
        if (target <= left - 1 || target >= text.length - right) {}//TODO: throw error
        changeFlag = true;
        const leftString = (cond.l) ? (typeof text[target - 1] === "string") ? [text[target - 1]] : text[target - 1] : null
        const rightString = (cond.r) ? (typeof text[target + 1] === "string") ? [text[target + 1]] : text[target + 1] : null
        const replacement = [leftString, text[target], rightString].filter(v => v !== null)
        text.splice(target - left, 1 + left + right, replacement);
      }
    })
    return (changeFlag && typeof text[0] !== "string") ? text[0] : text;
  }

  const extrude = (text : tree) : tree => {
// find the first ) and track the last ( then inner extrude what is between and return that in place of the brackets and what is between them
    let lastBrace = -1;
    text.forEach((t, index) => {
      if (t === "(") lastBrace = index;
      if (t === ")" && lastBrace >= 0) {
        const spliceWholeArray = (index - lastBrace + 1 === text.length);
        text.splice(lastBrace, index - lastBrace + 1, innerExtrude(text.slice(lastBrace + 1, index), extrudeConditions));
      if (spliceWholeArray && typeof text[0] !== "string") text = text[0]
      }
    })
    return text;
  }

  const getTree = (text : tree) => {
    while (text.includes("(")) {
      text = extrude(text)
    }
    return innerExtrude(text, extrudeConditions);
  }

  const getEditorContents = () => {
    if (!editorRef.current) return;
    const values:string[] = editorRef.current?.getValue().split("\n");
    const regex = /"[^"]*"|'[^']*'|\d+(?:\.\d+)?|==|!=|<=|>=|<|>|\+|-|\*|\/|[a-zA-Z_]\w*|\S/g
    const r = values.map(value => {
      value = value.replace(/[\r\n\t]|^\s+/g, '');
      if (value.match(/^IF (.*) THEN/)) {
        const match = value.match(/^IF (.*) THEN/)
        if (!match) return value;
        const group: string[] = match[1].match(regex) ?? [];
        return ["IF", getTree(group), "THEN"]
      } else if (value.match(/^ELSE IF (.*) THEN/)) {
        const match = value.match(/^ELSE IF (.*) THEN/)
        if (!match) return value;
        const group: string[] = match[1].match(regex) ?? [];
        return ["ELSE IF", getTree(group), "THEN"]
      } else if (value.match(/^WHILE (.*)/)) {
        const match = value.match(/^WHILE (.*)/)
        if (!match) return value;
        const group: string[] = match[1].match(regex) ?? [];
        return ["WHILE", getTree(group)]
      } else if (value.match(/^UNTIL (.*)/)) {
        const match = value.match(/^UNTIL (.*)/)
        if (!match) return value;
        const group: string[] = match[1].match(regex) ?? [];
        return ["UNTIL", getTree(group)]
      } else if (value.match(/^CASEWHERE (.*)/)) {
        const match = value.match(/^CASEWHERE (.*)/)
        if (!match) return value;
        const group: string[] = match[1].match(regex) ?? [];
        return ["CASEWHERE", getTree(group)]
      } else if (value.match(/^display (.*)/)) {
        const match = value.match(/^display (.*)/)
        if (!match) return value;
        const group: string[] = match[1].match(regex) ?? [];
        return ["display", getTree(group)]
      } else if (value.match(/^FOR (.*)=(.*) to (.*) STEP (.*)/)) {
        const match = value.match(/^FOR (.*)=(.*) to (.*) STEP (.*)/)
        if (!match) return value;
        const group1: string[] = match[1].match(regex) ?? [];
        const group2: string[] = match[2].match(regex) ?? [];
        const group3: string[] = match[3].match(regex) ?? [];
        const group4: string[] = match[4].match(regex) ?? [];
        return ["FOR", getTree(group1), "=", getTree(group2), "to", getTree(group3), "STEP", getTree(group4)]
      } else if (value.match(/^\s*([a-zA-Z_]\w*) = (.*)/)) {
        const match = value.match(/^\s*([a-zA-Z_]\w*) = (.*)/)
        if (!match) return value;
        const group1: string = match[1];
        const group2: string[] = match[2].match(regex) ?? [];
        return [[group1], "=", getTree(group2)]
      } else {
        return value;
      }
    })
    console.log(r);

  };

  return (
    <>
      <MonacoEditor
        height="90vh"
        defaultLanguage={languageId}
        defaultValue={typeof window !== 'undefined' ? localStorage.getItem('editorContent') || '' : ''}
        theme="myCustomTheme"
        onMount={handleEditorDidMount}
        onChange={(value) => {
          if (typeof window !== 'undefined' && value !== undefined) {
            localStorage.setItem('editorContent', value);
          }
        }}
      />
      <button onClick={getEditorContents}
        style={{
          zIndex:999,
          backgroundColor: "white",
          bottom: 0,
          width: 100,
          height: 30,
        }}
      ></button>
    </>
  );
}

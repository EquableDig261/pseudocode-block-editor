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

  

  return (
    <>
      <MonacoEditor
        className="h-full"
        defaultLanguage={languageId}
        defaultValue={typeof window !== 'undefined' ? localStorage.getItem('editorContent') || '' : ''}
        theme="myCustomTheme"
        onMount={handleEditorDidMount}
        onChange={(value) => {
          if (typeof window !== 'undefined' && value !== undefined) {
            console.log(value);
            localStorage.setItem('editorContent', value);
          }
        }}
      />
    </>
  );
}

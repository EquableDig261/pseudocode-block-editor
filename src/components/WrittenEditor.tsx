'use client';

import React, { useRef, useState, useEffect } from 'react';
import { POSSIBLE_LINE_PATTERNS, BOX_TYPES } from './constants';
import dynamic from 'next/dynamic';
import type * as MonacoEditorType from 'monaco-editor';

// Dynamically load MonacoEditor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react').then(mod => mod.default), {
  ssr: false,
});

const languageId = 'mylang';

const keywords = [
  "IF", "ELSE", "THEN", "BEGIN", "END", "WHILE", "FOR", "STEP", "NEXT", "to", "ENDWHILE", "ENDIF", "display", "get", "REPEAT", "UNTIL", "AND", "OR", "NOT", "true", "false"
];

// Simple syntax error checker - now accepts a monaco instance
function checkSyntaxErrors(code: string, monacoInstance: typeof MonacoEditorType): MonacoEditorType.editor.IMarkerData[] {
  const errors: MonacoEditorType.editor.IMarkerData[] = [];
  const lines = code.split('\n');

  let currentExpectedIndentation = 0

  lines.forEach((line, lineIndex) => {
    const lineNumber = lineIndex + 1;
    const trimmedLine = line.trim().toUpperCase();

    // Check for unclosed strings
    const stringMatches = line.match(/"/g);
    if (stringMatches && stringMatches.length % 2 !== 0) {
      errors.push({
        startLineNumber: lineNumber,
        startColumn: line.lastIndexOf('"') + 1,
        endLineNumber: lineNumber,
        endColumn: line.length + 1,
        message: 'Unclosed string literal',
        severity: monacoInstance.MarkerSeverity.Error,
      });
    }
    let cleaned = line.replace(/\u00A0|\u2003|\u2002|\u2009/g, ' ');
    cleaned = line.replace(/\t/g, '    ');
    const matchResult = cleaned.match(/^\s*/);
    const whitespaceArray = matchResult && typeof matchResult[0] === "string" ? matchResult[0].split("") : "";
    const indent = Math.ceil(whitespaceArray.length / 4)
    const pattern = POSSIBLE_LINE_PATTERNS.find(pattern => line.trim().match(pattern.pattern))
    if (pattern !== undefined) {
      if (pattern.type === BOX_TYPES.END_WRAPPER || pattern.type === BOX_TYPES.MID_WRAPPER) {
        currentExpectedIndentation -= 1
      }
      if (indent !== currentExpectedIndentation) {
        errors.push({
          startLineNumber: lineNumber,
          startColumn: 1,
          endLineNumber: lineNumber,
          endColumn: line.length + 1,
          message: 'Incorrect Indentation: Expected ' + currentExpectedIndentation.toString(),
          severity: monacoInstance.MarkerSeverity.Error,
        });
      }
      if (pattern.type === BOX_TYPES.WRAPPER || pattern.type === BOX_TYPES.MID_WRAPPER) {
        currentExpectedIndentation += 1
      }
    }
    else if (line.trim() !== ""){
      errors.push({
        startLineNumber: lineNumber,
        startColumn: 1,
        endLineNumber: lineNumber,
        endColumn: line.length + 1,
        message: 'Unknown Statement',
        severity: monacoInstance.MarkerSeverity.Error,
      });
    }

    // Check for IF without THEN
    if (trimmedLine.startsWith('IF ') && !trimmedLine.includes(' THEN')) {
      errors.push({
        startLineNumber: lineNumber,
        startColumn: 1,
        endLineNumber: lineNumber,
        endColumn: line.length + 1,
        message: 'IF statement missing THEN keyword',
        severity: monacoInstance.MarkerSeverity.Error,
      });
    }
  });

  return errors;
}

export default function WrittenEditor() {
  const editorRef = useRef<MonacoEditorType.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof MonacoEditorType | null>(null);
  const [editorContent, setEditorContent] = useState<string>(''); // State for editor content

  // Effect to load content from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedContent = localStorage.getItem('editorContent');
      if (savedContent) {
        setEditorContent(savedContent);
      }
    }
  }, []); // Empty dependency array means this runs once on mount

  const updateSyntaxErrors = (editor: MonacoEditorType.editor.IStandaloneCodeEditor, code: string) => {
    const model = editor.getModel();
    if (model && monacoRef.current) {
      const errors = checkSyntaxErrors(code, monacoRef.current);
      monacoRef.current.editor.setModelMarkers(model, 'syntaxErrors', errors);
    }
  };

  // Function to define language and theme BEFORE editor mounts
  const handleEditorBeforeMount = (monaco: typeof MonacoEditorType) => {
    monacoRef.current = monaco; // Store the monaco instance here as well

    // Define theme as early as possible - before the editor fully mounts
    monaco.editor.defineTheme('myCustomTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '00bbec', fontStyle: 'bold' },
        { token: 'identifier', foreground: '7c9fd4'},
        { token: 'number', foreground: '83dd7f' },
        { token: 'string', foreground: 'b2db9a' },
        { token: 'boolean', foreground: '87eb8b' },
        { token: 'comment', foreground: '979695'}
      ],
      colors: {
        // Customize theme further if needed
      },
    });

    // Register language, tokenizer, completion provider, and configuration
    // This runs before the editor instance is created
    if (!monaco.languages.getLanguages().some(lang => lang.id === languageId)) {
      monaco.languages.register({ id: languageId });

      monaco.languages.setMonarchTokensProvider(languageId, {
        tokenizer: {
          root: [
            [/\b(IF|ELSE|THEN|BEGIN|END|WHILE|FOR|STEP|NEXT|to|ENDWHILE|ENDIF|display|get|REPEAT|UNTIL|AND|OR|NOT|length|of|is)\b/, 'keyword'],
            [/\b(true|false)\b/, "boolean"],
            [/[a-z_$][\w$]*/, 'identifier'],
            [/\d+/, 'number'],
            [/=/, 'operator'],
            [/".*?"/, 'string'],
            [/\s+/, 'white'],
            [/\/\/.*/, "comment"]
          ],
        },
      });

      monaco.languages.registerCompletionItemProvider(languageId, {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range: MonacoEditorType.IRange = {
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
              insertText: 'IF $0 THEN\nENDIF',
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

      monaco.languages.setLanguageConfiguration(languageId, {
        brackets: [['{', '}'], ['[', ']'], ['(', ')']],
        autoClosingPairs: [
          { open: '{', close: '}' },
          { open: '[', close: ']'},
          { open: '(', close: ')' },
          { open: '"', close: '"', notIn: ['string'] },
        ],
        onEnterRules: [
          {
            beforeText: /(IF|WHILE|REPEAT|BEGIN|FOR)\b/i,
            action: { indentAction: monaco.languages.IndentAction.Indent }
          },
        ],
      });
    }
  };

  const handleEditorDidMount = (editor: MonacoEditorType.editor.IStandaloneCodeEditor): void => {
    editorRef.current = editor;

    // Check syntax errors on initial load with the current content from state
    updateSyntaxErrors(editor, editorContent);
  };

  const handleEditorChange = (value: string | undefined) => {
    const newContent = value || '';
    setEditorContent(newContent); // Update state
    if (typeof window !== 'undefined') {
      localStorage.setItem('editorContent', newContent); // Save to localStorage
    }
    if (editorRef.current) {
      updateSyntaxErrors(editorRef.current, newContent);
    }
  };

  return (
    <>
      <MonacoEditor
        className="h-full"
        language={languageId}
        value={editorContent}
        theme="myCustomTheme"
        beforeMount={handleEditorBeforeMount} // Use beforeMount for theme and language setup
        onMount={handleEditorDidMount}
        onChange={handleEditorChange}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          scrollBeyondLastLine: false,
        }}
      />
    </>
  );
}
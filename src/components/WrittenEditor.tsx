'use client';

import React, { useRef, useState, useEffect } from 'react';
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

  const blockStack: Array<{ keyword: string, line: number }> = [];
  const blockPairs = {
    'IF': 'ENDIF',
    'WHILE': 'ENDWHILE',
    'FOR': 'NEXT',
    'REPEAT': 'UNTIL',
    'BEGIN': 'END'
  };

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

    // Check for invalid variable names (starting with numbers)
    const invalidVarMatches = line.match(/\b\d+[a-zA-Z_]\w*/g);
    if (invalidVarMatches) {
      invalidVarMatches.forEach(match => {
        const startCol = line.indexOf(match) + 1;
        errors.push({
          startLineNumber: lineNumber,
          startColumn: startCol,
          endLineNumber: lineNumber,
          endColumn: startCol + match.length,
          message: 'Invalid identifier: cannot start with a number',
          severity: monacoInstance.MarkerSeverity.Error,
        });
      });
    }

    // Track block structures for matching
    Object.keys(blockPairs).forEach(startKeyword => {
      if (trimmedLine.startsWith(startKeyword + ' ') || trimmedLine === startKeyword) {
        blockStack.push({ keyword: startKeyword, line: lineNumber });
      }
    });

    // Check for block endings
    Object.values(blockPairs).forEach(endKeyword => {
      if (trimmedLine.startsWith(endKeyword) || trimmedLine === endKeyword) {
        const expectedStart = Object.keys(blockPairs).find(key => blockPairs[key as keyof typeof blockPairs] === endKeyword);

        if (blockStack.length === 0) {
          errors.push({
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: endKeyword.length + 1,
            message: `Unexpected ${endKeyword}: no matching block start`,
            severity: monacoInstance.MarkerSeverity.Error,
          });
        } else {
          const lastBlock = blockStack.pop();
          if (lastBlock?.keyword !== expectedStart) {
            errors.push({
              startLineNumber: lineNumber,
              startColumn: 1,
              endLineNumber: lineNumber,
              endColumn: endKeyword.length + 1,
              message: `Mismatched block: expected ${blockPairs[lastBlock?.keyword as keyof typeof blockPairs] || 'unknown'} but found ${endKeyword}`,
              severity: monacoInstance.MarkerSeverity.Error,
            });
          }
        }
      }
    });

    // Check for empty display statements
    if (trimmedLine === 'DISPLAY' || trimmedLine === 'DISPLAY ') {
      errors.push({
        startLineNumber: lineNumber,
        startColumn: 1,
        endLineNumber: lineNumber,
        endColumn: line.length + 1,
        message: 'DISPLAY statement requires an argument',
        severity: monacoInstance.MarkerSeverity.Warning,
      });
    }

    // Check for assignment without operator
    if (line.includes('=') && !line.match(/\w+\s*=\s*\w+/)) {
      const equalPos = line.indexOf('=');
      if (equalPos > 0 && equalPos < line.length - 1) {
        const beforeEqual = line.substring(0, equalPos).trim();
        const afterEqual = line.substring(equalPos + 1).trim();

        if (!beforeEqual || !afterEqual) {
          errors.push({
            startLineNumber: lineNumber,
            startColumn: equalPos + 1,
            endLineNumber: lineNumber,
            endColumn: equalPos + 2,
            message: 'Incomplete assignment statement',
            severity: monacoInstance.MarkerSeverity.Warning,
          });
        }
      }
    }
  });

  // Check for unclosed blocks
  blockStack.forEach(block => {
    const expectedEnd = blockPairs[block.keyword as keyof typeof blockPairs];
    errors.push({
      startLineNumber: block.line,
      startColumn: 1,
      endLineNumber: block.line,
      endColumn: block.keyword.length + 1,
      message: `Unclosed ${block.keyword} block: missing ${expectedEnd}`,
      severity: monacoInstance.MarkerSeverity.Error,
    });
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
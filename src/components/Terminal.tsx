'use client';

import {
  useImperativeHandle,
  useState,
  useRef,
  useEffect,
  forwardRef,
} from 'react';
import { interpret } from './interpretation';

export type TerminalHandle = {
  runCode: () => void;
  getInputLine: (prompt: string) => Promise<string>;
};

const Terminal = forwardRef<TerminalHandle>((_, ref) => {
  const [lines, setLines] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputResolver = useRef<((value: string) => void) | null>(null);

  const handleCommand = (cmd: string): string[] => {
    switch (cmd.trim().toLowerCase()) {
      case 'help':
        return ['Available commands: help, clear, echo'];
      case 'clear':
        setLines([]);
        return [];
      case '':
        return [];
      default:
        return [`Unknown command: ${cmd}`];
    }
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const value = input;

    if (waitingForInput && inputResolver.current) {
      setLines(prev => [...prev, `${prompt ?? '>'} ${value}`]);
      inputResolver.current(value);
      inputResolver.current = null;
      setWaitingForInput(false);
      setPrompt(null);
      setInput('');
      return;
    }

    const newLine = `> ${input}`;
    const output = handleCommand(input);
    setLines((prev) => [...prev, newLine, ...output]);
    setInput('');
  };

  const scrollToBottom = () => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Expose runCode and getInputLine to parent
  // Define getInputLine as a function so it can be referenced
  const getInputLine = (promptText: string) => {
    setPrompt(promptText);
    setWaitingForInput(true);
    setInput('');
    inputRef.current?.focus();

    return new Promise<string>((resolve) => {
      inputResolver.current = resolve;
    });
  };

  useImperativeHandle(ref, () => ({
    runCode() {
      interpret(setLines, getInputLine);
    },
    getInputLine,
  }));

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-black text-white-500 font-mono p-4 h-48 overflow-y-auto border-t border-black z-50"
      onClick={() => inputRef.current?.focus()}
      ref={containerRef}
      style={{ zIndex: 99999 }}
    >
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}

      <form onSubmit={handleInputSubmit} className="flex mt-2">
        <span>{prompt ?? '>'}&nbsp;</span>
        <input
          ref={inputRef}
          className="bg-black text-white-500 outline-none flex-grow"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoComplete="off"
        />
      </form>
    </div>
  );
});

Terminal.displayName = 'Terminal';
export default Terminal;

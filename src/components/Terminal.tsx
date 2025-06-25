"use client"

import type React from "react"

import { useImperativeHandle, useState, useRef, useEffect, forwardRef } from "react"
import { interpret } from "./interpretation"
import { TerminalIcon, Zap } from "lucide-react"
import { BOX_TYPES, POSSIBLE_LINE_PATTERNS } from "./constants"

export type TerminalHandle = {
  runCode: () => void
  getInputLine: (prompt: string) => Promise<string>
}

const Terminal = forwardRef<TerminalHandle>((_, ref) => {
  const [lines, setLines] = useState<string[]>([
    "🚀 Pseudocode Terminal Ready",
    'Type "help" for available commands or click "Run" to execute your code.',
    "",
  ])
  const [input, setInput] = useState("")
  const [waitingForInput, setWaitingForInput] = useState(false)
  const [prompt, setPrompt] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  // New state to signal stopping the interpreter
  const stopRequested = useRef<boolean>(false);
  const stopResolver = useRef<(() => void) | null>(null); // To resolve the promise that indicates stopping

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputResolver = useRef<((value: string) => void) | null>(null)

  // Function to signal the interpreter to stop
  const signalStop = () => {
    stopRequested.current = true;
    if (stopResolver.current) {
      stopResolver.current(); // Resolve the promise that the interpreter might be awaiting for stop signal
      stopResolver.current = null;
    }
    // If waiting for input, resolve that as well with a special value or reject
    if (waitingForInput && inputResolver.current) {
      inputResolver.current("STOP_COMMAND_ISSUED"); // Special value to indicate stop
      inputResolver.current = null;
    }
  };

  const handleCommand = (cmd: string): string[] => {
    const command = cmd.trim().toLowerCase()
    switch (command) {
      case "help":
        return [
          "📋 Available Commands:",
          "  • help     - Show this help message",
          "  • clear    - Clear the terminal",
          "  • run      - Execute your pseudocode",
          "  • stop     - Stop the currently running pseudocode", // Added stop command
          "",
        ]
      case "clear":
        setLines([])
        return []
      case "run":
        if (isRunning) {
          return ["⚠️ Pseudocode is already running. Type 'stop' to halt it.", ""];
        }
        let currentExpectedIndentation = 0

        let codeLines: string|string[]|null = localStorage.getItem("editorContent")
        if (codeLines !== null) {
          codeLines = codeLines.split("\n")
          const errors: string[] = []; // Array to collect errors

          for (let lineIndex = 0; lineIndex < codeLines.length; lineIndex++) {
            const line = codeLines[lineIndex];
            const lineNumber = lineIndex + 1;
            const trimmedLine = line.trim().toUpperCase();
            
            // Check for unclosed strings
            const stringMatches = line.match(/"/g);
            if (stringMatches && stringMatches.length % 2 !== 0) {
              errors.push("⚠️ Syntax Error on Line " + lineNumber);
              errors.push('Unclosed string literal');
              break; // Stop checking further if a critical error is found
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
                errors.push("⚠️ Syntax Error on Line " + lineNumber);
                errors.push('Incorrect Indentation: Expected ' + currentExpectedIndentation.toString());
                break; // Stop checking further
              }
              if (pattern.type === BOX_TYPES.WRAPPER || pattern.type === BOX_TYPES.MID_WRAPPER) {
                currentExpectedIndentation += 1
              }
            }
            else if (line.trim() !== ""){
              errors.push("⚠️ Syntax Error on Line " + lineNumber);
              errors.push('Unknown Statement');
              break; // Stop checking further
            }
            
            // Check for IF without THEN
            if (trimmedLine.startsWith('IF ') && !trimmedLine.includes(' THEN')) {
              errors.push("⚠️ Syntax Error on Line " + lineNumber);
              errors.push('IF statement missing THEN keyword');
              break; // Stop checking further
            }
          }

          if (errors.length > 0) {
            return errors; // Return all collected errors
          }
        }

        setIsRunning(true)
        stopRequested.current = false; // Reset stop request
        // Wrap interpretation in a promise so we can await its completion
        const runPromise = new Promise<void>(async (resolve) => {
          try {
            await interpret(setLines, getInputLine, () => stopRequested.current); // Pass the check for stop
            setLines((prev) => [...prev, "", "Execution finished."]);
          } catch (error: any) {
            if (error.message === "Execution stopped by user.") {
              setLines((prev) => [...prev, "", "Execution stopped by user."]);
            } else {
              setLines((prev) => [...prev, "", `Error during execution: ${error.message}`]);
            }
          } finally {
            setIsRunning(false);
            resolve();
          }
        });

        // This allows `handleInputSubmit` to know if interpretation is active.
        // It's not about waiting for `runPromise` here, but setting up the execution context.
        return ["🔄 Executing pseudocode...", ""]
      case "stop":
        if (isRunning) {
          signalStop();
        } else {
          return ["No pseudocode is currently running.", ""];
        }
      case "":
        return []
      default:
        return [`Unknown command: "${cmd}"`, 'Type "help" for available commands.', ""]
    }
  }

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const value = input

    // If waiting for input from the interpreter
    if (waitingForInput && inputResolver.current) {
      setLines((prev) => [...prev, `${prompt ?? "❯"} ${value}`])
      inputResolver.current(value)
      inputResolver.current = null
      setWaitingForInput(false)
      setPrompt(null)
      setInput("")
      return
    }

    // Handle regular terminal commands
    const newLine = `❯ ${input}`
    const output = handleCommand(input)
    setLines((prev) => [...prev, newLine, ...output])
    setInput("")
  }

  const scrollToBottom = () => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    })
  }

  useEffect(() => {
    scrollToBottom()
  }, [lines])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Define getInputLine as a function so it can be referenced
  const getInputLine = (promptText: string) => {
    setPrompt(promptText)
    setWaitingForInput(true)
    setInput("")
    inputRef.current?.focus()

    return new Promise<string>((resolve) => {
      inputResolver.current = resolve
    })
  }

  useImperativeHandle(ref, () => ({
    runCode() {
      // Trigger the "run" command programmatically
      const output = handleCommand("run");
      setLines((prev) => [...prev, ...output]);
    },
    getInputLine,
  }))

  return (
    <div className="border-t border-slate-700 bg-slate-900">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-1 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <TerminalIcon className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Terminal</span>
          {isRunning && (
            <div className="flex items-center space-x-1 text-xs text-blue-400">
              <Zap className="w-3 h-3 animate-pulse" />
              <span>Running</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setLines([])
            }}
            className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1 rounded hover:bg-slate-700 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div
        ref={containerRef}
        onClick={() => inputRef.current?.focus()}
        className="h-48 overflow-y-auto p-4 bg-slate-950 font-mono text-sm cursor-text"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#475569 #0f172a",
        }}
      >
        {/* Terminal Lines */}
        <div className="space-y-1">
          {lines.map((line, i) => (
            <div
              key={i}
              className={`${"text-slate-300"}`}
            >
              {line || "\u00A0"}
            </div>
          ))}
        </div>

        {/* Input Line */}
        <form onSubmit={handleInputSubmit} className="flex items-center mt-2">
          <span className={`${waitingForInput ? "text-yellow-400" : "text-green-400"} mr-2`}>{prompt ?? "❯"}</span>
          <input
            ref={inputRef}
            className="bg-transparent text-slate-100 outline-none flex-grow placeholder-slate-500 caret-green-400"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            placeholder={waitingForInput ? "Enter your input..." : "Type a command..."}
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            }}
          />
        </form>

        {/* Cursor Blink Effect */}
        <style jsx>{`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
          .caret-green-400 {
            caret-color: #4ade80;
          }
        `}</style>
      </div>
    </div>
  )
})

Terminal.displayName = "Terminal"
export default Terminal

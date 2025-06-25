"use client"

import type React from "react"

import { useImperativeHandle, useState, useRef, useEffect, forwardRef } from "react"
import { interpret } from "./interpretation"
import { TerminalIcon, Zap } from "lucide-react"

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

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputResolver = useRef<((value: string) => void) | null>(null)

  const handleCommand = (cmd: string): string[] => {
    console.log(lines)
    const command = cmd.trim().toLowerCase()
    switch (command) {
      case "help":
        return [
          "📋 Available Commands:",
          "  • help     - Show this help message",
          "  • clear    - Clear the terminal",
          "  • run      - Execute your pseudocode",
          "  • version  - Show version info",
          "",
        ]
      case "clear":
        setLines([])
        return []
      case "run":
        interpret(setLines, getInputLine)
        return ["🔄 Executing pseudocode...", ""]
      case "version":
        return ["📦 Pseudocode Editor v1.0.0", ""]
      case "":
        return []
      default:
        return [`❌ Unknown command: "${cmd}"`, 'Type "help" for available commands.', ""]
    }
  }

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const value = input

    if (waitingForInput && inputResolver.current) {
      setLines((prev) => [...prev, `${prompt ?? "❯"} ${value}`])
      inputResolver.current(value)
      inputResolver.current = null
      setWaitingForInput(false)
      setPrompt(null)
      setInput("")
      return
    }

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
      setIsRunning(true)
      setLines((prev) => [...prev, "🚀 Running pseudocode...", ""])
      interpret(setLines, getInputLine)
      setTimeout(() => setIsRunning(false), 1000)
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
              className={`${
                line.startsWith("❌")
                  ? "text-red-400"
                  : line.startsWith("🚀") || line.startsWith("🔄")
                    ? "text-blue-400"
                    : line.startsWith("📋") || line.startsWith("📦")
                      ? "text-cyan-400"
                      : line.startsWith("❯")
                        ? "text-green-400"
                        : "text-slate-300"
              }`}
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

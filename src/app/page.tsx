"use client"

import WrittenEditor from "@/components/WrittenEditor"
import BlockEditor from "@/components/BlockEditor/index"
import Terminal from "@/components/Terminal"
import { useRef, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Play, Settings, FileText, Blocks, Code2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

type TerminalHandle = {
  runCode: () => void
  getInputLine: (prompt: string) => Promise<string>
}

export default function Home() {
  const [isBlockView, setIsBlockView] = useState(false)
  const terminalRef = useRef<TerminalHandle | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem("isBlockView")
    if (stored === "true") setIsBlockView(true)
  }, [])

  useEffect(() => {
    localStorage.setItem("isBlockView", isBlockView ? "true" : "false")
  }, [isBlockView])

  const handleRun = () => {
    terminalRef.current?.runCode()
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Pseudocode Editor</h1>
              <p className="text-sm text-slate-400">HSC NESA Syntax Compatible</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            {/* View Toggle */}
            <div className="flex items-center bg-slate-800 rounded-lg p-1">
              <Button
                variant={!isBlockView ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setIsBlockView(false)}
                className={`h-8 px-3 ${
                  !isBlockView
                    ? "bg-slate-700 text-white shadow-sm hover:bg-slate-500"
                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                <FileText className="w-4 h-4 mr-2" />
                Written
              </Button>
              <Button
                variant={isBlockView ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setIsBlockView(true)}
                className={`h-8 px-3 ${
                  isBlockView
                    ? "bg-slate-700 text-white shadow-sm hover:bg-slate-500"
                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                <Blocks className="w-4 h-4 mr-2" />
                Blocks
              </Button>
            </div>

            <Separator orientation="vertical" className="h-8 bg-slate-700" />

            {/* Settings Button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 text-slate-400 hover:text-white hover:bg-slate-800"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>

            {/* Run Button */}
            <Button
              onClick={handleRun}
              className="h-9 px-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-medium shadow-lg hover:shadow-green-500/25 transition-all duration-200"
              title="Run Code"
            >
              <Play className="w-4 h-4 mr-2 fill-current" />
              Run
            </Button>
          </div>
        </div>
      </header>

      {/* Main Editor Area */}
      <div className="flex-1 relative overflow-hidden bg-slate-950">
        <AnimatePresence mode="wait">
          {isBlockView ? (
            <motion.div
              key="block"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="absolute inset-0 bg-slate-950"
            >
              <div className="h-full border-r border-slate-800">
                <BlockEditor />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="written"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="absolute inset-0 bg-slate-950"
            >
              <div className="h-full border-r border-slate-800">
                <WrittenEditor />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Indicator
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center space-x-2 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-1.5">
            {isBlockView ? (
              <>
                <Blocks className="w-3 h-3 text-purple-400" />
                <span className="text-xs font-medium text-slate-300">Block View</span>
              </>
            ) : (
              <>
                <FileText className="w-3 h-3 text-blue-400" />
                <span className="text-xs font-medium text-slate-300">Written View</span>
              </>
            )}
          </div>
        </div> */}
      </div>

      {/* Terminal Section */}
      <div className="border-t border-slate-800 bg-slate-900">
        <Terminal ref={terminalRef} />
      </div>
    </div>
  )
}
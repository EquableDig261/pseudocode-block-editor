"use client"

import type React from "react"

import WrittenEditor from "@/components/WrittenEditor"
import BlockEditor from "@/components/BlockEditor/index"
import Terminal from "@/components/Terminal"
import { useRef, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Play, FileText, Blocks, Code2, Upload, Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

type TerminalHandle = {
  runCode: () => void
  getInputLine: (prompt: string) => Promise<string>
}

export default function Home() {
  const [isBlockView, setIsBlockView] = useState(false)
  const terminalRef = useRef<TerminalHandle | null>(null)
  const [showFileModal, setShowFileModal] = useState(false)

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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "text/plain") {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        localStorage.setItem("editorContent", content)
        // Trigger a page reload to refresh the editor with new content
        window.location.reload()
      }
      reader.readAsText(file)
    } else {
      alert("Please select a valid .txt file")
    }
  }

  const handleFileDownload = () => {
    const content = localStorage.getItem("editorContent") || ""
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "pseudocode.txt"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
                    ? "bg-slate-700 text-white shadow-sm"
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
                    ? "bg-slate-700 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                <Blocks className="w-4 h-4 mr-2" />
                Blocks
              </Button>
            </div>

            <Separator orientation="vertical" className="h-8 bg-slate-700" />

            {/* File Management Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFileModal(true)}
              className="h-9 px-3 text-slate-400 hover:text-white hover:bg-slate-800"
              title="File Management"
            >
              <Upload className="w-4 h-4" />
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

        {/* View Indicator */}
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
        </div>
      </div>

      {/* Terminal Section */}
      <div className="border-t border-slate-800 bg-slate-900">
        <Terminal ref={terminalRef} />
      </div>

      {/* File Management Modal */}
      {showFileModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-99999 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">File Management</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFileModal(false)}
                className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-400">
                Upload or download your pseudocode files to save and share your work.
              </p>

              {/* Upload Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-white">Upload File</h3>
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center hover:border-slate-500 transition-colors">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 mb-3">Select a .txt file to upload</p>
                  <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" id="file-upload" />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors"
                  >
                    Choose File
                  </label>
                </div>
              </div>

              {/* Download Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-white">Download File</h3>
                <Button onClick={handleFileDownload} className="w-full bg-green-600 hover:bg-green-500 text-white">
                  <Download className="w-4 h-4 mr-2" />
                  Download pseudocode.txt
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

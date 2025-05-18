"use client";

import WrittenEditor from "@/components/WrittenEditor";
import BlockEditor from "@/components/BlockEditor";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [isBlockView, setIsBlockView] = useState(false);

  const toggleView = () => {
    console.log(localStorage.getItem("editorContent"))
    setIsBlockView((prev) => !prev)
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="text-white px-4 py-1.5 flex items-center justify-between" style={{backgroundColor: "#161616"}}>
        <h1 className="text-lg font-bold">Software Pseudocode Project!</h1>
        <div className="flex space-x-2">
          {/* Toggle Button */}
          <button
            onClick={toggleView}
            className="bg-gray-700 hover:bg-gray-600 px-5 py-3 rounded text-lg"
            title={isBlockView ? "Switch to Written View" : "Switch to Block View"}
          >
            {isBlockView ? "📄" : "🧩"}
          </button>

          {/* Settings Button */}
          <button
            className="bg-gray-700 hover:bg-gray-600 px-5 py-3 rounded text-lg"
            title="Settings"
          >
            ⚙️
          </button>

          {/* Run Button */}
          <button
            className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded text-lg"
            title="Run"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Main content area with animated view switching */}
      <div className="flex-1 overflow-auto relative" style={{backgroundColor: "#1e1e1e"}}>
        <AnimatePresence mode="wait">
          {isBlockView ? (
            <motion.div
              key="block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="absolute inset-0"
              style={{backgroundColor: "#1e1e1e"}}
            >
              <BlockEditor />
            </motion.div>
          ) : (
            <motion.div
              key="written"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="absolute inset-0"
              style={{backgroundColor: "#1e1e1e"}}
            >
              <WrittenEditor />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

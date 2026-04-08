'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { useBackendSocket } from '@/hooks/useBackendSocket'
import { Send, Mic, Play } from 'lucide-react'

const ChatPanel = () => {
  const { agentTranscript, isStreaming } = useStore()
  const { queryNL } = useBackendSocket()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [agentTranscript])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    queryNL(input)
    setInput('')
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Transcript Area */}
      <AnimatePresence mode="wait">
        {(agentTranscript || isStreaming) && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="glass-dark p-6 rounded-2xl border-white/5 shadow-2xl overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 p-2">
               <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            </div>
            
            <h4 className="text-[10px] font-bold tracking-[0.2em] text-secondary mb-3 uppercase">AI Response Stream</h4>
            
            <div 
              ref={scrollRef}
              className="max-h-[250px] overflow-y-auto text-sm leading-relaxed text-white/90 font-light pr-2"
            >
              {agentTranscript}
              {isStreaming && <span className="inline-block w-1.5 h-4 bg-primary/40 ml-1 animate-pulse align-middle" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <form 
        onSubmit={handleSubmit}
        className="glass p-2 rounded-full flex items-center gap-2 group focus-within:border-primary/30 transition-all duration-500"
      >
        <button 
          type="button" 
          className="p-3 rounded-full hover:bg-white/5 text-primary/60 hover:text-primary transition-colors"
        >
          <Mic size={18} />
        </button>
        
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Query the risk agent..."
          className="bg-transparent flex-1 outline-none text-sm placeholder:text-white/20 font-light"
        />

        <button 
          type="submit"
          disabled={isStreaming}
          className="bg-primary/10 hover:bg-primary/20 text-primary p-3 rounded-full transition-all active:scale-95 disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  )
}

export default ChatPanel

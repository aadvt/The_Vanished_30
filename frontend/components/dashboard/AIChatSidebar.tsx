'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageSquare, 
  Send, 
  Mic, 
  MicOff, 
  X, 
  ChevronLeft, 
  ChevronRight,
  User,
  Bot,
  Activity,
  History,
  Trash2
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useVoicePipeline } from '@/hooks/useVoicePipeline'

const AIChatSidebar = () => {
  const { 
    isChatOpen, 
    setIsChatOpen, 
    messages, 
    addMessage, 
    voiceStatus, 
    audioLevel,
    isStreaming
  } = useStore()
  
  const { startListening, stopListening, processTranscript } = useVoicePipeline()
  const [inputValue, setInputValue] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isStreaming])

  const handleSend = async () => {
    if (!inputValue.trim()) return
    const text = inputValue.trim()
    setInputValue('')
    
    // Process via the shared intelligence engine (handles map flying, risk metrics, etc.)
    await processTranscript(text)
  }

  const handleVoiceToggle = () => {
    if (voiceStatus !== 'idle') {
      stopListening()
    } else {
      startListening()
    }
  }

  return (
    <>
      {/* COLLAPSED TAB */}
      <AnimatePresence>
        {!isChatOpen && (
          <motion.button
            initial={{ x: -100 }}
            animate={{ x: 0 }}
            exit={{ x: -100 }}
            onClick={() => setIsChatOpen(true)}
            className="fixed left-0 top-1/2 -translate-y-1/2 bg-[#0f4d23] text-white p-3 rounded-r-2xl shadow-xl pointer-events-auto z-[60] flex flex-col items-center gap-2"
          >
            <MessageSquare size={20} />
            <span className="text-[10px] font-bold uppercase vertical-text tracking-widest py-2">AI CHAT</span>
            <ChevronRight size={16} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* FULL SIDEBAR */}
      <motion.div
        initial={false}
        animate={{ x: isChatOpen ? 0 : -420 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-24 left-6 bottom-40 w-[380px] bg-white/95 backdrop-blur-xl border border-[#0f4d2320] rounded-3xl z-[60] shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
      >
        {/* HEADER */}
        <div className="p-5 border-b border-[#0f4d2310] flex items-center justify-between bg-[#0f4d2305]">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl transition-colors ${voiceStatus !== 'idle' ? 'bg-red-500 text-white animate-pulse' : 'bg-[#0f4d23] text-yellow-400'}`}>
              <Bot size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0f4d23] font-headline uppercase tracking-tight">Luminous Intelligence</h2>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${voiceStatus === 'idle' ? 'bg-emerald-500' : 'bg-red-500 animate-ping'}`} />
                <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wider">
                  {voiceStatus === 'listening' ? 'Listening...' : voiceStatus === 'speaking' ? 'AI is speaking' : 'Active'}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsChatOpen(false)}
            className="p-2 hover:bg-[#0f4d2310] rounded-full transition-colors text-slate-400 hover:text-[#0f4d23]"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* CHAT MESSAGES */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide"
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-10">
              <History size={48} className="text-[#0f4d23] mb-4" />
              <p className="text-xs font-medium text-[#0f4d23]">Welcome. How can I assist with your real estate strategy today?</p>
            </div>
          )}

          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-[#0f4d23] text-white rounded-tr-none' 
                  : 'bg-emerald-50 text-[#0f4d23] border border-emerald-100 rounded-tl-none font-medium'
              }`}>
                {msg.content}
              </div>
            </motion.div>
          ))}
          {isStreaming && (
            <div className="flex justify-start">
              <div className="bg-emerald-50 p-4 rounded-2xl rounded-tl-none border border-emerald-100 italic text-[10px] text-[#0f4d23]/60 flex items-center gap-2">
                <Activity size={12} className="animate-pulse" />
                Processing data models...
              </div>
            </div>
          )}
        </div>

        {/* INPUT AREA */}
        <div className="p-5 bg-slate-50 border-t border-[#0f4d2310] space-y-4">
          <div className="relative">
            <input 
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything..."
              className="w-full bg-white border border-[#0f4d2320] rounded-2xl py-3 pl-4 pr-12 text-xs focus:ring-2 focus:ring-[#0f4d23] focus:border-transparent transition-all outline-none"
            />
            <button 
              onClick={handleSend}
              className="absolute right-2 top-1.5 p-2 text-[#0f4d23] hover:bg-[#0f4d2310] rounded-xl transition-colors"
            >
              <Send size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleVoiceToggle}
              className={`flex-1 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                voiceStatus !== 'idle'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-200'
                  : 'bg-[#0f4d23] text-white hover:bg-[#082d14]'
              }`}
            >
              {voiceStatus === 'idle' ? <Mic size={14} /> : <MicOff size={14} />}
              {voiceStatus === 'idle' ? 'Start Voice AI' : 'Stop Listening'}
            </button>
            <div className="flex gap-1 h-8 items-center px-3 bg-white border border-[#0f4d2310] rounded-xl">
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    height: voiceStatus !== 'idle' ? 4 + (audioLevel * 16 * (i % 2 ? 0.5 : 1)) : 4 
                  }}
                  className="w-1 bg-[#0f4d23] rounded-full"
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}

export default AIChatSidebar

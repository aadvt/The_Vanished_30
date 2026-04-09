'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, Activity } from 'lucide-react'
import { useVoicePipeline } from '@/hooks/useVoicePipeline'
import { useStore } from '@/store/useStore'

const VoiceControl = () => {
  const { startListening, stopListening } = useVoicePipeline()
  const { voiceStatus, audioLevel } = useStore() // idle, listening, speaking

  const isActive = voiceStatus !== 'idle'

  const handleToggle = () => {
    if (isActive) {
      stopListening()
    } else {
      startListening()
    }
  }

  return (
    <div className="relative group">
      <button
        onClick={handleToggle}
        className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${
          isActive 
            ? 'bg-[#0f4d23] text-white scale-110 shadow-[#0f4d2340]' 
            : 'bg-white/90 backdrop-blur-xl text-slate-400 hover:text-[#0f4d23] hover:scale-105 border border-black/5'
        }`}
      >
        <AnimatePresence mode="wait">
          {voiceStatus === 'listening' ? (
            <motion.div
              key="listening"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              <Mic size={22} />
            </motion.div>
          ) : voiceStatus === 'speaking' ? (
            <motion.div
              key="speaking"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              <Activity size={22} className="text-green-300" />
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              <MicOff size={22} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Pulse Rings */}
        {isActive && (
          <>
            <motion.div 
              className="absolute inset-0 rounded-full border-2 border-[#0f4d23] border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />
            <div className="absolute inset-[-4px] rounded-full border border-[#0f4d2320] animate-ping" />
          </>
        )}
      </button>

      {/* Tooltip hint */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1 bg-black text-white text-[9px] font-bold uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Voice
      </div>
    </div>
  )
}

export default VoiceControl

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
    <div className="flex flex-col gap-3 bg-white/95 backdrop-blur-xl border border-black/5 p-5 rounded-2xl shadow-xl shadow-[rgba(15,77,35,0.06)]">
      <div className="flex items-center justify-between gap-10 px-1 mb-1">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Input / Output</span>
          <span className="text-[14px] mt-0.5 font-bold text-[#0f4d23]">Voice Engine</span>
        </div>
        
        <button
          onClick={handleToggle}
          className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isActive ? 'bg-[#0f4d23] shadow-md shadow-[#0f4d2340] text-white hover:bg-[#0c3a1a]' : 'bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200'
          }`}
        >
          {isActive ? <Mic size={20} /> : <MicOff size={20} />}
          
          {/* Subtle audio level animation when active */}
          {isActive && (
            <div 
              className="absolute inset-0 rounded-full border-2 border-[#0f4d23] opacity-30 animate-ping"
              style={{ animationDuration: '2s' }}
            />
          )}
        </button>
      </div>

      <div className="flex gap-3">
        <div className={`flex-1 flex flex-col items-start justify-center py-2.5 px-4 rounded-xl border transition-colors ${voiceStatus === 'listening' ? 'border-[#0f4d23]/30 bg-[#0f4d23] text-white' : 'border-slate-100 bg-slate-50 relative overflow-hidden'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <Mic size={10} className={voiceStatus === 'listening' ? 'text-white' : 'text-slate-400'} />
            <span className={`text-[10px] font-bold uppercase tracking-widest ${voiceStatus === 'listening' ? 'text-white' : 'text-slate-500'}`}>STT</span>
          </div>
          <span className={`text-[11px] font-semibold ${voiceStatus === 'listening' ? 'text-green-200' : 'text-slate-400'}`}>
            {voiceStatus === 'listening' ? 'Recording...' : 'Standby'}
          </span>
          {voiceStatus === 'listening' && (
            <motion.div 
              className="absolute bottom-0 left-0 h-0.5 bg-white"
              animate={{ width: ['0%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          )}
        </div>
        
        <div className={`flex-1 flex flex-col items-start justify-center py-2.5 px-4 rounded-xl border transition-colors ${voiceStatus === 'speaking' ? 'border-[#0f4d23]/30 bg-[#0f4d23] text-white' : 'border-slate-100 bg-slate-50 relative overflow-hidden'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <Volume2 size={10} className={voiceStatus === 'speaking' ? 'text-white' : 'text-slate-400'} />
            <span className={`text-[10px] font-bold uppercase tracking-widest ${voiceStatus === 'speaking' ? 'text-white' : 'text-slate-500'}`}>TTS</span>
          </div>
          <span className={`text-[11px] font-semibold ${voiceStatus === 'speaking' ? 'text-green-200' : 'text-slate-400'}`}>
            {voiceStatus === 'speaking' ? 'Processing...' : 'Standby'}
          </span>
          {voiceStatus === 'speaking' && (
             <motion.div 
               className="absolute bottom-0 left-0 h-0.5 bg-green-200"
               animate={{ width: ['0%', '100%'] }}
               transition={{ repeat: Infinity, duration: 1.5 }}
             />
          )}
        </div>
      </div>
    </div>
  )
}

export default VoiceControl

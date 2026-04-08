'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2 } from 'lucide-react'
import { useVoicePipeline } from '@/hooks/useVoicePipeline'
import { useStore } from '@/store/useStore'

const VoiceControl = () => {
  const { startListening, stopListening } = useVoicePipeline()
  const { voiceStatus, audioLevel } = useStore()

  const isActive = voiceStatus !== 'idle'

  const handleToggle = () => {
    if (isActive) {
      stopListening()
    } else {
      startListening()
    }
  }

  const statusLabel = {
    idle: 'Voice Off',
    listening: 'Listening…',
    speaking: 'Speaking…',
  }

  const statusColor = {
    idle: 'rgba(255,255,255,0.3)',
    listening: '#00ffff',
    speaking: '#00ff88',
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Voice Button */}
      <motion.button
        onClick={handleToggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative w-16 h-16 rounded-full flex items-center justify-center cursor-pointer border-none outline-none"
        style={{
          background: isActive 
            ? `radial-gradient(circle, ${statusColor[voiceStatus]}40, ${statusColor[voiceStatus]}10)` 
            : 'rgba(255,255,255,0.05)',
          border: `2px solid ${statusColor[voiceStatus]}`,
          boxShadow: isActive ? `0 0 30px ${statusColor[voiceStatus]}40` : 'none',
        }}
      >
        {/* Audio Level Ring */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ scale: 1, opacity: 0 }}
              animate={{ 
                scale: 1 + audioLevel * 0.5, 
                opacity: audioLevel * 0.6,
              }}
              exit={{ scale: 1, opacity: 0 }}
              className="absolute inset-0 rounded-full"
              style={{
                border: `2px solid ${statusColor[voiceStatus]}`,
                borderRadius: '50%',
              }}
            />
          )}
        </AnimatePresence>

        {/* Icon */}
        {voiceStatus === 'speaking' ? (
          <Volume2 size={24} color={statusColor[voiceStatus]} />
        ) : isActive ? (
          <Mic size={24} color={statusColor[voiceStatus]} />
        ) : (
          <MicOff size={24} color="rgba(255,255,255,0.4)" />
        )}
      </motion.button>

      {/* Status Label */}
      <motion.span
        className="text-xs font-mono"
        style={{ color: statusColor[voiceStatus] }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {statusLabel[voiceStatus]}
      </motion.span>
    </div>
  )
}

export default VoiceControl

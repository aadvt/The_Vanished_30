'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ChatPanel from './ChatPanel'
import RiskOverview from './RiskOverview'
import { useStore } from '@/store/useStore'

const HUD = () => {
  const { voiceStatus } = useStore()

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex flex-col justify-between p-6">
      {/* Top Header */}
      <header className="flex justify-between items-start pointer-events-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-dark px-4 py-2 rounded-lg border-primary/20"
        >
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            LUMINOUS <span className="font-light opacity-50 text-sm">REAL ESTATE ENGINE</span>
          </h1>
        </motion.div>

        <RiskOverview />
      </header>

      {/* Main UI Overlay */}
      <main className="flex-1 flex items-center justify-between">
         {/* Left: Chat & Controls */}
         <div className="w-1/3 h-full flex flex-col justify-end pointer-events-auto">
            <ChatPanel />
         </div>

         {/* Center: Maybe HUD crosshair or visualizers */}
         <div className="flex-1" />

         {/* Right: Detailed Analysis or Scenario controls */}
         <div className="w-1/4 h-full flex flex-col justify-end items-end pointer-events-auto">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass p-4 rounded-xl w-full"
            >
              <h3 className="text-xs font-semibold uppercase tracking-widest opacity-40 mb-3">Live Feed Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="opacity-60 text-[10px]">VOICE ENGINE</span>
                  <span className={voiceStatus !== 'idle' ? 'text-primary' : 'opacity-40'}>
                    {voiceStatus.toUpperCase()}
                  </span>
                </div>
                <div className="w-full bg-white/5 h-[1px]" />
                <div className="flex justify-between text-xs">
                  <span className="opacity-60 text-[10px]">ACTIVE SCENES</span>
                  <span>CITY, GLOBE, SCENARIO</span>
                </div>
              </div>
            </motion.div>
         </div>
      </main>

      {/* Bottom Visualizer / Status Bar */}
      <footer className="h-1 bg-white/5 w-full relative overflow-hidden">
        <motion.div 
          className="absolute inset-y-0 left-0 bg-primary/30"
          animate={{ width: ['0%', '100%'] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        />
      </footer>
    </div>
  )
}

export default HUD

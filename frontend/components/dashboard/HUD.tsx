'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import VoiceControl from '@/components/dashboard/VoiceControl'
import MetricStrip from '@/components/dashboard/MetricStrip'
import BottomDrawer from '@/components/dashboard/BottomDrawer'
import PropertyPanel from '@/components/dashboard/PropertyPanel'

const HUD = () => {
  const { selectedAssetId, setSelectedAssetId, backendStatus, flyToLocation, activeRegion } = useStore()

  const CITIES = [
    { label: 'Mumbai', lng: 72.8656, lat: 19.0658, zoom: 16.5 },
    { label: 'Delhi', lng: 77.2090, lat: 28.6139, zoom: 16.5 },
    { label: 'Bangalore', lng: 77.5946, lat: 12.9716, zoom: 16.5 },
    { label: 'Chennai', lng: 80.2707, lat: 13.0827, zoom: 16.5 },
  ]

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex flex-col font-body">
      {/* TOP NAVIGATION PILL - Matcha Light Style */}
      <nav className="fixed top-0 left-[100px] right-0 flex justify-center py-8">
        <motion.div 
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="nav-pill flex items-center gap-10 pointer-events-auto"
        >
          <div className="text-xl font-bold tracking-tighter text-[#0f4d23] font-headline">
            LUMINOUS <span className="font-light opacity-60 text-[10px] text-[#1A1D1A]">REAL ESTATE</span>
          </div>
          
          <div className="flex gap-2">
            {CITIES.map((city) => (
              <button
                key={city.label}
                onClick={() => flyToLocation(city.lng, city.lat, city.zoom, city.label)}
                className={`font-headline text-[10px] font-bold tracking-[0.15em] uppercase transition-all px-3 py-1.5 rounded-full ${
                  activeRegion === city.label
                    ? 'bg-[#0f4d23] text-white'
                    : 'text-slate-400 hover:text-[#0f4d23] hover:bg-[#0f4d2310]'
                }`}
              >
                {city.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 pl-6 border-l border-black/5">
            {/* Live backend status indicator */}
            <div className={`w-2 h-2 rounded-full ${
              backendStatus === 'connected' ? 'bg-emerald-500 animate-pulse'
              : backendStatus === 'loading' ? 'bg-amber-400 animate-pulse'
              : 'bg-red-400'
            }`} />
            <div className="bg-[#0f4d2315] text-[#0f4d23] px-4 py-1 rounded-full text-[9px] font-bold font-headline tracking-tighter border border-[#0f4d2330]">
              {backendStatus === 'connected' ? 'ENGINE LIVE' : backendStatus === 'loading' ? 'CONNECTING...' : 'OFFLINE'}
            </div>
          </div>
        </motion.div>
      </nav>

      {/* LEFT METRIC STRIP (100px rail) */}
      <MetricStrip />

      {/* RIGHT PROPERTY PANEL */}
      <PropertyPanel isOpen={!!selectedAssetId} onClose={() => setSelectedAssetId(null)} />

      {/* BOTTOM DRAWER (116px) */}
      <BottomDrawer />

      {/* VOICE ENGINE CARD */}
      <div className="fixed bottom-[140px] left-[132px] pointer-events-auto z-40">
        <VoiceControl />
      </div>
    </div>
  )
}


export default HUD

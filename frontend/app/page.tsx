'use client'

import RealityEngine from '@/components/dashboard/RealityEngine'
import HUD from '@/components/dashboard/HUD'
import LiveDataLoop from '@/components/LiveDataLoop'

export default function Home() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050505]">
      {/* 3D Visualization Layer */}
      <RealityEngine />

      {/* Interface Layer (HUD, Chat, Stats) */}
      <HUD />

      {/* Live Backend Data Loop (replaces MockDataLoop) */}
      <LiveDataLoop />

      {/* Ambient Lighting & Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-black to-transparent opacity-60" />
        <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-black to-transparent opacity-60" />
      </div>
    </div>
  )
}

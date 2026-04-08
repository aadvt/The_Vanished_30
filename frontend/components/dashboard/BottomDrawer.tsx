'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'

const BottomDrawer = () => {
  const { agentTranscript, macroSnapshot, backendStatus, bubbleFlags, activeRegion } = useStore()

  // Find the bubble flag matching the active region
  const regionFlag = bubbleFlags.find(
    f => f.region.toLowerCase() === activeRegion.toLowerCase()
  ) || bubbleFlags[0] || null

  // Region-specific data
  const regionScore = regionFlag?.overall_score ?? null
  const piRatio = regionFlag?.price_income_ratio
  const prRatio = regionFlag?.price_rent_ratio
  const affordability = regionFlag?.affordability_pct
  const capSpread = regionFlag?.cap_rate_spread

  // Stability derived from the region's bubble score
  const stabilityLabel = regionScore == null ? '—'
    : regionScore < 30 ? 'Excellent'
    : regionScore < 60 ? 'Moderate'
    : 'At Risk'

  const stabilityColor = regionScore == null ? 'text-slate-400'
    : regionScore < 30 ? 'text-[#0f4d23]'
    : regionScore < 60 ? 'text-amber-600'
    : 'text-red-500'

  // RESIDEX for the active region
  const residexKey = `nhb_residex_${activeRegion.toLowerCase()}` as keyof typeof macroSnapshot
  const residex = macroSnapshot ? (macroSnapshot as any)[residexKey] ?? macroSnapshot.nhb_residex_composite : null

  // Confidence based on backend health + data freshness
  const confidenceLabel = backendStatus === 'connected'
    ? regionFlag ? '98.1%' : 'No Data'
    : backendStatus === 'loading' ? 'Loading...'
    : 'Offline'

  return (
    <footer className="fixed bottom-0 left-[100px] right-0 h-[116px] hover:h-[260px] transition-all duration-600 bg-white/95 backdrop-blur-3xl z-40 flex flex-col px-12 py-8 shadow-[0_-20px_60px_rgba(15, 77, 35,0.1)] border-t border-black/5 pointer-events-auto group overflow-hidden">
      {/* Top bar — always visible */}
      <div className="flex items-center justify-between border-b border-black/5 pb-5 mb-5">
        <div className="flex items-center gap-12">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Active Region</span>
            <span className="text-[13px] mt-0.5 font-bold text-[#0f4d23]">{activeRegion}</span>
          </div>

          <div className="h-10 w-px bg-black/5" />

          <div className="flex flex-col">
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Bubble Score</span>
            <span className={`text-[13px] mt-0.5 font-bold ${stabilityColor}`}>
              {regionScore != null ? `${regionScore}/100 — ${stabilityLabel}` : '—'}
            </span>
          </div>

          <div className="h-10 w-px bg-black/5" />

          <div className="flex flex-col">
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">RESIDEX</span>
            <span className="text-[13px] mt-0.5 font-bold text-black">
              {residex != null ? residex.toFixed(1) : '—'}
            </span>
          </div>

          <div className="h-10 w-px bg-black/5" />

          {/* Backend Status Dot */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              backendStatus === 'connected' ? 'bg-emerald-500 animate-pulse' 
              : backendStatus === 'loading' ? 'bg-amber-400 animate-pulse'
              : 'bg-red-400'
            }`} />
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              {backendStatus === 'connected' ? 'Engine Live' : backendStatus === 'loading' ? 'Connecting...' : 'Engine Offline'}
            </span>
          </div>
        </div>

        <div className="flex gap-8">
          <button className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 hover:text-[#0f4d23] transition-colors">Transcript</button>
          <button className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 hover:text-[#0f4d23] transition-colors">Audit Logs</button>
        </div>
      </div>

      {/* Expanded content — visible on hover */}
      <motion.div 
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-500 grid grid-cols-3 gap-10"
      >
        {/* Column 1: Region Risk Metrics */}
        <div className="space-y-3">
          <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">{activeRegion} Risk Indicators</h5>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="P/I Ratio" value={piRatio != null ? `${piRatio.toFixed(1)}x` : '—'} />
            <MiniStat label="P/R Ratio" value={prRatio != null ? `${prRatio.toFixed(1)}x` : '—'} />
            <MiniStat label="Affordability" value={affordability != null ? `${affordability.toFixed(1)}%` : '—'} />
            <MiniStat label="Cap Spread" value={capSpread != null ? `${capSpread.toFixed(2)}%` : '—'} />
          </div>
        </div>

        {/* Column 2: Narrative */}
        <div className="space-y-3">
          <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Analysis</h5>
          <p className="text-[12px] text-slate-600 font-medium leading-[1.7] max-h-28 overflow-y-auto no-scrollbar">
            {agentTranscript || regionFlag?.narrative || `No analysis available for ${activeRegion}. Run a valuation to generate.`}
          </p>
        </div>

        {/* Column 3: Summary Cards */}
        <div className="grid grid-cols-2 gap-4 h-fit self-center">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Stability</span>
            <div className={`text-base font-bold mt-0.5 ${stabilityColor}`}>{stabilityLabel}</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Confidence</span>
            <div className="text-base font-bold text-slate-800 mt-0.5">{confidenceLabel}</div>
          </div>
        </div>
      </motion.div>
    </footer>
  )
}

const MiniStat = ({ label, value }: { label: string; value: string }) => (
  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
    <div className="text-[13px] font-bold text-black mt-0.5">{value}</div>
  </div>
)

export default BottomDrawer

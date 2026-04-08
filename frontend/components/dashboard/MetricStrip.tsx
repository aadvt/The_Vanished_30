'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Wallet, Activity, Percent, TrendingUp, ShieldCheck } from 'lucide-react'
import { useStore } from '@/store/useStore'

const MetricStrip = () => {
  const { macroSnapshot } = useStore()

  // Format helpers
  const fmt = (val: number | null | undefined, suffix = '', fallback = '—') => {
    if (val == null) return fallback
    return `${val.toFixed(1)}${suffix}`
  }

  const fmtCr = (val: number | null | undefined) => {
    if (val == null) return '—'
    const cr = val / 10_000_000
    return `${cr.toFixed(1)}Cr`
  }

  // Derive values from macro snapshot or show defaults
  const median = macroSnapshot?.median_home_price_inr
  const piRatio = (macroSnapshot?.median_home_price_inr && macroSnapshot?.median_household_income_inr)
    ? (macroSnapshot.median_home_price_inr / macroSnapshot.median_household_income_inr).toFixed(1) + 'x'
    : '—'
  const repoRate = fmt(macroSnapshot?.repo_rate, '%')
  const residex = fmt(macroSnapshot?.nhb_residex_composite)

  return (
    <aside className="w-[100px] h-screen fixed left-0 top-0 bg-white/95 backdrop-blur-2xl z-40 flex flex-col items-center py-28 gap-12 border-r border-black/5 pointer-events-auto">
      <MetricItem 
        icon={<Wallet size={20} />} 
        label="Median" 
        value={fmtCr(median)} 
        delta={macroSnapshot ? '+Live' : undefined}
        active 
      />
      
      <MetricItem 
        icon={<TrendingUp size={20} />} 
        label="P/I Ratio" 
        value={piRatio}
        isProgress
        active
      />

      <MetricItem 
        icon={<Percent size={20} />} 
        label="Repo" 
        value={repoRate}
        hasSparkline
        active
      />

      <MetricItem 
        icon={<Activity size={20} />} 
        label="RESIDEX" 
        value={residex} 
        active
      />

      <MetricItem 
        icon={<ShieldCheck size={20} />} 
        label="GNPA" 
        value={fmt(macroSnapshot?.gnpa_ratio, '%')}
        isBadge
        active
      />
    </aside>
  )
}

const MetricItem = ({ 
  icon, 
  label, 
  value, 
  delta, 
  active = false, 
  isProgress = false,
  hasSparkline = false,
  isBadge = false
}: any) => (
  <motion.div 
    className={`flex flex-col items-center gap-1.5 group cursor-pointer transition-all ${active ? 'opacity-100' : 'opacity-30'}`}
  >
    <div className={`transition-all duration-300 ${active ? 'text-[#0f4d23]' : 'text-slate-400'}`}>
      {isProgress ? (
        <div className="relative w-10 h-10 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle className="opacity-5" cx="20" cy="20" fill="transparent" r="18" stroke="currentColor" strokeWidth="2" />
            <circle cx="20" cy="20" fill="transparent" r="18" stroke="currentColor" strokeDasharray="113" strokeDashoffset="40" strokeWidth="2" />
          </svg>
          {icon}
        </div>
      ) : icon}
    </div>
    
    <span className="font-headline text-[8px] font-bold tracking-[0.25em] text-slate-400 uppercase">{label}</span>
    <div className={`font-headline text-[11px] font-bold ${active ? 'text-black' : 'text-slate-500'}`}>{value}</div>
    
    {delta && <span className="text-[8px] text-[#0f4d23] font-bold font-mono">{delta}</span>}
    
    {hasSparkline && (
      <div className="w-8 h-3 mt-1 opacity-100 transition-opacity">
        <svg className="w-full h-full stroke-[#0f4d23] fill-none" viewBox="0 0 50 20">
          <polyline points="0,15 10,12 20,18 30,5 40,8 50,2" strokeWidth="2" />
        </svg>
      </div>
    )}

    {isBadge && (
      <div className="text-[8px] px-1.5 py-0.5 mt-0.5 bg-[#0f4d2315] text-[#0f4d23] border border-[#0f4d2320] rounded-full font-bold font-mono">
        SAFE
      </div>
    )}
  </motion.div>
)

export default MetricStrip

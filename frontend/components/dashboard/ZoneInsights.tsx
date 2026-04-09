'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore, ZoneData } from '@/store/useStore'
import { X, TrendingUp, ShieldCheck, AlertTriangle, Target, Briefcase } from 'lucide-react'

const ZoneInsights = () => {
  const { selectedZone, setSelectedZone } = useStore()

  if (!selectedZone) return null

  const getRecColor = (rec: ZoneData['recommendation']) => {
    switch (rec) {
      case 'BUY': return 'text-emerald-500'
      case 'HOLD': return 'text-amber-500'
      case 'SELL': return 'text-rose-500'
      default: return 'text-slate-500'
    }
  }

  const getRiskLabel = (score: number) => {
    if (score < 30) return { label: 'Excellent', color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
    if (score < 60) return { label: 'Moderate', color: 'text-amber-500', bg: 'bg-amber-500/10' }
    return { label: 'At Risk', color: 'text-rose-500', bg: 'bg-rose-500/10' }
  }

  const risk = getRiskLabel(selectedZone.risk_score)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        className="fixed top-24 right-8 w-96 z-40"
      >
        <div className="bg-white/90 backdrop-blur-2xl rounded-[32px] shadow-[0_20px_80px_rgba(0,0,0,0.2)] border border-white/20 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-8 pt-8 pb-4 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${risk.bg} ${risk.color}`}>
                  {risk.label} Stability
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tighter leading-none">
                {selectedZone.name}
              </h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
                {selectedZone.region} Investment Node
              </p>
            </div>
            <button 
              onClick={() => setSelectedZone(null)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors group"
            >
              <X className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
            </button>
          </div>

          {/* Core Metrics Grid */}
          <div className="px-8 py-6 grid grid-cols-2 gap-4">
            <MetricBox 
              icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
              label="Annual Yield"
              value={`${selectedZone.yield_pct}%`}
            />
            <MetricBox 
              icon={<Target className="w-4 h-4 text-blue-500" />}
              label="Appreciation"
              value={`${selectedZone.appreciation_pct}%`}
            />
            <MetricBox 
              icon={<ShieldCheck className="w-4 h-4 text-purple-500" />}
              label="Occupancy"
              value={`${selectedZone.occupancy_pct}%`}
            />
            <MetricBox 
              icon={<Briefcase className="w-4 h-4 text-orange-500" />}
              label="Risk Score"
              value={`${selectedZone.risk_score}/100`}
            />
          </div>

          {/* Strategy Recommendation */}
          <div className="px-8 pb-8 space-y-6">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Recommendation
                </span>
                <span className={`text-sm font-black tracking-tighter ${getRecColor(selectedZone.recommendation)}`}>
                  STRICT {selectedZone.recommendation}
                </span>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed font-medium">
                {selectedZone.narrative}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
                Zone Intelligence
              </span>
              <p className="text-slate-500 text-xs leading-relaxed italic">
                {selectedZone.details}
              </p>
            </div>

            <button className="w-full py-4 bg-[#0f4d23] text-white rounded-2xl font-bold text-sm hover:bg-[#0a3518] transition-all shadow-[0_10px_20px_rgba(15,77,35,0.2)] flex items-center justify-center gap-2">
              Run Local Simulation
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

const MetricBox = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
    <div className="mb-2 p-2 bg-white rounded-xl shadow-sm border border-slate-50">{icon}</div>
    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{label}</span>
    <div className="text-lg font-black text-slate-800 tracking-tighter">{value}</div>
  </div>
)

export default ZoneInsights

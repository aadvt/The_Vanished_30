'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { Activity, ShieldAlert, TrendingUp } from 'lucide-react'

const RiskOverview = () => {
  const { valuationMap } = useStore()

  const stats = useMemo(() => {
    const items = Object.values(valuationMap)
    if (items.length === 0) return { avgRisk: 0, totalVal: 0, trend: 0 }

    const avgRisk = items.reduce((acc, curr) => acc + curr.risk_score, 0) / items.length
    const totalVal = items.reduce((acc, curr) => acc + curr.price_index, 0)
    
    return {
      avgRisk: avgRisk.toFixed(1),
      totalVal: (totalVal / 1000).toFixed(1) + 'M',
      trend: (Math.random() * 2).toFixed(2) // Mocked trend
    }
  }, [valuationMap])

  return (
    <div className="flex gap-4">
      <StatCard 
        label="AGGREGATE RISK" 
        value={stats.avgRisk} 
        icon={<ShieldAlert size={14} />} 
        color="text-risk-medium" 
      />
      <StatCard 
        label="MARKET CAP" 
        value={stats.totalVal} 
        icon={<Activity size={14} />} 
        color="text-primary" 
      />
      <StatCard 
        label="VOLATILITY" 
        value={`+${stats.trend}%`} 
        icon={<TrendingUp size={14} />} 
        color="text-secondary" 
      />
    </div>
  )
}

const StatCard = ({ label, value, icon, color }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass p-3 rounded-lg flex flex-col gap-1 min-w-[120px]"
  >
    <div className="flex items-center gap-2 opacity-50">
      {icon}
      <span className="text-[10px] font-bold tracking-widest uppercase">{label}</span>
    </div>
    <div className={`text-lg font-bold tracking-tighter ${color}`}>
      {value}
    </div>
  </motion.div>
)

export default RiskOverview

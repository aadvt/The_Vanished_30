'use client'

import { useEffect } from 'react'
import { useStore } from '@/store/useStore'

const MockDataLoop = () => {
  const { setValuation, setScenarioResult, setAudioLevel, setVoiceStatus } = useStore()

  useEffect(() => {
    // Initial BKC, Mumbai Digital Twin Assets
    const assets = ['BKC-ICICI', 'BKC-NSE', 'BKC-JIO', 'BKC-BLK-1', 'BKC-BLK-2', 'BKC-BLK-3', 'BKC-BLK-4']
    
    // BKC Premium Pricing (Values in USD for global dashboard feel, but Magnitude represents Mumbai's prime area)
    assets.forEach(id => {
        setValuation(id, {
          price_index: 450000 + Math.random() * 550000,
          risk_score: Math.random() * 4 + 1, // Mumbai financial sector currently stable
          volatility: Math.random() * 0.3,
          pi_ratio: Math.random()
        })
    })

    // Simulated Live Updates for India Market
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * assets.length)
      const id = assets[idx]
      
      // Dynamic Risk shifts
      const newRisk = Math.random() < 0.1 ? 7.5 : Math.random() * 4 + 1
      
      setValuation(id, {
        risk_score: newRisk,
        price_index: 450000 + Math.random() * 550000
      })
    }, 4000)

    // Initial India Scenario (Market Projection)
    setScenarioResult({
      p5: 520000,
      p50: 650000,
      p95: 850000
    })

    // Voice Pulse Simulation
    let angle = 0
    const voiceInterval = setInterval(() => {
        angle += 0.2
        const level = Math.max(0, Math.sin(angle) * 0.4 + 0.4)
        setAudioLevel(level)
    }, 50)

    return () => {
        clearInterval(interval)
        clearInterval(voiceInterval)
    }
  }, [setValuation, setScenarioResult, setAudioLevel, setVoiceStatus])

  return null
}

export default MockDataLoop

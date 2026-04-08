'use client'

import { useCallback } from 'react'
import { useStore } from '../store/useStore'

export const useScenario = () => {
  const { setScenarioResult } = useStore()

  const runScenario = useCallback(async (params: any) => {
    try {
      // POST /scenario -> Monte Carlo (Pipeline 2)
      const response = await fetch('/api/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })

      const result = await response.json()
      
      // result: { p5: 800000, p50: 950000, p95: 1100000 }
      setScenarioResult(result)
    } catch (error) {
      console.error('Scenario Error:', error)
    }
  }, [setScenarioResult])

  const clearScenario = useCallback(() => {
    setScenarioResult(null)
  }, [setScenarioResult])

  return { runScenario, clearScenario }
}

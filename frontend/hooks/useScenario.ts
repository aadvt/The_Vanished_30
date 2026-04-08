'use client'

import { useCallback } from 'react'
import { useStore } from '../store/useStore'
import { api } from '@/lib/apiClient'
import type { ScenarioRunResult } from '@/lib/apiClient'

export const useScenario = () => {
  const { setScenarioResult } = useStore()

  const runScenario = useCallback(async (params?: {
    rate_change_bps?: number
    inflation_change_pct?: number
    gdp_shock_pct?: number
    base_value_lakh?: number
    n_simulations?: number
  }) => {
    try {
      const result = await api<ScenarioRunResult>('/api/scenario/run', {
        method: 'POST',
        body: JSON.stringify(params || {}),
      })

      // Map backend fields to store shape
      setScenarioResult({
        p5: result.p10,
        p50: result.p50,
        p95: result.p90,
      })

      return result
    } catch (error) {
      console.error('[Scenario] Error:', error)
      return null
    }
  }, [setScenarioResult])

  const clearScenario = useCallback(() => {
    setScenarioResult(null)
  }, [setScenarioResult])

  return { runScenario, clearScenario }
}

'use client'

import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { api, apiUrl } from '@/lib/apiClient'
import type { MacroSnapshot, BubbleFlag, ValuationRecord } from '@/lib/apiClient'

const POLL_INTERVAL = 30_000 // 30 seconds

const LiveDataLoop = () => {
  const {
    setBackendStatus,
    setMacroSnapshot,
    setBubbleFlags,
    setValuations,
    setValuation,
    setScenarioResult,
    setAudioLevel,
  } = useStore()

  const sseRef = useRef<EventSource | null>(null)

  // --- Initial Fetch + Polling ---
  useEffect(() => {
    let cancelled = false
    let pollTimer: ReturnType<typeof setInterval>

    const fetchAll = async () => {
      try {
        // 1. Health check
        await api('/health')
        if (!cancelled) setBackendStatus('connected')

        // 2. Macro snapshot
        try {
          const macro = await api<MacroSnapshot>('/api/market/snapshot')
          if (!cancelled) setMacroSnapshot(macro)
        } catch (e) {
          console.warn('[LiveData] macro snapshot failed:', e)
        }

        // 3. Bubble flags → populate valuationMap
        try {
          const flags = await api<BubbleFlag[]>('/api/risk/bubble-flags')
          if (!cancelled) {
            setBubbleFlags(flags)
            // Map bubble flags into the asset-level valuationMap for the map markers
            const assetLocations: Record<string, string> = {
              'mumbai': 'MUM-BKC',
              'delhi': 'DEL-CP',
              'bangalore': 'BLR-WF',
              'chennai': 'MAA-OMR',
            }
            flags.forEach((flag) => {
              const key = flag.region.toLowerCase().replace(/[ -]/g, '_')
              const assetId = assetLocations[key]
              if (assetId) {
                setValuation(assetId, {
                  risk_score: flag.overall_score / 10, // normalize 0-100 to 0-10
                  pi_ratio: flag.price_income_ratio ?? 0,
                })
              }
            })
          }
        } catch (e) {
          console.warn('[LiveData] bubble flags failed:', e)
        }

        // 4. Valuations
        try {
          const vals = await api<ValuationRecord[]>('/api/valuations')
          if (!cancelled) setValuations(vals)
        } catch (e) {
          console.warn('[LiveData] valuations failed:', e)
        }

        // 5. Scenario history (for initial display)
        try {
          const history = await api<any[]>('/api/scenario/history')
          if (!cancelled && history.length > 0) {
            const latest = history[0]
            setScenarioResult({
              p5: latest.p10 ?? 0,
              p50: latest.p50 ?? 0,
              p95: latest.p90 ?? 0,
            })
          }
        } catch (e) {
          console.warn('[LiveData] scenario history failed:', e)
        }

      } catch (e) {
        console.error('[LiveData] backend unreachable:', e)
        if (!cancelled) setBackendStatus('error')
      }
    }

    // Seed primary regional assets with default values so markers always render
    const defaultAssets = ['MUM-BKC', 'DEL-CP', 'BLR-WF', 'MAA-OMR', 'AHM-GIFT']
    defaultAssets.forEach(id => {
      const isAhmedabad = id === 'AHM-GIFT'
      setValuation(id, {
        price_index: 450000 + Math.random() * 550000,
        risk_score: isAhmedabad ? 1.5 : (7.5 + Math.random() * 2), // Ahmedabad = 15/100 (Excellent), Others = High Risk (Red)
        volatility: Math.random() * 0.3,
        pi_ratio: 8 + Math.random() * 6,
      })
    })

    fetchAll()
    pollTimer = setInterval(fetchAll, POLL_INTERVAL)

    return () => {
      cancelled = true
      clearInterval(pollTimer)
    }
  }, [setBackendStatus, setMacroSnapshot, setBubbleFlags, setValuations, setValuation, setScenarioResult, setAudioLevel])

  // --- SSE: Real-time alerts ---
  useEffect(() => {
    const url = apiUrl('/api/alerts/stream')

    const connect = () => {
      const es = new EventSource(url)
      sseRef.current = es

      es.onopen = () => {
        console.log('[SSE] Connected to alert stream')
      }

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('[SSE] Alert:', data)
          // Could update store here based on event type
          if (data.type === 'bubble_alert') {
            // Refresh bubble flags
            api<BubbleFlag[]>('/api/risk/bubble-flags').then(flags => {
              setBubbleFlags(flags)
            }).catch(() => {})
          }
        } catch {
          // heartbeat or non-JSON message, ignore
        }
      }

      es.onerror = () => {
        console.warn('[SSE] Connection lost, reconnecting in 5s...')
        es.close()
        setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      sseRef.current?.close()
    }
  }, [setBubbleFlags])

  // --- Voice audio level simulation (keeps the VoiceControl UI alive) ---
  useEffect(() => {
    let angle = 0
    const voiceInterval = setInterval(() => {
      angle += 0.2
      const level = Math.max(0, Math.sin(angle) * 0.4 + 0.4)
      setAudioLevel(level)
    }, 50)
    return () => clearInterval(voiceInterval)
  }, [setAudioLevel])

  return null
}

export default LiveDataLoop

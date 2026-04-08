'use client'

import { useEffect, useCallback } from 'react'
import { useStore } from '../store/useStore'

export const useBackendSocket = () => {
  const { appendToken, setIsStreaming, setTranscript } = useStore()

  const queryNL = useCallback(async (query: string) => {
    setTranscript('')
    setIsStreaming(true)

    try {
      // Using Fetch + SSE for token streaming (Pipeline 2)
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })

      if (!response.body) return

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        appendToken(chunk)
      }

      setIsStreaming(false)
    } catch (error) {
      console.error('SSE Error:', error)
      setIsStreaming(false)
    }
  }, [appendToken, setIsStreaming, setTranscript])

  return { queryNL }
}

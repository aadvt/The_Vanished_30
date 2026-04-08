'use client'

import { useCallback } from 'react'
import { useStore } from '../store/useStore'
import { api } from '@/lib/apiClient'
import type { QueryResult } from '@/lib/apiClient'

export const useBackendSocket = () => {
  const { setTranscript, setIsStreaming } = useStore()

  const queryNL = useCallback(async (query: string) => {
    setTranscript('')
    setIsStreaming(true)

    try {
      const result = await api<QueryResult>('/api/query', {
        method: 'POST',
        body: JSON.stringify({ question: query, region: 'national' }),
      })

      setTranscript(result.answer || 'No answer received.')
      setIsStreaming(false)
    } catch (error) {
      console.error('[Query] Error:', error)
      setTranscript('Error: Could not reach the analysis engine.')
      setIsStreaming(false)
    }
  }, [setTranscript, setIsStreaming])

  return { queryNL }
}

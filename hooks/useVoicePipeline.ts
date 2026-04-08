'use client'

import { useRef, useCallback } from 'react'
import { useStore } from '@/store/useStore'

/**
 * useVoicePipeline — Full-duplex voice pipeline
 * 
 * Flow: Mic → Deepgram STT (WebSocket) → AI Query → ElevenLabs TTS → Speaker
 * 
 * Deepgram handles STT via their browser-compatible WebSocket API.
 * ElevenLabs handles TTS via a server-side proxy route (/api/tts).
 * 
 * Both API keys are stored server-side only — never exposed to the browser.
 */

const DEEPGRAM_WS_URL = 'wss://api.deepgram.com/v1/listen'

export const useVoicePipeline = () => {
  const { setVoiceStatus, setAudioLevel, setTranscript, appendToken, setIsStreaming } = useStore()
  
  const mediaStream = useRef<MediaStream | null>(null)
  const audioContext = useRef<AudioContext | null>(null)
  const analyser = useRef<AnalyserNode | null>(null)
  const dgSocket = useRef<WebSocket | null>(null)
  const rafId = useRef<number>(0)
  const isActive = useRef(false)

  // Monitor mic levels for the visual orb feedback
  const monitorAudioLevel = useCallback(() => {
    if (!analyser.current || !isActive.current) return
    
    const data = new Uint8Array(analyser.current.frequencyBinCount)
    analyser.current.getByteFrequencyData(data)
    
    const avg = data.reduce((sum, val) => sum + val, 0) / data.length
    const normalized = Math.min(avg / 128, 1)
    setAudioLevel(normalized)
    
    rafId.current = requestAnimationFrame(monitorAudioLevel)
  }, [setAudioLevel])

  // Play TTS audio from ElevenLabs (streamed via our API route)
  const speakResponse = useCallback(async (text: string) => {
    setVoiceStatus('speaking')
    
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok || !response.body) {
        console.error('TTS request failed')
        setVoiceStatus('listening')
        return
      }

      // Stream audio chunks into an AudioContext for playback
      const ctx = new AudioContext()
      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) chunks.push(value)
      }

      // Combine chunks and decode
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
      const combined = new Uint8Array(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        combined.set(chunk, offset)
        offset += chunk.length
      }

      const audioBuffer = await ctx.decodeAudioData(combined.buffer)
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(ctx.destination)
      source.onended = () => {
        setVoiceStatus('listening')
        ctx.close()
      }
      source.start()
    } catch (err) {
      console.error('TTS playback error:', err)
      setVoiceStatus('listening')
    }
  }, [setVoiceStatus])

  // Process the STT transcript — send to query API, then speak the result
  const processTranscript = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return
    
    setTranscript('')
    setIsStreaming(true)

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: transcript }),
      })

      if (!response.ok || !response.body) return

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        appendToken(chunk)
        fullResponse += chunk
      }

      setIsStreaming(false)

      // Speak the AI response
      if (fullResponse.trim()) {
        await speakResponse(fullResponse)
      }
    } catch (err) {
      console.error('Query error:', err)
      setIsStreaming(false)
    }
  }, [setTranscript, setIsStreaming, appendToken, speakResponse])

  // Start the full pipeline: Mic → Deepgram STT → AI → ElevenLabs TTS → Speaker
  const startListening = useCallback(async () => {
    if (isActive.current) return
    isActive.current = true

    try {
      // 1. Get microphone access
      mediaStream.current = await navigator.mediaDevices.getUserMedia({ audio: true })

      // 2. Set up audio analysis for visual feedback
      audioContext.current = new AudioContext()
      analyser.current = audioContext.current.createAnalyser()
      analyser.current.fftSize = 256
      const source = audioContext.current.createMediaStreamSource(mediaStream.current)
      source.connect(analyser.current)
      monitorAudioLevel()

      // 3. Connect to Deepgram STT via WebSocket
      const deepgramKey = await fetch('/api/deepgram-key').then(r => r.json()).then(d => d.key)
      
      dgSocket.current = new WebSocket(
        `${DEEPGRAM_WS_URL}?model=nova-2&language=en&smart_format=true&interim_results=true`,
        ['token', deepgramKey]
      )

      dgSocket.current.onopen = () => {
        setVoiceStatus('listening')
        
        // Stream mic audio to Deepgram
        const mediaRecorder = new MediaRecorder(mediaStream.current!, { mimeType: 'audio/webm' })
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && dgSocket.current?.readyState === WebSocket.OPEN) {
            dgSocket.current.send(event.data)
          }
        }
        mediaRecorder.start(250) // Send chunks every 250ms
      }

      dgSocket.current.onmessage = (event) => {
        const data = JSON.parse(event.data)
        const transcript = data.channel?.alternatives?.[0]?.transcript
        
        if (transcript) {
          if (data.is_final) {
            // Final transcript — process it
            processTranscript(transcript)
          } else {
            // Interim — show live preview
            setTranscript(transcript)
          }
        }
      }

      dgSocket.current.onerror = (err) => {
        console.error('Deepgram WebSocket error:', err)
      }

    } catch (err) {
      console.error('Voice pipeline start error:', err)
      isActive.current = false
      setVoiceStatus('idle')
    }
  }, [setVoiceStatus, monitorAudioLevel, processTranscript, setTranscript])

  // Stop the pipeline
  const stopListening = useCallback(() => {
    isActive.current = false
    
    cancelAnimationFrame(rafId.current)
    dgSocket.current?.close()
    mediaStream.current?.getTracks().forEach(t => t.stop())
    audioContext.current?.close()

    dgSocket.current = null
    mediaStream.current = null
    audioContext.current = null
    analyser.current = null

    setVoiceStatus('idle')
    setAudioLevel(0)
  }, [setVoiceStatus, setAudioLevel])

  return { startListening, stopListening }
}

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
  const { setVoiceStatus, setAudioLevel, setTranscript, addMessage, setIsStreaming } = useStore()
  
  const mediaStream = useRef<MediaStream | null>(null)
  const audioContext = useRef<AudioContext | null>(null)
  const analyser = useRef<AnalyserNode | null>(null)
  const dgSocket = useRef<WebSocket | null>(null)
  const rafId = useRef<number>(0)
  const isActive = useRef(false)
  const isProcessing = useRef(false)
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  // Location lookup table — spoken names → coordinates
  const LOCATION_COORDS: Record<string, { lng: number; lat: number; zoom?: number; label: string }> = {
    'mumbai': { lng: 72.8656, lat: 19.0658, zoom: 16.5, label: 'Mumbai BKC' },
    'bkc': { lng: 72.8656, lat: 19.0658, zoom: 16.5, label: 'Mumbai BKC' },
    'bandra': { lng: 72.8356, lat: 19.0596, zoom: 16.5, label: 'Bandra' },
    'delhi': { lng: 77.2090, lat: 28.6139, zoom: 16.5, label: 'Delhi' },
    'new delhi': { lng: 77.2090, lat: 28.6139, zoom: 16.5, label: 'New Delhi' },
    'connaught': { lng: 77.2195, lat: 28.6315, zoom: 16.5, label: 'Connaught Place' },
    'bangalore': { lng: 77.5946, lat: 12.9716, zoom: 16.5, label: 'Bangalore' },
    'bengaluru': { lng: 77.5946, lat: 12.9716, zoom: 16.5, label: 'Bengaluru' },
    'whitefield': { lng: 77.7500, lat: 12.9698, zoom: 16.5, label: 'Whitefield' },
    'chennai': { lng: 80.2707, lat: 13.0827, zoom: 16.5, label: 'Chennai' },
    'hyderabad': { lng: 78.4867, lat: 17.3850, zoom: 16.5, label: 'Hyderabad' },
    'hitec city': { lng: 78.3816, lat: 17.4474, zoom: 16.5, label: 'HITEC City' },
    'pune': { lng: 73.8567, lat: 18.5204, zoom: 16.5, label: 'Pune' },
    'gurgaon': { lng: 77.0266, lat: 28.4595, zoom: 16.5, label: 'Gurgaon' },
    'gurugram': { lng: 77.0266, lat: 28.4595, zoom: 16.5, label: 'Gurugram' },
    'noida': { lng: 77.3910, lat: 28.5355, zoom: 16.5, label: 'Noida' },
    'kolkata': { lng: 88.3639, lat: 22.5726, zoom: 16.5, label: 'Kolkata' },
    'ahmedabad': { lng: 72.5714, lat: 23.0225, zoom: 16.5, label: 'Ahmedabad' },
    'navi mumbai': { lng: 73.0169, lat: 19.0330, zoom: 16.5, label: 'Navi Mumbai' },
    'thane': { lng: 72.9781, lat: 19.2183, zoom: 13, label: 'Thane' },
  }

  // Detect location from text and fly map there
  const detectAndFlyToLocation = useCallback((text: string) => {
    const lower = text.toLowerCase()
    // Check longest keys first to match "navi mumbai" before "mumbai"
    const keys = Object.keys(LOCATION_COORDS).sort((a, b) => b.length - a.length)
    for (const key of keys) {
      if (lower.includes(key)) {
        const loc = LOCATION_COORDS[key]
        useStore.getState().flyToLocation(loc.lng, loc.lat, loc.zoom, loc.label)
        console.log(`[Voice] Flying to ${loc.label}`)
        return loc.label
      }
    }
    return null
  }, [])

  // Process the STT transcript — detect location, send to query API, then speak the result
  const processTranscript = useCallback(async (transcript: string) => {
    if (!transcript.trim() || isProcessing.current) return
    
    isProcessing.current = true
    // Add user message to history
    addMessage('user', transcript)
    // Clear the transcript UI immediately
    setTranscript('')
    
    // Check for location intent in the voice command
    detectAndFlyToLocation(transcript)

    setIsStreaming(true)
    const currentState = useStore.getState();
    const currentRegion = currentState.activeRegion || 'national';

    // Highlight the map based on the sentiment of the simulated scenario
    const lowerT = transcript.toLowerCase();
    
    const isEasing = ['reduce', 'down', 'cut', 'decrease', 'drop', 'fall', 'relax', 'lower'].some(w => lowerT.includes(w));
    const isStress = ['up', 'crash', 'stress', 'increase', 'hike', 'jump', 'collapse', 'bubble', 'higher'].some(w => lowerT.includes(w));

    // Only trigger override if they are asking a hypothetical or simulation question
    if (lowerT.includes('what will happen') || lowerT.includes('what if') || lowerT.includes('if ') || isEasing || isStress) {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);

      if (isEasing && !isStress) {
        currentState.setOverrideScore(15); // Flash Green (Safe / Easing Risk)
      } else if (isStress && !isEasing) {
        currentState.setOverrideScore(95); // Flash Red (High Stress / Danger)
      } else if (lowerT.includes('crash') || lowerT.includes('collapse')) {
        currentState.setOverrideScore(95); // Extreme stress
      } else {
        currentState.setOverrideScore(80); // Default to warning/high for general hypotheticals
      }
      
      flashTimeoutRef.current = setTimeout(() => {
        useStore.getState().setOverrideScore(null);
        flashTimeoutRef.current = null;
      }, 7000); // 7 second flash while AI thinks/speaks
    }

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: transcript, region: currentRegion }),
      })

      if (!response.ok) {
        setIsStreaming(false)
        return
      }

      const result = await response.json()
      const answer = result.answer || 'I could not find an answer.'

      // If the backend ran a true Monte Carlo simulation, snap the UI to the actual statistical probability of loss.
      if (result.mc_results) {
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);

        const trueRiskCore = Math.min(Math.round(result.mc_results.prob_below_current * 100) + 10, 100);
        useStore.getState().setOverrideScore(trueRiskCore);
        // Extend the visual duration of the simulation so they can see the true mathematical outcome while the voice speaks
        flashTimeoutRef.current = setTimeout(() => {
          useStore.getState().setOverrideScore(null);
          flashTimeoutRef.current = null;
        }, 15000); 
      }

      addMessage('assistant', answer)
      setIsStreaming(false)
      await speakResponse(answer)
      isProcessing.current = false
      
    } catch (err) {
      console.error('Query error:', err)
      const errorMsg = 'I apologize, but I am having trouble connecting to the real estate engine right now.'
      addMessage('assistant', errorMsg)
      setIsStreaming(false)
      await speakResponse(errorMsg)
      isProcessing.current = false
    }
  }, [addMessage, setIsStreaming, speakResponse, detectAndFlyToLocation, setTranscript])

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
        `${DEEPGRAM_WS_URL}?model=nova-2&language=en&smart_format=true&interim_results=true&endpointing=3000`,
        ['token', deepgramKey]
      )

      dgSocket.current.onopen = () => {
        setVoiceStatus('listening')
        
        // Stream mic audio to Deepgram — but ONLY if we are listening (not speaking)
        const mediaRecorder = new MediaRecorder(mediaStream.current!, { mimeType: 'audio/webm' })
        mediaRecorder.ondataavailable = (event) => {
          const currentStatus = useStore.getState().voiceStatus
          if (
            event.data.size > 0 && 
            dgSocket.current?.readyState === WebSocket.OPEN &&
            currentStatus === 'listening' &&
            !isProcessing.current
          ) {
            dgSocket.current.send(event.data)
          }
        }
        mediaRecorder.start(250) // Send chunks every 250ms
      }

      dgSocket.current.onmessage = (event) => {
        const currentStatus = useStore.getState().voiceStatus
        // If we are currently speaking, ignore any incoming audio transcripts (echoes)
        if (currentStatus === 'speaking' || isProcessing.current) return

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

  return { startListening, stopListening, processTranscript }
}

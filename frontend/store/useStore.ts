import { create } from 'zustand'
import type { MacroSnapshot, BubbleFlag, ValuationRecord } from '@/lib/apiClient'

export interface ValuationData {
  id: string
  price_index: number
  risk_score: number
  volatility: number
  pi_ratio: number
}

export interface ZoneData {
  id: string
  name: string
  region: string
  risk_score: number
  yield_pct: number
  appreciation_pct: number
  occupancy_pct: number
  recommendation: 'BUY' | 'HOLD' | 'SELL'
  details: string
  narrative: string
  boundary?: any // GeoJSON Polygon
}

export interface ScenarioResult {
  p5: number
  p50: number
  p95: number
}

type VoiceStatus = 'idle' | 'listening' | 'speaking'
type BackendStatus = 'connected' | 'disconnected' | 'loading' | 'error'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface DashboardState {
  // Pipeline 1: Live Data Loop
  valuationMap: Record<string, ValuationData>
  setValuation: (id: string, data: Partial<ValuationData>) => void
  selectedAssetId: string | null
  setSelectedAssetId: (id: string | null) => void

  // Map navigation
  activeRegion: string
  setActiveRegion: (region: string) => void
  mapTarget: { lng: number; lat: number; zoom?: number } | null
  flyToLocation: (lng: number, lat: number, zoom?: number, region?: string) => void
  
  // Backend health
  backendStatus: BackendStatus
  setBackendStatus: (status: BackendStatus) => void

  // Macro data from backend
  macroSnapshot: MacroSnapshot | null
  setMacroSnapshot: (snapshot: MacroSnapshot | null) => void

  // Bubble flags from backend
  bubbleFlags: BubbleFlag[]
  setBubbleFlags: (flags: BubbleFlag[]) => void

  // Valuations from backend
  valuations: ValuationRecord[]
  setValuations: (vals: ValuationRecord[]) => void

  // Pipeline 2: User Query Flow
  agentTranscript: string
  isStreaming: boolean
  setTranscript: (text: string) => void
  appendToken: (token: string) => void
  setIsStreaming: (isStreaming: boolean) => void
  overrideScore: number | null
  setOverrideScore: (score: number | null) => void
  
  // Pipeline 2: Scenario Lab
  scenarioResult: ScenarioResult | null
  setScenarioResult: (result: ScenarioResult | null) => void
  isScenarioLabOpen: boolean
  setIsScenarioLabOpen: (open: boolean) => void
  
  // New: Propagation Trace
  propagationSteps: string[]
  setPropagationSteps: (steps: string[]) => void
  addPropagationStep: (step: string) => void
  isTracing: boolean
  setIsTracing: (tracing: boolean) => void
  
  // Pipeline 3: Voice Pipeline
  voiceStatus: VoiceStatus
  setVoiceStatus: (status: VoiceStatus) => void
  audioLevel: number
  setAudioLevel: (level: number) => void

  // Chat Sidebar
  isChatOpen: boolean
  setIsChatOpen: (open: boolean) => void
  messages: ChatMessage[]
  addMessage: (role: 'user' | 'assistant', content: string) => void
  clearMessages: () => void

  // New: Zone Selection
  selectedZone: ZoneData | null
  setSelectedZone: (zone: ZoneData | null) => void
}

export const useStore = create<DashboardState>((set) => ({
  // Pipeline 1
  valuationMap: {},
  selectedAssetId: null,
  setSelectedAssetId: (id) => set({ selectedAssetId: id }),

  // Map navigation
  activeRegion: 'Mumbai',
  setActiveRegion: (region) => set({ activeRegion: region }),
  mapTarget: null,
  flyToLocation: (lng, lat, zoom, region) => set({ mapTarget: { lng, lat, zoom }, ...(region ? { activeRegion: region } : {}) }),
  setValuation: (id, data) => set((state) => ({
    valuationMap: {
      ...state.valuationMap,
      [id]: {
        ...(state.valuationMap[id] || { id, price_index: 0, risk_score: 0, volatility: 0, pi_ratio: 0 }),
        ...data
      }
    }
  })),

  // Backend health
  backendStatus: 'loading',
  setBackendStatus: (status) => set({ backendStatus: status }),

  // Macro
  macroSnapshot: null,
  setMacroSnapshot: (snapshot) => set({ macroSnapshot: snapshot }),

  // Bubble flags
  bubbleFlags: [],
  setBubbleFlags: (flags) => set({ bubbleFlags: flags }),

  // Valuations
  valuations: [],
  setValuations: (vals) => set({ valuations: vals }),

  // Pipeline 2: NL Query
  agentTranscript: '',
  isStreaming: false,
  setTranscript: (text) => set({ agentTranscript: text }),
  appendToken: (token) => set((state) => ({ agentTranscript: state.agentTranscript + token })),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  overrideScore: null,
  setOverrideScore: (score) => set({ overrideScore: score }),

  // Pipeline 2: Scenario
  scenarioResult: null,
  setScenarioResult: (result) => set({ scenarioResult: result }),
  isScenarioLabOpen: false,
  setIsScenarioLabOpen: (open) => set({ isScenarioLabOpen: open }),

  // Propagation Trace
  propagationSteps: [],
  setPropagationSteps: (steps) => set({ propagationSteps: steps }),
  addPropagationStep: (step) => set((state) => ({ propagationSteps: [...state.propagationSteps, step] })),
  isTracing: false,
  setIsTracing: (tracing) => set({ isTracing: tracing }),

  // Pipeline 3: Voice
  voiceStatus: 'idle',
  setVoiceStatus: (status) => set({ voiceStatus: status }),
  audioLevel: 0,
  setAudioLevel: (level) => set({ audioLevel: level }),

  // Chat Sidebar
  isChatOpen: true, // Default open to show off the new feature
  setIsChatOpen: (open) => set({ isChatOpen: open }),
  messages: [],
  addMessage: (role, content) => set((state) => ({ 
    messages: [...state.messages, { id: Math.random().toString(36).substring(7), role, content }] 
  })),
  clearMessages: () => set({ messages: [] }),

  // Zone Selection
  selectedZone: null,
  setSelectedZone: (zone) => set({ selectedZone: zone }),
}))

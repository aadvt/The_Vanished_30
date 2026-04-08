import { create } from 'zustand'

export interface ValuationData {
  id: string
  price_index: number
  risk_score: number
  volatility: number
  pi_ratio: number
}

export interface ScenarioResult {
  p5: number
  p50: number
  p95: number
}

type VoiceStatus = 'idle' | 'listening' | 'speaking'

interface DashboardState {
  // Pipeline 1: Live Data Loop
  valuationMap: Record<string, ValuationData>
  setValuation: (id: string, data: Partial<ValuationData>) => void
  
  // Pipeline 2: User Query Flow
  agentTranscript: string
  isStreaming: boolean
  setTranscript: (text: string) => void
  appendToken: (token: string) => void
  setIsStreaming: (isStreaming: boolean) => void
  
  // Pipeline 2: Scenario Lab
  scenarioResult: ScenarioResult | null
  setScenarioResult: (result: ScenarioResult | null) => void
  
  // Pipeline 3: Voice Pipeline
  voiceStatus: VoiceStatus
  setVoiceStatus: (status: VoiceStatus) => void
  audioLevel: number
  setAudioLevel: (level: number) => void
}

export const useStore = create<DashboardState>((set) => ({
  // Pipeline 1
  valuationMap: {},
  setValuation: (id, data) => set((state) => ({
    valuationMap: {
      ...state.valuationMap,
      [id]: {
        ...(state.valuationMap[id] || { id, price_index: 0, risk_score: 0, volatility: 0, pi_ratio: 0 }),
        ...data
      }
    }
  })),

  // Pipeline 2: NL Query
  agentTranscript: '',
  isStreaming: false,
  setTranscript: (text) => set({ agentTranscript: text }),
  appendToken: (token) => set((state) => ({ agentTranscript: state.agentTranscript + token })),
  setIsStreaming: (isStreaming) => set({ isStreaming }),

  // Pipeline 2: Scenario
  scenarioResult: null,
  setScenarioResult: (result) => set({ scenarioResult: result }),

  // Pipeline 3: Voice
  voiceStatus: 'idle',
  setVoiceStatus: (status) => set({ voiceStatus: status }),
  audioLevel: 0,
  setAudioLevel: (level) => set({ audioLevel: level }),
}))

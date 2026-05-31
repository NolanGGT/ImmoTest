import { create } from 'zustand'
import type { AnalyseResult } from '@immosafe/shared-types'

// Minimal display data stored alongside the analyse so the detail page
// can render immediately after a POST /analyser without waiting for GET /api/biens/:id
export interface MinimalBienData {
  id: string
  prix: number
  surface: number
  typeBien: string
  ville: string
  scoreImmoSafe: number
}

interface AnalyseState {
  bienId: string | null
  analyse: AnalyseResult | null
  bienData: MinimalBienData | null
  setResult: (bienId: string, analyse: AnalyseResult, bienData: MinimalBienData) => void
  clear: () => void
}

export const useAnalyseStore = create<AnalyseState>()((set) => ({
  bienId: null,
  analyse: null,
  bienData: null,
  setResult: (bienId, analyse, bienData) => set({ bienId, analyse, bienData }),
  clear: () => set({ bienId: null, analyse: null, bienData: null }),
}))

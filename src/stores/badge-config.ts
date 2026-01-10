import { create } from 'zustand'
import { DEFAULT_BADGE_CONFIG, type BadgeConfig } from '@/types/badge'
import type { WCIF, ProcessedActivity } from '@/types/wcif'

interface BadgeStore {
  config: BadgeConfig
  updateConfig: (updates: Partial<BadgeConfig>) => void
  resetConfig: () => void
  wcif: WCIF | null
  setWcif: (wcif: WCIF | null) => void
  activities: Record<number, ProcessedActivity>
  setActivities: (activities: Record<number, ProcessedActivity>) => void
  isLoading: boolean
  setLoading: (loading: boolean) => void
  error: string | null
  setError: (error: string | null) => void
}

export const useBadgeStore = create<BadgeStore>((set) => ({
  config: DEFAULT_BADGE_CONFIG,
  updateConfig: (updates) => set((s) => ({ config: { ...s.config, ...updates } })),
  resetConfig: () => set({ config: DEFAULT_BADGE_CONFIG }),
  wcif: null,
  setWcif: (wcif) => set({ wcif }),
  activities: {},
  setActivities: (activities) => set({ activities }),
  isLoading: false,
  setLoading: (isLoading) => set({ isLoading }),
  error: null,
  setError: (error) => set({ error }),
}))

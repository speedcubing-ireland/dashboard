import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GoogleUser } from '@/types/gsuite'

interface GSuiteAuthState {
  accessToken: string | null
  expiresAt: number | null
  user: GoogleUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  setAuth: (token: string, expiresIn: number) => void
  setUser: (user: GoogleUser) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  logout: () => void
  isTokenExpired: () => boolean
}

export const useGSuiteAuthStore = create<GSuiteAuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      expiresAt: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setAuth: (token: string, expiresIn: number) => {
        const expiresAt = Date.now() + expiresIn * 1000
        set({
          accessToken: token,
          expiresAt,
          isAuthenticated: true,
          error: null,
        })
      },

      setUser: (user: GoogleUser) => {
        set({ user })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      setError: (error: string | null) => {
        set({ error, isLoading: false })
      },

      logout: () => {
        set({
          accessToken: null,
          expiresAt: null,
          user: null,
          isAuthenticated: false,
          error: null,
        })
      },

      isTokenExpired: () => {
        const { expiresAt } = get()
        if (!expiresAt) return true
        return Date.now() > expiresAt - 5 * 60 * 1000
      },
    }),
    {
      name: 'gsuite-auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        expiresAt: state.expiresAt,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)

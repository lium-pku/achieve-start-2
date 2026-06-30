'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Role = 'child' | 'mom' | 'dad'

export interface Member {
  id: string
  name: string
  role: Role
  avatar: string
  color: string
  totalPoints: number
}

interface AppState {
  currentMemberId: string | null
  initialized: boolean
  setCurrentMember: (id: string) => void
  setInitialized: (v: boolean) => void
  reset: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentMemberId: null,
      initialized: false,
      setCurrentMember: (id) => set({ currentMemberId: id }),
      setInitialized: (v) => set({ initialized: v }),
      reset: () => set({ currentMemberId: null, initialized: false }),
    }),
    { name: 'kids-time-store' }
  )
)

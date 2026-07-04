'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Role } from '@/lib/auth'

export interface Member {
  id: string
  name: string
  role: Role
  avatar: string
  color: string
  totalPoints: number
}

export interface AuthUser {
  id: string
  familyId: string
  role: Role
  memberId: string | null
  nickname?: string
}

interface AppState {
  currentMemberId: string | null
  initialized: boolean
  token: string | null
  user: AuthUser | null
  setCurrentMember: (id: string) => void
  setInitialized: (v: boolean) => void
  setAuth: (token: string, user: AuthUser) => void
  logout: () => void
  reset: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentMemberId: null,
      initialized: false,
      token: null,
      user: null,
      setCurrentMember: (id) => set({ currentMemberId: id }),
      setInitialized: (v) => set({ initialized: v }),
      setAuth: (token, user) => set({ token, user }),
      logout: () =>
        set({ token: null, user: null, currentMemberId: null, initialized: false }),
      reset: () =>
        set({ currentMemberId: null, initialized: false, token: null, user: null }),
    }),
    { name: 'kids-time-store' }
  )
)

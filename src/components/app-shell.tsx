'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { api, Member } from '@/lib/types'
import { HomeTab } from '@/components/tabs/home-tab'
import { ScheduleTab } from '@/components/tabs/schedule-tab'
import { RewardsTab } from '@/components/tabs/rewards-tab'
import { FamilyTab } from '@/components/tabs/family-tab'
import { PlanningTab } from '@/components/tabs/planning-tab'
import { MemberSwitcher } from '@/components/shared/member-switcher'
import { Home, CalendarDays, Gift, Users, Target } from 'lucide-react'

type Tab = 'home' | 'schedule' | 'rewards' | 'planning' | 'family'

export function AppShell() {
  const [tab, setTab] = useState<Tab>('home')
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const { currentMemberId, initialized, setCurrentMember, setInitialized } = useAppStore()

  // 初始化 + 加载成员
  useEffect(() => {
    ;(async () => {
      try {
        // 触发种子数据
        await api('/api/init', { method: 'POST' })
        setInitialized(true)

        const list = await api<Member[]>('/api/members')
        setMembers(list)

        // 如果没有当前成员，默认选第一个孩子
        if (!currentMemberId && list.length > 0) {
          const child = list.find((m) => m.role === 'child') || list[0]
          setCurrentMember(child.id)
        }
      } catch (e) {
        console.error('初始化失败', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const refreshMembers = async () => {
    const list = await api<Member[]>('/api/members')
    setMembers(list)
  }

  const currentMember = members.find((m) => m.id === currentMemberId) || null

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <div className="text-5xl animate-bounce">⏰</div>
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  if (!initialized || members.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-background">
        <div className="text-5xl">🤔</div>
        <div className="text-center">
          <div className="text-lg font-semibold mb-1">还没有家庭成员</div>
          <div className="text-sm text-muted-foreground">请在下方添加第一个家庭成员</div>
        </div>
        <FamilyTab members={members} onChange={refreshMembers} />
      </div>
    )
  }

  const tabs: { key: Tab; label: string; icon: typeof Home }[] = [
    { key: 'home', label: '首页', icon: Home },
    { key: 'schedule', label: '日程', icon: CalendarDays },
    { key: 'rewards', label: '奖励', icon: Gift },
    { key: 'planning', label: '规划', icon: Target },
    { key: 'family', label: '家庭', icon: Users },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background max-w-md mx-auto relative">
      {/* 顶部头部 */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⏰</span>
            <div>
              <h1 className="text-base font-bold leading-tight">时间小达人</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">小学生时间管理</p>
            </div>
          </div>
          {currentMember && (
            <MemberSwitcher
              members={members}
              currentMember={currentMember}
              onChange={(m) => setCurrentMember(m.id)}
            />
          )}
        </div>
      </header>

      {/* 主体内容 */}
      <main className="flex-1 overflow-y-auto pb-24 scroll-area">
        {tab === 'home' && currentMember && (
          <HomeTab
            currentMember={currentMember}
            members={members}
            onPointsChanged={refreshMembers}
          />
        )}
        {tab === 'schedule' && currentMember && (
          <ScheduleTab
            currentMember={currentMember}
            members={members}
            onPointsChanged={refreshMembers}
          />
        )}
        {tab === 'rewards' && currentMember && (
          <RewardsTab
            currentMember={currentMember}
            members={members}
            onPointsChanged={refreshMembers}
          />
        )}
        {tab === 'planning' && currentMember && (
          <PlanningTab
            currentMember={currentMember}
            members={members}
            onPointsChanged={refreshMembers}
          />
        )}
        {tab === 'family' && (
          <FamilyTab members={members} onChange={refreshMembers} />
        )}
      </main>

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card/95 backdrop-blur-md border-t border-border z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {tabs.map(({ key, label, icon: Icon }) => {
            const active = tab === key
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] ${active ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

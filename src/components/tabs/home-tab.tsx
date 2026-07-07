'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, ActivityWithLog, Member, Encouragement, api, SCHEDULE_LABEL } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle2,
  Clock,
  Zap,
  Target,
  AlertTriangle,
  Sparkles,
  Clock3,
  XCircle,
  UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { PendingVerificationPanel } from '@/components/shared/pending-verification-panel'

interface Props {
  currentMember: Member
  members: Member[]
  onPointsChanged: () => void
}

export function HomeTab({ currentMember, members, onPointsChanged }: Props) {
  const [activities, setActivities] = useState<ActivityWithLog[]>([])
  const [encouragements, setEncouragements] = useState<Encouragement[]>([])
  const [logs, setLogs] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)
  const [pendingRefreshKey, setPendingRefreshKey] = useState(0)
  const [selectedChildId, setSelectedChildId] = useState<string>('')

  const isChild = currentMember.role === 'child'
  const isParent = currentMember.role === 'mom' || currentMember.role === 'dad'

  const children = members.filter((m) => m.role === 'child')

  // 家长视角下默认显示第一个孩子的任务，可通过 selectedChildId 切换
  const childMember = isChild
    ? currentMember
    : children.find((m) => m.id === selectedChildId) || children[0] || null

  const loadAll = useCallback(async () => {
    try {
      if (!childMember) {
        setActivities([])
        const encs = await api<Encouragement[]>('/api/encouragements')
        setEncouragements(encs)
        setLoading(false)
        return
      }

      const [todayActs, encs, todayLogs] = await Promise.all([
        api<Activity[]>(`/api/activities?today=1&assignedToId=${childMember.id}`),
        api<Encouragement[]>('/api/encouragements'),
        api<any[]>(`/api/activities/logs?memberId=${childMember.id}&days=3`),
      ])
      setActivities(todayActs as ActivityWithLog[])
      setEncouragements(encs)

      // 用 activity log 构建今日状态 map
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const logMap: Record<string, any> = {}
      for (const log of todayLogs) {
        if (log.occurrenceDate?.startsWith(todayStr)) {
          logMap[log.activityId] = log
        }
      }
      setLogs(logMap)
    } catch (e) {
      console.error(e)
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [childMember])

  useEffect(() => {
    setLoading(true)
    loadAll()
  }, [loadAll])

  const handleComplete = async (activityId: string) => {
    if (!childMember) return
    setCompleting(activityId)
    try {
      const body: any = { activityId, memberId: childMember.id }
      if (isParent) {
        body.operatorId = currentMember.id
      }
      const res = await api<{ message: string }>('/api/activities/complete', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      toast.success(res.message || '打卡成功')
      await loadAll()
      setPendingRefreshKey((k) => k + 1)
      onPointsChanged()
    } catch (e: any) {
      toast.error(e.message || '完成失败')
    } finally {
      setCompleting(null)
    }
  }

  const handleCheckPenalty = async () => {
    if (!childMember) return
    try {
      const res = await api<{ processed: number }>('/api/activities/check-penalty', {
        method: 'POST',
        body: JSON.stringify({ memberId: childMember.id }),
      })
      if (res.processed === 0) {
        toast.success('没有未完成的活动需要扣分')
      } else {
        toast.warning(`已扣分 ${res.processed} 项`)
      }
      await loadAll()
      onPointsChanged()
    } catch (e: any) {
      toast.error(e.message || '检查失败')
    }
  }

  // 统计
  const total = activities.length
  const checked = activities.filter((a) => logs[a.id]?.status === 'completed').length
  const pendingVerify = activities.filter(
    (a) => logs[a.id]?.status === 'pending_verification'
  ).length
  const rejected = activities.filter((a) => logs[a.id]?.status === 'rejected').length
  const notChecked = total - checked - pendingVerify - rejected

  const displayPoints = childMember?.totalPoints || 0

  // 当前等级
  const sortedEncs = [...encouragements].sort((a, b) => a.threshold - b.threshold)
  let currentLevel: Encouragement | null = null
  let nextLevel: Encouragement | null = null
  for (let i = 0; i < sortedEncs.length; i++) {
    if (displayPoints >= sortedEncs[i].threshold) {
      currentLevel = sortedEncs[i]
      nextLevel = sortedEncs[i + 1] || null
    } else if (!nextLevel) {
      nextLevel = sortedEncs[i]
    }
  }
  const levelProgress =
    currentLevel && nextLevel
      ? Math.min(
          100,
          ((displayPoints - currentLevel.threshold) /
            (nextLevel.threshold - currentLevel.threshold)) *
            100
        )
      : currentLevel
      ? 100
      : nextLevel
      ? Math.min(100, (displayPoints / nextLevel.threshold) * 100)
      : 0

  const now = new Date()
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
  const weekday = ['', '周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]

  return (
    <div className="p-4 space-y-4">
      {/* 顶部欢迎卡片 */}
      <Card className="p-5 bg-gradient-to-br from-primary to-[#FF7A1C] text-primary-foreground border-0 shadow-lg">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm opacity-90">{dateStr} · {weekday}</p>
            <h2 className="text-xl font-bold mt-0.5">
              {isParent && childMember
                ? `${childMember.avatar} ${childMember.name} 的任务`
                : `${currentMember.avatar} ${currentMember.name}，加油！`}
            </h2>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black tabular-nums">{displayPoints}</div>
            <div className="text-xs opacity-90">已审核积分</div>
          </div>
        </div>
        {currentLevel && (
          <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{currentLevel.icon}</span>
              <div>
                <div className="text-sm font-semibold">{currentLevel.title}</div>
                <div className="text-[11px] opacity-90">{currentLevel.message}</div>
              </div>
            </div>
            {nextLevel && (
              <>
                <Progress value={levelProgress} className="h-1.5 bg-white/20 mt-2" />
                <p className="text-[10px] opacity-80 mt-1">
                  距离「{nextLevel.icon} {nextLevel.title}」还差 {nextLevel.threshold - displayPoints} 分
                </p>
              </>
            )}
          </div>
        )}
      </Card>

      {/* 家长视角下切换孩子 */}
      {isParent && children.length > 1 && (
        <div className="flex gap-1 overflow-x-auto scroll-area">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedChildId(c.id)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                childMember?.id === c.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border hover:bg-muted'
              }`}
            >
              <span className="text-base">{c.avatar}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* 待审核面板（仅家长可见） */}
      <PendingVerificationPanel
        currentMember={currentMember}
        refreshKey={pendingRefreshKey}
        onVerified={() => {
          loadAll()
          setPendingRefreshKey((k) => k + 1)
          onPointsChanged()
        }}
      />

      {/* 今日数据小卡片 */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="p-2 text-center">
          <Target className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <div className="text-base font-bold tabular-nums">{total}</div>
          <div className="text-[10px] text-muted-foreground">总任务</div>
        </Card>
        <Card className="p-2 text-center bg-accent/30">
          <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-accent-foreground" />
          <div className="text-base font-bold tabular-nums">{checked}</div>
          <div className="text-[10px] text-muted-foreground">已审核</div>
        </Card>
        <Card className="p-2 text-center bg-amber-50">
          <Clock3 className="w-4 h-4 mx-auto mb-1 text-amber-500" />
          <div className="text-base font-bold tabular-nums">{pendingVerify}</div>
          <div className="text-[10px] text-muted-foreground">待审核</div>
        </Card>
        <Card className="p-2 text-center">
          <Zap className="w-4 h-4 mx-auto mb-1 text-primary" />
          <div className="text-base font-bold tabular-nums">{notChecked}</div>
          <div className="text-[10px] text-muted-foreground">待打卡</div>
        </Card>
      </div>

      {/* 今日待办 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> 今日待办
            {isParent && childMember && (
              <Badge variant="outline" className="text-[10px] ml-1">
                <UserCheck className="w-2.5 h-2.5 mr-0.5" /> 可代打卡
              </Badge>
            )}
          </h3>
          {isParent && notChecked > 0 && (
            <Button size="sm" variant="outline" onClick={handleCheckPenalty} className="h-7 text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" /> 扣分检查
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">加载中...</div>
        ) : activities.length === 0 ? (
          <Card className="p-6 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-sm text-muted-foreground">今天没有任务，好好休息！</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {activities.map((a) => {
              const log = logs[a.id]
              const status = log?.status
              const isCompleted = status === 'completed'
              const isPendingVerify = status === 'pending_verification'
              const isRejected = status === 'rejected'

              return (
                <Card
                  key={a.id}
                  className={`p-3 flex items-center gap-3 card-pressable ${
                    isCompleted
                      ? 'bg-emerald-50 border-emerald-300'
                      : isPendingVerify
                      ? 'bg-amber-50 border-amber-300'
                      : isRejected
                      ? 'bg-red-50 border-red-300'
                      : 'bg-card'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{a.title}</span>
                      {a.scheduledTime && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                          {a.scheduledTime}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Sparkles className="w-3 h-3 text-primary" />
                        {a.points} 分
                      </span>
                      {a.onTimeBonus > 0 && (
                        <span className="text-accent-foreground">按时 +{a.onTimeBonus}</span>
                      )}
                      <span className="text-muted-foreground/70">· {SCHEDULE_LABEL[a.scheduleType]}</span>
                    </div>
                  </div>

                  {isCompleted ? (
                    <Badge className="bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="w-3 h-3 mr-0.5" /> 已审核
                    </Badge>
                  ) : isPendingVerify ? (
                    <Badge className="bg-amber-100 text-amber-700">
                      <Clock3 className="w-3 h-3 mr-0.5" /> 待审核
                    </Badge>
                  ) : isRejected ? (
                    <Badge className="bg-red-100 text-red-700">
                      <XCircle className="w-3 h-3 mr-0.5" /> 已拒绝
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      disabled={completing === a.id}
                      onClick={() => handleComplete(a.id)}
                      className="h-9"
                    >
                      {completing === a.id ? (
                        '提交中...'
                      ) : isParent ? (
                        <>
                          <UserCheck className="w-4 h-4 mr-1" /> 代打卡
                        </>
                      ) : (
                        '打卡'
                      )}
                    </Button>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* 鼓励阈值列表 */}
      {encouragements.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> 积分里程碑
          </h3>
          <Card className="p-3">
            <div className="space-y-2">
              {sortedEncs.map((e) => {
                const reached = displayPoints >= e.threshold
                return (
                  <div key={e.id} className={`flex items-center gap-3 p-2 rounded-lg ${reached ? 'bg-accent/30' : ''}`}>
                    <span className={`text-2xl ${reached ? '' : 'grayscale opacity-50'}`}>{e.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {e.title} · <span className="text-primary tabular-nums">{e.threshold}</span> 分
                      </div>
                      <div className="text-[11px] text-muted-foreground">{e.message}</div>
                    </div>
                    {reached && <CheckCircle2 className="w-4 h-4 text-accent-foreground" />}
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

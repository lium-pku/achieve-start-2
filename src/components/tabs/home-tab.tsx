'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, ActivityWithLog, Member, Encouragement, api, SCHEDULE_LABEL } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, Clock, Zap, Target, AlertTriangle, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  currentMember: Member
  members: Member[]
  onPointsChanged: () => void
}

export function HomeTab({ currentMember, onPointsChanged }: Props) {
  const [activities, setActivities] = useState<ActivityWithLog[]>([])
  const [encouragements, setEncouragements] = useState<Encouragement[]>([])
  const [logs, setLogs] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)
  const [floatPoints, setFloatPoints] = useState<{ id: string; amount: number } | null>(null)

  const isChild = currentMember.role === 'child'

  const loadAll = useCallback(async () => {
    try {
      const [todayActs, encs] = await Promise.all([
        api<Activity[]>(`/api/activities?today=1&assignedToId=${currentMember.id}`),
        api<Encouragement[]>('/api/encouragements'),
      ])
      setActivities(todayActs as ActivityWithLog[])
      setEncouragements(encs)

      // 拉取今日完成情况
      if (todayActs.length > 0) {
        const txs = await api<any[]>(`/api/points/${currentMember.id}`)
        const today = new Date()
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        const logMap: Record<string, any> = {}
        for (const tx of txs) {
          if (tx.createdAt?.startsWith(todayStr) && tx.activityId) {
            logMap[tx.activityId] = tx
          }
        }
        setLogs(logMap)
      }
    } catch (e) {
      console.error(e)
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [currentMember.id])

  useEffect(() => {
    setLoading(true)
    loadAll()
  }, [loadAll])

  const handleComplete = async (activityId: string) => {
    setCompleting(activityId)
    try {
      const res = await api<{ pointsAwarded: number; bonusAwarded: number; onTime: boolean; totalPoints: number }>('/api/activities/complete', {
        method: 'POST',
        body: JSON.stringify({ activityId, memberId: currentMember.id }),
      })
      const total = res.pointsAwarded + res.bonusAwarded
      setFloatPoints({ id: activityId, amount: total })
      setTimeout(() => setFloatPoints(null), 1000)
      toast.success(`完成！+${total} 分${res.onTime ? '（含按时奖励）' : ''}`)
      await loadAll()
      onPointsChanged()
    } catch (e: any) {
      toast.error(e.message || '完成失败')
    } finally {
      setCompleting(null)
    }
  }

  const handleCheckPenalty = async () => {
    try {
      const res = await api<{ processed: number; results: any[] }>('/api/activities/check-penalty', {
        method: 'POST',
        body: JSON.stringify({ memberId: currentMember.id }),
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
  const completed = activities.filter((a) => logs[a.id]).length
  const pending = total - completed
  const todayEarned = activities
    .filter((a) => logs[a.id])
    .reduce((s, a) => s + (logs[a.id]?.amount || 0), 0)

  // 当前等级
  const sortedEncs = [...encouragements].sort((a, b) => a.threshold - b.threshold)
  let currentLevel: Encouragement | null = null
  let nextLevel: Encouragement | null = null
  for (let i = 0; i < sortedEncs.length; i++) {
    if (currentMember.totalPoints >= sortedEncs[i].threshold) {
      currentLevel = sortedEncs[i]
      nextLevel = sortedEncs[i + 1] || null
    } else if (!nextLevel) {
      nextLevel = sortedEncs[i]
    }
  }
  const levelProgress = currentLevel && nextLevel
    ? Math.min(100, ((currentMember.totalPoints - currentLevel.threshold) / (nextLevel.threshold - currentLevel.threshold)) * 100)
    : currentLevel ? 100 : nextLevel ? Math.min(100, (currentMember.totalPoints / nextLevel.threshold) * 100) : 0

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
              {currentMember.avatar} {currentMember.name}，加油！
            </h2>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black tabular-nums">{currentMember.totalPoints}</div>
            <div className="text-xs opacity-90">累计积分</div>
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
                  距离「{nextLevel.icon} {nextLevel.title}」还差 {nextLevel.threshold - currentMember.totalPoints} 分
                </p>
              </>
            )}
          </div>
        )}
      </Card>

      {/* 今日数据小卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <Target className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <div className="text-lg font-bold tabular-nums">{total}</div>
          <div className="text-[10px] text-muted-foreground">今日任务</div>
        </Card>
        <Card className="p-3 text-center bg-accent/30">
          <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-accent-foreground" />
          <div className="text-lg font-bold tabular-nums">{completed}</div>
          <div className="text-[10px] text-muted-foreground">已完成</div>
        </Card>
        <Card className="p-3 text-center">
          <Zap className="w-4 h-4 mx-auto mb-1 text-primary" />
          <div className="text-lg font-bold tabular-nums">+{todayEarned}</div>
          <div className="text-[10px] text-muted-foreground">今日获得</div>
        </Card>
      </div>

      {/* 今日待办 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> 今日待办
          </h3>
          {!isChild && pending > 0 && (
            <Button size="sm" variant="outline" onClick={handleCheckPenalty} className="h-7 text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" /> 检查扣分
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
              const isDone = !!log
              return (
                <Card
                  key={a.id}
                  className={`p-3 flex items-center gap-3 card-pressable ${
                    isDone ? 'bg-accent/20 border-accent' : 'bg-card'
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
                  {isChild ? (
                    <div className="relative">
                      <Button
                        size="sm"
                        disabled={isDone || completing === a.id}
                        onClick={() => handleComplete(a.id)}
                        className={`h-9 ${isDone ? 'bg-accent text-accent-foreground hover:bg-accent' : ''}`}
                      >
                        {isDone ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-1" /> 已完成
                          </>
                        ) : completing === a.id ? (
                          '提交中...'
                        ) : (
                          '打卡'
                        )}
                      </Button>
                      {floatPoints?.id === a.id && (
                        <div className="absolute -top-2 right-0 text-primary font-bold text-sm animate-float-up pointer-events-none">
                          +{floatPoints.amount}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {isDone ? (
                        <Badge className="bg-accent text-accent-foreground">已完成</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">待完成</Badge>
                      )}
                    </div>
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
                const reached = currentMember.totalPoints >= e.threshold
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

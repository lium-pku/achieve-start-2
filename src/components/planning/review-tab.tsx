'use client'

import { useCallback, useEffect, useState } from 'react'
import { Member, api } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock3,
  Target,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface StatsData {
  period: string
  offset: number
  periodStart: string
  periodEnd: string
  totalTasks: number
  completedTasks: number
  onTimeTasks: number
  missedTasks: number
  completionRate: number
  onTimeRate: number
  pointsEarned: number
  pointsPenalty: number
  pointsRedeem: number
  pointsNet: number
  trend: Array<{
    label: string
    completionRate: number
    onTimeRate: number
    pointsNet: number
  }>
}

interface Props {
  currentMember: Member
  members: Member[]
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  e.setDate(e.getDate() - 1) // 显示为闭区间
  return `${s.getMonth() + 1}/${s.getDate()} - ${e.getMonth() + 1}/${e.getDate()}`
}

export function ReviewTab({ currentMember, members }: Props) {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly')
  const [offset, setOffset] = useState(0)
  const [memberId, setMemberId] = useState<string>(currentMember.id)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  // 家长视角默认选第一个孩子
  useEffect(() => {
    if (currentMember.role !== 'child') {
      const child = members.find((m) => m.role === 'child')
      if (child) setMemberId(child.id)
    } else {
      setMemberId(currentMember.id)
    }
  }, [currentMember, members])

  const load = useCallback(async () => {
    if (!memberId) return
    setLoading(true)
    try {
      const data = await api<StatsData>(
        `/api/stats?memberId=${memberId}&period=${period}&offset=${offset}`
      )
      setStats(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [memberId, period, offset])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-3">
      {/* 周期切换 + 成员选择 */}
      <div className="flex items-center justify-between gap-2">
        <Tabs value={period} onValueChange={(v) => { setPeriod(v as any); setOffset(0) }}>
          <TabsList className="grid grid-cols-2 w-32">
            <TabsTrigger value="weekly" className="text-xs">周报</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs">月报</TabsTrigger>
          </TabsList>
        </Tabs>
        {currentMember.role !== 'child' && members.length > 1 && (
          <Tabs value={memberId} onValueChange={setMemberId}>
            <TabsList style={{ display: 'flex' }}>
              {members.map((m) => (
                <TabsTrigger key={m.id} value={m.id} className="text-xs px-2">
                  {m.avatar}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* 时间导航 */}
      <div className="flex items-center justify-between">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => setOffset((o) => o + 1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center">
          {stats && (
            <>
              <div className="text-sm font-semibold">
                {offset === 0 ? `本${period === 'weekly' ? '周' : '月'}` : `前${offset}个${period === 'weekly' ? '周' : '月'}`}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {formatDateRange(stats.periodStart, stats.periodEnd)}
              </div>
            </>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          disabled={offset === 0}
          onClick={() => setOffset((o) => Math.max(0, o - 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">加载中...</div>
      ) : !stats ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">暂无数据</p>
        </Card>
      ) : (
        <>
          {/* 数字卡片 */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-[11px] text-muted-foreground">任务完成率</span>
              </div>
              <div className="text-2xl font-bold tabular-nums">
                {stats.completionRate}%
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {stats.completedTasks} / {stats.totalTasks} 个任务
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock3 className="w-4 h-4 text-amber-500" />
                <span className="text-[11px] text-muted-foreground">按时完成率</span>
              </div>
              <div className="text-2xl font-bold tabular-nums">
                {stats.onTimeRate}%
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {stats.onTimeTasks} 个按时完成
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-[11px] text-muted-foreground">净增积分</span>
              </div>
              <div className={`text-2xl font-bold tabular-nums ${stats.pointsNet >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {stats.pointsNet >= 0 ? '+' : ''}{stats.pointsNet}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                +{stats.pointsEarned} / -{stats.pointsPenalty}
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-red-500" />
                <span className="text-[11px] text-muted-foreground">未完成/扣分</span>
              </div>
              <div className="text-2xl font-bold tabular-nums text-destructive">
                {stats.missedTasks}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                兑换 {stats.pointsRedeem} 分
              </div>
            </Card>
          </div>

          {/* 趋势折线图 */}
          <Card className="p-3">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">
              最近 4 个{period === 'weekly' ? '周' : '月'}趋势
            </h4>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <LineChart data={stats.trend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    formatter={(value: any, name: any) => {
                      if (name === '完成率' || name === '按时率') return [`${value}%`, name]
                      return [value, name]
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="completionRate"
                    name="完成率"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="onTimeRate"
                    name="按时率"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pointsNet"
                    name="净积分"
                    stroke="#FF9A3C"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

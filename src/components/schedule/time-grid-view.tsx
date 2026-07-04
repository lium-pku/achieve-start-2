'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Activity,
  SCHEDULE_LABEL,
  api,
} from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  GripVertical,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  activities: Activity[]
  todayLogs: Record<string, any>
  currentMember: any
  members?: any[]
  selectedMemberId?: string
  onSelectedMemberChange?: (id: string) => void
  onReload: () => void
  onActivityClick: (a: Activity) => void
  onActivityEdit?: (a: Activity) => void
}

// 时间字符串转分钟数
function timeToMin(t: string | null): number | null {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minToTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const HOUR_PX = 64
const MIN_BAR_HEIGHT = 32
const TIME_LABEL_WIDTH = 52
const DRAG_THRESHOLD = 5

function getTimeRange(activities: Activity[]): { start: number; end: number } {
  if (activities.length === 0) return { start: 7 * 60, end: 22 * 60 }
  let min = 24 * 60
  let max = 0
  for (const a of activities) {
    const s = timeToMin(a.scheduledTime)
    const d = timeToMin(a.deadline)
    if (s !== null) {
      min = Math.min(min, s)
      max = Math.max(max, d ?? s + 60)
    }
  }
  if (max === 0) return { start: 7 * 60, end: 22 * 60 }
  const start = Math.max(0, Math.floor((min - 30) / 60) * 60)
  const end = Math.min(24 * 60, Math.ceil((max + 30) / 60) * 60)
  return { start, end }
}

interface ActivityGroup {
  activities: Activity[]
  laneCount: number
}

function groupOverlapping(activities: Activity[]): ActivityGroup[] {
  const valid = activities.filter((a) => a.scheduledTime)
  if (valid.length === 0) return []
  const sorted = [...valid].sort((a, b) => timeToMin(a.scheduledTime)! - timeToMin(b.scheduledTime)!)
  const groups: ActivityGroup[] = []
  let currentGroup: Activity[] = []
  let currentEnd = 0
  for (const a of sorted) {
    const s = timeToMin(a.scheduledTime)!
    const e = timeToMin(a.deadline) ?? s + 60
    if (currentGroup.length > 0 && s >= currentEnd) {
      groups.push({ activities: currentGroup, laneCount: currentGroup.length })
      currentGroup = []
    }
    currentGroup.push(a)
    currentEnd = Math.max(currentEnd, e)
  }
  if (currentGroup.length > 0) {
    groups.push({ activities: currentGroup, laneCount: currentGroup.length })
  }
  for (const g of groups) {
    const lanes: number[] = []
    g.activities.forEach((a) => {
      const s = timeToMin(a.scheduledTime)!
      const e = timeToMin(a.deadline) ?? s + 60
      let assigned = -1
      for (let i = 0; i < lanes.length; i++) {
        if (lanes[i] <= s) { assigned = i; lanes[i] = e; break }
      }
      if (assigned === -1) { lanes.push(e); assigned = lanes.length - 1 }
      ;(a as any)._lane = assigned
    })
    g.laneCount = lanes.length
  }
  return groups
}

interface DragState {
  activityId: string
  startY: number
  deltaMin: number
  moved: boolean
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDateLabel(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function getWeekdayLabel(date: Date): string {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
}

function isSameDay(a: Date, b: Date): boolean {
  return formatDate(a) === formatDate(b)
}

// 获取一周的 7 天（周一到周日）
function getWeekDays(date: Date): Date[] {
  const day = date.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(monday.getDate() + diffToMonday)
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    days.push(d)
  }
  return days
}

export function TimeGridView({
  activities,
  todayLogs,
  currentMember,
  members,
  selectedMemberId,
  onSelectedMemberChange,
  onReload,
  onActivityClick,
}: Props) {
  const isParent = currentMember.role === 'mom' || currentMember.role === 'dad'
  const containerRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [hoverTime, setHoverTime] = useState<{ id: string; start: string; end: string } | null>(null)
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [selectedDate, setSelectedDate] = useState(new Date())

  const pxToMin = useCallback((px: number) => (px / HOUR_PX) * 60, [])
  const dragStateRef = useRef<DragState | null>(null)
  const [, forceRender] = useState(0)
  const justDraggedRef = useRef(false)

  const setDragState = (s: DragState | null) => {
    dragStateRef.current = s
    forceRender((n) => n + 1)
  }
  const dragState = dragStateRef.current

  const handlePointerDown = (e: React.PointerEvent, activity: Activity) => {
    if (!isParent) return
    setDragState({
      activityId: activity.id,
      startY: e.clientY,
      deltaMin: 0,
      moved: false,
    })
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const ds = dragStateRef.current
    if (!ds) return
    const dy = e.clientY - ds.startY
    if (Math.abs(dy) <= DRAG_THRESHOLD) return
    if (!ds.moved) {
      ds.moved = true
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
    }
    const dmin = pxToMin(dy)
    const snapped = Math.round(dmin / 5) * 5
    ds.deltaMin = snapped
    forceRender((n) => n + 1)
    const activity = activities.find((a) => a.id === ds.activityId)
    if (activity) {
      const s = timeToMin(activity.scheduledTime)!
      const d = timeToMin(activity.deadline) ?? s + 60
      setHoverTime({
        id: activity.id,
        start: minToTime(Math.max(0, s + snapped)),
        end: minToTime(Math.min(24 * 60, d + snapped)),
      })
    }
  }

  const handlePointerUp = async (e: React.PointerEvent) => {
    const ds = dragStateRef.current
    if (!ds) return
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    const wasMoved = ds.moved
    const deltaMin = ds.deltaMin
    const activityId = ds.activityId
    setDragState(null)
    setHoverTime(null)
    if (!wasMoved || deltaMin === 0) return
    justDraggedRef.current = true
    setTimeout(() => { justDraggedRef.current = false }, 100)
    const activity = activities.find((a) => a.id === activityId)
    if (!activity) return
    const newStart = Math.max(0, (timeToMin(activity.scheduledTime) ?? 0) + deltaMin)
    const newEnd = Math.min(24 * 60, (timeToMin(activity.deadline) ?? newStart + 60) + deltaMin)
    setSaving(activityId)
    try {
      await api(`/api/activities/${activity.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ scheduledTime: minToTime(newStart), deadline: minToTime(newEnd) }),
      })
      toast.success(`时间已更新为 ${minToTime(newStart)} - ${minToTime(newEnd)}`)
      onReload()
    } catch (err: any) {
      toast.error(err.message || '更新失败')
    } finally {
      setSaving(null)
    }
  }

  const handleClick = (a: Activity) => {
    if (justDraggedRef.current) return
    onActivityClick(a)
  }

  // 日视图：过滤当天活动
  const dayActivities = useMemo(() => {
    return activities.filter((a) => {
      // 网格视图显示选中天所有活动（不区分周期类型）
      return true
    })
  }, [activities])

  const { start: rangeStart, end: rangeEnd } = useMemo(() => getTimeRange(dayActivities), [dayActivities])
  const totalMin = rangeEnd - rangeStart
  const totalHeight = (totalMin / 60) * HOUR_PX

  const hours = useMemo(() => {
    const arr: number[] = []
    for (let h = Math.floor(rangeStart / 60); h <= Math.ceil(rangeEnd / 60); h++) {
      if (h * 60 >= rangeStart && h * 60 <= rangeEnd) arr.push(h)
    }
    return arr
  }, [rangeStart, rangeEnd])

  const groups = useMemo(() => groupOverlapping(dayActivities), [dayActivities])
  const untimedActivities = useMemo(() => activities.filter((a) => !a.scheduledTime), [activities])

  const renderBar = (a: Activity, laneCount: number) => {
    const s = timeToMin(a.scheduledTime)!
    const e = timeToMin(a.deadline) ?? s + 60
    const top = ((s - rangeStart) / 60) * HOUR_PX
    const height = Math.max(MIN_BAR_HEIGHT, ((e - s) / 60) * HOUR_PX - 2)
    const lane = (a as any)._lane || 0
    const barWidthPercent = 100 / laneCount
    const barLeftPercent = lane * barWidthPercent

    const log = todayLogs[a.id]
    const status = log?.status || 'pending'
    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()
    const isOverdue = !log && a.deadline && nowMin > timeToMin(a.deadline)!

    const statusClass =
      status === 'completed' ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
      : status === 'pending_verification' ? 'bg-amber-100 border-amber-400 text-amber-900'
      : status === 'rejected' ? 'bg-red-100 border-red-400 text-red-900'
      : status === 'missed' ? 'bg-zinc-200 border-zinc-400 text-zinc-600'
      : isOverdue ? 'bg-red-100 border-red-400 text-red-900'
      : 'bg-primary/15 border-primary text-primary-foreground'

    const isDragging = dragState?.activityId === a.id && dragState.moved
    const dragDeltaTop = isDragging ? (dragState!.deltaMin / 60) * HOUR_PX : 0

    return (
      <div
        key={a.id}
        className={`absolute rounded-lg border-2 px-1.5 py-1 cursor-pointer shadow-sm transition-shadow hover:shadow-md select-none flex flex-col overflow-hidden pointer-events-auto ${
          statusClass
        } ${isDragging ? 'ring-2 ring-primary ring-offset-1 z-20 opacity-90' : ''}`}
        style={{
          left: `calc(${barLeftPercent}% + 2px)`,
          width: `calc(${barWidthPercent}% - 4px)`,
          top: top + dragDeltaTop,
          height,
        }}
        onPointerDown={(e) => handlePointerDown(e, a)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={() => handleClick(a)}
        title={`${a.title} ${a.scheduledTime}-${a.deadline || minToTime(s + 60)}`}
      >
        <div className="flex items-center gap-1 shrink-0">
          {isParent && <GripVertical className="w-3 h-3 shrink-0 opacity-60" />}
          <div className="text-[11px] font-semibold truncate flex-1 leading-tight">{a.title}</div>
          {saving === a.id && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
          {status === 'completed' && <CheckCircle2 className="w-3 h-3 shrink-0" />}
        </div>
        <div className="text-[9px] opacity-80 truncate shrink-0 mt-0.5">
          {a.scheduledTime}{a.deadline && ` → ${a.deadline}`}
        </div>
        {isDragging && hoverTime?.id === a.id && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap pointer-events-none z-30">
            {hoverTime.start} - {hoverTime.end}
          </div>
        )}
      </div>
    )
  }

  // 周视图渲染
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate])
  const today = new Date()

  const goPrevDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    setSelectedDate(d)
  }
  const goNextDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    setSelectedDate(d)
  }
  const goToday = () => setSelectedDate(new Date())

  return (
    <div className="space-y-3">
      {/* 视图切换 + 成员选择 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && setViewMode(v as 'day' | 'week')}
          className="bg-muted rounded-lg p-0.5 shrink-0"
        >
          <ToggleGroupItem value="day" className="px-3 h-7 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md">
            日视图
          </ToggleGroupItem>
          <ToggleGroupItem value="week" className="px-3 h-7 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md">
            周视图
          </ToggleGroupItem>
        </ToggleGroup>

        {/* 成员选择（家长视角）*/}
        {isParent && members && members.length > 0 && onSelectedMemberChange && (
          <div className="flex gap-1 overflow-x-auto scroll-area">
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => onSelectedMemberChange(m.id)}
                className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors ${
                  selectedMemberId === m.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border hover:bg-muted'
                }`}
              >
                <span className="text-base">{m.avatar}</span>
                <span>{m.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 日期导航 */}
      <div className="flex items-center justify-between">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={viewMode === 'day' ? goPrevDay : () => {
          const d = new Date(selectedDate)
          d.setDate(d.getDate() - 7)
          setSelectedDate(d)
        }}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center flex-1">
          <div className="text-sm font-semibold flex items-center justify-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {viewMode === 'day'
              ? `${formatDateLabel(selectedDate)} · ${getWeekdayLabel(selectedDate)}`
              : `${weekDays[0].getMonth() + 1}/${weekDays[0].getDate()} - ${weekDays[6].getMonth() + 1}/${weekDays[6].getDate()}`
            }
          </div>
          {!isSameDay(selectedDate, today) && (
            <button onClick={goToday} className="text-[10px] text-primary mt-0.5">
              回到今天
            </button>
          )}
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={viewMode === 'day' ? goNextDay : () => {
          const d = new Date(selectedDate)
          d.setDate(d.getDate() + 7)
          setSelectedDate(d)
        }}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* 说明条 */}
      <Card className="p-2.5 bg-muted/40">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>📅 {viewMode === 'day' ? formatDateLabel(selectedDate) : '本周'}时间轴 · 共 {dayActivities.length} 项</span>
          {isParent && <span className="flex items-center gap-1"><GripVertical className="w-3 h-3" />可拖动</span>}
        </div>
      </Card>

      {viewMode === 'day' ? (
        /* 日视图 */
        activities.length === 0 ? (
          <Card className="p-6 text-center">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm text-muted-foreground">当天没有安排活动</p>
          </Card>
        ) : (
          <Card className="p-3 overflow-hidden">
            <div className="relative flex" style={{ minHeight: totalHeight }}>
              <div className="relative shrink-0 border-r border-border bg-muted/30" style={{ width: TIME_LABEL_WIDTH, minHeight: totalHeight }}>
                {hours.map((h) => (
                  <div key={h} className="absolute left-0 right-0 text-[10px] text-muted-foreground tabular-nums" style={{ top: ((h * 60 - rangeStart) / 60) * HOUR_PX - 6 }}>
                    <div className="px-1 text-right pr-2 font-medium">{String(h).padStart(2, '0')}:00</div>
                  </div>
                ))}
              </div>
              <div className="relative flex-1" style={{ minHeight: totalHeight }}>
                {hours.map((h) => (
                  <div key={h} className="absolute left-0 right-0 border-t border-border/40" style={{ top: ((h * 60 - rangeStart) / 60) * HOUR_PX }} />
                ))}
                {(() => {
                  const nowMin = today.getHours() * 60 + today.getMinutes()
                  if (nowMin < rangeStart || nowMin > rangeEnd || !isSameDay(selectedDate, today)) return null
                  const top = ((nowMin - rangeStart) / 60) * HOUR_PX
                  return (
                    <div className="absolute left-0 right-0 border-t-2 border-red-500 z-10 pointer-events-none" style={{ top }}>
                      <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                      <div className="absolute right-1 -top-4 text-[9px] text-red-600 font-medium bg-background/80 px-1 rounded">
                        现在 {String(today.getHours()).padStart(2, '0')}:{String(today.getMinutes()).padStart(2, '0')}
                      </div>
                    </div>
                  )
                })()}
                {groups.map((group, gi) => (
                  <div key={gi} className="absolute inset-0 pointer-events-none">
                    {group.activities.map((a) => renderBar(a, group.laneCount))}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )
      ) : (
        /* 周视图：7 行紧凑俯览 */
        <Card className="p-2 space-y-1">
          {weekDays.map((day, idx) => {
            const isToday = isSameDay(day, today)
            const isSelected = isSameDay(day, selectedDate)
            // 过滤该天活动（用 isActiveOnDate 逻辑）
            const dayActs = activities.filter((a) => {
              const target = new Date(day)
              target.setHours(0, 0, 0, 0)
              const startDay = new Date(a.startDate)
              startDay.setHours(0, 0, 0, 0)
              if (startDay > target) return false
              if (a.scheduleType === 'daily') return true
              if (a.scheduleType === 'weekly') {
                const d = target.getDay()
                const td = d === 0 ? 7 : d
                return a.dayOfWeek === td
              }
              if (a.scheduleType === 'monthly') return a.dayOfMonth === target.getDate()
              if (a.scheduleType === 'once' && a.specificDate) {
                const spec = new Date(a.specificDate)
                spec.setHours(0, 0, 0, 0)
                return spec.getTime() === target.getTime()
              }
              return false
            })
            return (
              <button
                key={idx}
                onClick={() => { setSelectedDate(day); setViewMode('day') }}
                className={`w-full flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${
                  isSelected ? 'border-primary bg-primary/5' : isToday ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/40'
                }`}
              >
                <div className="shrink-0 w-12 text-center">
                  <div className="text-[10px] text-muted-foreground">{getWeekdayLabel(day)}</div>
                  <div className={`text-sm font-bold ${isToday ? 'text-primary' : ''}`}>{day.getDate()}</div>
                </div>
                <div className="flex-1 min-w-0">
                  {dayActs.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground/50">无活动</div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {dayActs.slice(0, 4).map((a) => (
                        <span key={a.id} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary truncate max-w-[80px]">
                          {a.scheduledTime && <span className="opacity-70">{a.scheduledTime} </span>}
                          {a.title}
                        </span>
                      ))}
                      {dayActs.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">+{dayActs.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </Card>
      )}

      {/* 图例 */}
      <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground px-1">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 bg-primary/15 border-primary" /> 待打卡</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 bg-amber-100 border-amber-400" /> 待审核</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 bg-emerald-100 border-emerald-400" /> 已通过</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 bg-red-100 border-red-400" /> 已拒绝/超时</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 bg-zinc-200 border-zinc-400" /> 已扣分</span>
      </div>

      {/* 未设定时间的活动 */}
      {untimedActivities.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2 px-1">
            ⏰ 未设定具体时间（{untimedActivities.length} 项）
          </h3>
          <div className="space-y-1.5">
            {untimedActivities.map((a) => {
              const log = todayLogs[a.id]
              const status = log?.status || 'pending'
              return (
                <Card
                  key={a.id}
                  className={`p-2.5 flex items-center gap-2 cursor-pointer hover:bg-muted/40 ${
                    status === 'completed' ? 'bg-emerald-50' : status === 'pending_verification' ? 'bg-amber-50' : status === 'rejected' ? 'bg-red-50' : ''
                  }`}
                  onClick={() => onActivityClick(a)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{a.title}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-primary" />
                      {a.points} 分
                      {a.onTimeBonus > 0 && <span className="text-accent-foreground">按时 +{a.onTimeBonus}</span>}
                      <span className="opacity-60">· {SCHEDULE_LABEL[a.scheduleType as keyof typeof SCHEDULE_LABEL] || a.scheduleType}</span>
                    </div>
                  </div>
                  {status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {status === 'pending_verification' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  {status === 'rejected' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

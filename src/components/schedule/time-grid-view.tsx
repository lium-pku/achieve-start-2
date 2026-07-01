'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ActivityWithLog,
  Member,
  SCHEDULE_LABEL,
  WEEKDAY_LABEL,
  api,
} from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  GripVertical,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  activities: Activity[]
  todayLogs: Record<string, any>
  currentMember: Member
  /** 重新加载数据 */
  onReload: () => void
  /** 打开活动详情 */
  onActivityClick: (a: Activity) => void
  /** 打开编辑对话框 */
  onActivityEdit?: (a: Activity) => void
}

// 时间字符串转分钟数
function timeToMin(t: string | null): number | null {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// 分钟数转 HH:mm
function minToTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// 每小时像素宽度
const HOUR_PX = 80
// 每行高度
const BAR_HEIGHT = 52
// 行间距
const ROW_GAP = 8
// 拖拽触发阈值（移动超过该距离才视为拖拽）
const DRAG_THRESHOLD = 5

// 计算智能时间范围
function getTimeRange(activities: Activity[]): { start: number; end: number } {
  if (activities.length === 0) {
    return { start: 7 * 60, end: 22 * 60 }
  }
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
  if (max === 0) {
    return { start: 7 * 60, end: 22 * 60 }
  }
  // 留 30 分钟边距，并按小时对齐
  const start = Math.max(0, Math.floor((min - 30) / 60) * 60)
  const end = Math.min(24 * 60, Math.ceil((max + 30) / 60) * 60)
  return { start, end }
}

// 重叠分组算法
interface ActivityGroup {
  activities: Activity[]
  laneCount: number
}

function groupOverlapping(activities: Activity[]): ActivityGroup[] {
  const valid = activities.filter((a) => a.scheduledTime)
  if (valid.length === 0) return []

  const sorted = [...valid].sort((a, b) => {
    const sa = timeToMin(a.scheduledTime)!
    const sb = timeToMin(b.scheduledTime)!
    return sa - sb
  })

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

  // 给每个活动分配 lane（同一组内并排）
  for (const g of groups) {
    const lanes: number[] = [] // 每个 lane 当前已占用的结束时间
    g.activities.forEach((a) => {
      const s = timeToMin(a.scheduledTime)!
      const e = timeToMin(a.deadline) ?? s + 60
      let assigned = -1
      for (let i = 0; i < lanes.length; i++) {
        if (lanes[i] <= s) {
          assigned = i
          lanes[i] = e
          break
        }
      }
      if (assigned === -1) {
        lanes.push(e)
        assigned = lanes.length - 1
      }
      ;(a as any)._lane = assigned
    })
    g.laneCount = lanes.length
  }

  return groups
}

interface DragState {
  activityId: string
  startX: number
  deltaMin: number
  moved: boolean
}

export function TimeGridView({
  activities,
  todayLogs,
  currentMember,
  onReload,
  onActivityClick,
}: Props) {
  const isParent = currentMember.role === 'mom' || currentMember.role === 'dad'
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [hoverTime, setHoverTime] = useState<{ id: string; start: string; end: string } | null>(null)

  // 计算时间范围和分组
  const { start: rangeStart, end: rangeEnd } = useMemo(() => getTimeRange(activities), [activities])
  const totalMin = rangeEnd - rangeStart
  const totalWidth = (totalMin / 60) * HOUR_PX

  const hours = useMemo(() => {
    const arr: number[] = []
    for (let h = Math.floor(rangeStart / 60); h <= Math.ceil(rangeEnd / 60); h++) {
      if (h * 60 >= rangeStart && h * 60 <= rangeEnd) arr.push(h)
    }
    return arr
  }, [rangeStart, rangeEnd])

  const groups = useMemo(() => groupOverlapping(activities), [activities])

  // 未设定时间的活动（无法放在网格上）
  const untimedActivities = useMemo(
    () => activities.filter((a) => !a.scheduledTime),
    [activities]
  )

  const pxToMin = useCallback((px: number) => (px / HOUR_PX) * 60, [])

  // 拖拽逻辑
  const handlePointerDown = (e: React.PointerEvent, activity: Activity) => {
    if (!isParent) return
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)

    setDragState({
      activityId: activity.id,
      startX: e.clientX,
      deltaMin: 0,
      moved: false,
    })
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return
    const dx = e.clientX - dragState.startX
    const dmin = pxToMin(dx)
    if (Math.abs(dx) > DRAG_THRESHOLD && !dragState.moved) {
      setDragState({ ...dragState, moved: true })
    }
    // 按 5 分钟对齐
    const snapped = Math.round(dmin / 5) * 5
    setDragState({ ...dragState, deltaMin: snapped })

    // 更新 hover 时间提示
    const activity = activities.find((a) => a.id === dragState.activityId)
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
    if (!dragState) return
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)

    const wasMoved = dragState.moved
    const deltaMin = dragState.deltaMin
    const activityId = dragState.activityId
    setDragState(null)
    setHoverTime(null)

    if (!wasMoved || deltaMin === 0) {
      // 视为点击
      const a = activities.find((x) => x.id === activityId)
      if (a) onActivityClick(a)
      return
    }

    // 拖拽结束，调用 API
    const activity = activities.find((a) => a.id === activityId)
    if (!activity) return
    const newStart = Math.max(0, (timeToMin(activity.scheduledTime) ?? 0) + deltaMin)
    const newEnd = Math.min(24 * 60, (timeToMin(activity.deadline) ?? newStart + 60) + deltaMin)
    setSaving(activityId)
    try {
      await api(`/api/activities/${activity.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          scheduledTime: minToTime(newStart),
          deadline: minToTime(newEnd),
        }),
      })
      toast.success(`时间已更新为 ${minToTime(newStart)} - ${minToTime(newEnd)}`)
      onReload()
    } catch (err: any) {
      toast.error(err.message || '更新失败')
    } finally {
      setSaving(null)
    }
  }

  // 渲染单个活动条
  const renderBar = (a: Activity, laneCount: number) => {
    const s = timeToMin(a.scheduledTime)!
    const e = timeToMin(a.deadline) ?? s + 60
    const left = ((s - rangeStart) / 60) * HOUR_PX
    const width = Math.max(40, ((e - s) / 60) * HOUR_PX)
    const lane = (a as any)._lane || 0
    const laneWidth = (totalWidth - left) / laneCount // 简化：剩余宽度均分
    // 实际并排时每个 lane 占据自己的宽度
    const barWidth = Math.min(width, laneWidth * 0.95)
    const barLeft = left + lane * (barWidth + 4)

    const log = todayLogs[a.id]
    const status = log
      ? log.amount > 0
        ? 'completed'
        : 'missed'
      : 'pending'

    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()
    const isOverdue = !log && a.deadline && nowMin > timeToMin(a.deadline)!

    // 状态色
    const statusClass =
      status === 'completed'
        ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
        : status === 'missed'
        ? 'bg-zinc-200 border-zinc-400 text-zinc-600'
        : isOverdue
        ? 'bg-red-100 border-red-400 text-red-900'
        : 'bg-primary/15 border-primary text-primary-foreground'

    const isDragging = dragState?.activityId === a.id && dragState.moved
    const dragDeltaLeft = isDragging ? (dragState!.deltaMin / 60) * HOUR_PX : 0

    return (
      <div
        key={a.id}
        className={`absolute top-1 rounded-lg border-2 px-2 py-1 cursor-pointer shadow-sm transition-shadow hover:shadow-md select-none ${
          statusClass
        } ${isDragging ? 'ring-2 ring-primary ring-offset-1 z-10 opacity-90' : ''}`}
        style={{
          left: barLeft + dragDeltaLeft,
          width: barWidth,
          height: BAR_HEIGHT - 4,
        }}
        onPointerDown={(e) => handlePointerDown(e, a)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        title={`${a.title} ${a.scheduledTime}-${a.deadline || minToTime(s + 60)}`}
      >
        <div className="flex items-center gap-1 h-full">
          {isParent && (
            <GripVertical className="w-3 h-3 shrink-0 opacity-60" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold truncate leading-tight">
              {a.title}
            </div>
            <div className="text-[9px] opacity-80 truncate">
              {a.scheduledTime}
              {a.deadline && ` → ${a.deadline}`}
            </div>
          </div>
          {saving === a.id && (
            <Loader2 className="w-3 h-3 animate-spin shrink-0" />
          )}
          {status === 'completed' && (
            <CheckCircle2 className="w-3 h-3 shrink-0" />
          )}
        </div>
        {/* 拖拽时显示时间提示气泡 */}
        {isDragging && hoverTime?.id === a.id && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap pointer-events-none z-20">
            {hoverTime.start} - {hoverTime.end}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 说明条 */}
      <Card className="p-2.5 bg-muted/40">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            📅 今日时间轴 · 共 {activities.length} 项
          </span>
          {isParent && (
            <span className="flex items-center gap-1">
              <GripVertical className="w-3 h-3" />
              可拖动条目调整时间
            </span>
          )}
        </div>
      </Card>

      {/* 网格主体 */}
      {activities.length === 0 ? (
        <Card className="p-6 text-center">
          <div className="text-3xl mb-2">📭</div>
          <p className="text-sm text-muted-foreground">今日没有安排活动</p>
        </Card>
      ) : (
        <Card className="p-3 overflow-hidden">
          <div className="overflow-x-auto scroll-area" ref={containerRef}>
            <div style={{ width: totalWidth, minWidth: '100%' }}>
              {/* 时间刻度 */}
              <div className="relative h-6 border-b border-border mb-1">
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute top-0 text-[10px] text-muted-foreground tabular-nums"
                    style={{ left: ((h * 60 - rangeStart) / 60) * HOUR_PX }}
                  >
                    <div className="border-l border-border h-2" />
                    <span className="ml-0.5">{String(h).padStart(2, '0')}:00</span>
                  </div>
                ))}
              </div>

              {/* 活动组 */}
              <div className="relative" style={{ height: groups.length * (BAR_HEIGHT + ROW_GAP) }}>
                {/* 网格背景线 */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute top-0 bottom-0 border-l border-border/40"
                    style={{ left: ((h * 60 - rangeStart) / 60) * HOUR_PX }}
                  />
                ))}

                {/* 当前时间指示线 */}
                {(() => {
                  const now = new Date()
                  const nowMin = now.getHours() * 60 + now.getMinutes()
                  if (nowMin < rangeStart || nowMin > rangeEnd) return null
                  const left = ((nowMin - rangeStart) / 60) * HOUR_PX
                  return (
                    <div
                      className="absolute top-0 bottom-0 border-l-2 border-red-500 z-10 pointer-events-none"
                      style={{ left }}
                    >
                      <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-red-500" />
                    </div>
                  )
                })()}

                {/* 活动条 */}
                {groups.map((group, gi) => (
                  <div
                    key={gi}
                    className="relative"
                    style={{
                      top: gi * (BAR_HEIGHT + ROW_GAP),
                      height: BAR_HEIGHT,
                    }}
                  >
                    {group.activities.map((a) => renderBar(a, group.laneCount))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 图例 */}
      <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground px-1">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border-2 bg-primary/15 border-primary" /> 待完成
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border-2 bg-emerald-100 border-emerald-400" /> 已完成
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border-2 bg-red-100 border-red-400" /> 已超时
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border-2 bg-zinc-200 border-zinc-400" /> 已扣分
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border-2 border-red-500" /> 当前时刻
        </span>
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
              const status = log ? (log.amount > 0 ? 'completed' : 'missed') : 'pending'
              return (
                <Card
                  key={a.id}
                  className={`p-2.5 flex items-center gap-2 cursor-pointer hover:bg-muted/40 ${
                    status === 'completed' ? 'bg-emerald-50' : ''
                  }`}
                  onClick={() => onActivityClick(a)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{a.title}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-primary" />
                      {a.points} 分
                      {a.onTimeBonus > 0 && (
                        <span className="text-accent-foreground">按时 +{a.onTimeBonus}</span>
                      )}
                      <span className="opacity-60">· {SCHEDULE_LABEL[a.scheduleType]}</span>
                    </div>
                  </div>
                  {status === 'completed' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Activity,
  SCHEDULE_LABEL,
  api,
} from '@/lib/types'
import { Card } from '@/components/ui/card'
import {
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
  currentMember: any
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

// 分钟数转 HH:mm
function minToTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// 每小时像素高度
const HOUR_PX = 64
// 活动条最小高度
const MIN_BAR_HEIGHT = 32
// 左侧时间标签宽度
const TIME_LABEL_WIDTH = 52
// 拖拽触发阈值
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

  // 给每个活动分配 lane
  for (const g of groups) {
    const lanes: number[] = []
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
  startY: number
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
  const [saving, setSaving] = useState<string | null>(null)
  const [hoverTime, setHoverTime] = useState<{ id: string; start: string; end: string } | null>(null)

  const { start: rangeStart, end: rangeEnd } = useMemo(() => getTimeRange(activities), [activities])
  const totalMin = rangeEnd - rangeStart
  const totalHeight = (totalMin / 60) * HOUR_PX

  const hours = useMemo(() => {
    const arr: number[] = []
    for (let h = Math.floor(rangeStart / 60); h <= Math.ceil(rangeEnd / 60); h++) {
      if (h * 60 >= rangeStart && h * 60 <= rangeEnd) arr.push(h)
    }
    return arr
  }, [rangeStart, rangeEnd])

  const groups = useMemo(() => groupOverlapping(activities), [activities])

  const untimedActivities = useMemo(
    () => activities.filter((a) => !a.scheduledTime),
    [activities]
  )

  const pxToMin = useCallback((px: number) => (px / HOUR_PX) * 60, [])

  // 用 ref 存储 dragState，避免 React 闭包陷阱（连续 move 事件读到旧 state）
  const dragStateRef = useRef<DragState | null>(null)
  const [, forceRender] = useState(0)
  // 用 ref 记录刚结束的拖拽（避免 click 紧跟着触发）
  const justDraggedRef = useRef(false)

  const setDragState = (s: DragState | null) => {
    dragStateRef.current = s
    forceRender((n) => n + 1)
  }
  const dragState = dragStateRef.current

  const handlePointerDown = (e: React.PointerEvent, activity: Activity) => {
    if (!isParent) return
    // 不阻止默认行为，不 capture，让 click 能正常触发
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
    // 超过阈值，开始真正的拖拽
    if (!ds.moved) {
      ds.moved = true
      // 现在 capture pointer，确保后续 move/up 都能收到
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

    if (!wasMoved || deltaMin === 0) {
      // 不是拖拽，让 onClick 来处理打开详情
      return
    }

    // 标记刚结束拖拽，阻止紧随的 click 事件
    justDraggedRef.current = true
    setTimeout(() => {
      justDraggedRef.current = false
    }, 100)

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

  // 点击打开详情（如果是拖拽刚结束则忽略）
  const handleClick = (a: Activity) => {
    if (justDraggedRef.current) return
    onActivityClick(a)
  }

  // 渲染单个活动条（纵向布局）
  const renderBar = (a: Activity, laneCount: number) => {
    const s = timeToMin(a.scheduledTime)!
    const e = timeToMin(a.deadline) ?? s + 60
    const top = ((s - rangeStart) / 60) * HOUR_PX
    const height = Math.max(MIN_BAR_HEIGHT, ((e - s) / 60) * HOUR_PX - 2)
    const lane = (a as any)._lane || 0
    // 用百分比宽度，每个 lane 占 1/laneCount
    const barWidthPercent = 100 / laneCount
    const barLeftPercent = lane * barWidthPercent

    const log = todayLogs[a.id]
    const status = log
      ? log.amount > 0
        ? 'completed'
        : 'missed'
      : 'pending'

    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()
    const isOverdue = !log && a.deadline && nowMin > timeToMin(a.deadline)!

    const statusClass =
      status === 'completed'
        ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
        : status === 'missed'
        ? 'bg-zinc-200 border-zinc-400 text-zinc-600'
        : isOverdue
        ? 'bg-red-100 border-red-400 text-red-900'
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
          {isParent && (
            <GripVertical className="w-3 h-3 shrink-0 opacity-60" />
          )}
          <div className="text-[11px] font-semibold truncate flex-1 leading-tight">
            {a.title}
          </div>
          {saving === a.id && (
            <Loader2 className="w-3 h-3 animate-spin shrink-0" />
          )}
          {status === 'completed' && (
            <CheckCircle2 className="w-3 h-3 shrink-0" />
          )}
        </div>
        <div className="text-[9px] opacity-80 truncate shrink-0 mt-0.5">
          {a.scheduledTime}
          {a.deadline && ` → ${a.deadline}`}
        </div>
        {/* 拖拽时显示时间提示气泡 */}
        {isDragging && hoverTime?.id === a.id && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap pointer-events-none z-30">
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
              可上下拖动调整时间
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
        <Card className="p-2 overflow-hidden">
          <div className="overflow-y-auto scroll-area" style={{ maxHeight: '65vh' }}>
            <div className="relative flex" style={{ minHeight: totalHeight }}>
              {/* 左侧时间刻度 */}
              <div
                className="relative shrink-0 border-r border-border bg-muted/30"
                style={{ width: TIME_LABEL_WIDTH, minHeight: totalHeight }}
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 text-[10px] text-muted-foreground tabular-nums"
                    style={{ top: ((h * 60 - rangeStart) / 60) * HOUR_PX - 6 }}
                  >
                    <div className="px-1 text-right pr-2 font-medium">
                      {String(h).padStart(2, '0')}:00
                    </div>
                  </div>
                ))}
              </div>

              {/* 右侧活动区 */}
              <div
                ref={containerRef}
                className="relative flex-1"
                style={{ minHeight: totalHeight }}
              >
                {/* 水平网格背景线（每小时一条） */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-border/40"
                    style={{ top: ((h * 60 - rangeStart) / 60) * HOUR_PX }}
                  />
                ))}

                {/* 当前时刻指示线（水平红线） */}
                {(() => {
                  const now = new Date()
                  const nowMin = now.getHours() * 60 + now.getMinutes()
                  if (nowMin < rangeStart || nowMin > rangeEnd) return null
                  const top = ((nowMin - rangeStart) / 60) * HOUR_PX
                  return (
                    <div
                      className="absolute left-0 right-0 border-t-2 border-red-500 z-10 pointer-events-none"
                      style={{ top }}
                    >
                      <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                      <div className="absolute right-1 -top-4 text-[9px] text-red-600 font-medium bg-background/80 px-1 rounded">
                        现在 {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
                      </div>
                    </div>
                  )
                })()}

                {/* 活动条（按组分配 lane 宽度） */}
                {groups.map((group, gi) => (
                  <div key={gi} className="absolute inset-0 pointer-events-none">
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

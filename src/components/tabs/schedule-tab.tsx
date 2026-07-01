'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  ActivityWithLog,
  Member,
  ScheduleType,
  SCHEDULE_LABEL,
  WEEKDAY_LABEL,
  api,
} from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Plus, Pencil, Trash2, Clock, Sparkles, AlertTriangle, List, Grid3x3 } from 'lucide-react'
import { ActivityDialog } from '@/components/dialogs/activity-dialog'
import { ActivityDetailDialog } from '@/components/schedule/activity-detail-dialog'
import { TimeGridView } from '@/components/schedule/time-grid-view'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface Props {
  currentMember: Member
  members: Member[]
  onPointsChanged: () => void
}

type ViewMode = 'list' | 'grid'

export function ScheduleTab({ currentMember, members }: Props) {
  const [allActivities, setAllActivities] = useState<Activity[]>([]) // 当日所有活动（网格视图用）
  const [listActivities, setListActivities] = useState<Activity[]>([]) // 当前 scheduleType 的活动（列表视图用）
  const [todayLogs, setTodayLogs] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [scheduleType, setScheduleType] = useState<ScheduleType>('daily')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Activity | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detailActivity, setDetailActivity] = useState<Activity | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const isParent = currentMember.role === 'mom' || currentMember.role === 'dad'

  // 加载列表视图数据
  const loadList = useCallback(async () => {
    try {
      const list = await api<Activity[]>(`/api/activities?scheduleType=${scheduleType}`)
      setListActivities(list)
    } catch (e) {
      console.error(e)
    }
  }, [scheduleType])

  // 加载网格视图数据（所有今日活动 + 完成日志）
  const loadGrid = useCallback(async () => {
    try {
      const isChild = currentMember.role === 'child'
      // 孩子只看分配给自己的活动；家长看所有今日活动
      const url = isChild
        ? `/api/activities?today=1&assignedToId=${currentMember.id}`
        : `/api/activities?today=1`
      const todayActs = await api<Activity[]>(url)
      setAllActivities(todayActs)

      // 收集需要查询日志的成员 ID（活动分配给的孩子）
      const memberIds = new Set<string>()
      todayActs.forEach((a) => {
        if (a.assignedToId) memberIds.add(a.assignedToId)
      })
      if (isChild) memberIds.add(currentMember.id)

      // 拉取所有相关成员的今日积分流水
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const logMap: Record<string, any> = {}
      await Promise.all(
        Array.from(memberIds).map(async (mid) => {
          try {
            const txs = await api<any[]>(`/api/points/${mid}`)
            for (const tx of txs) {
              if (tx.createdAt?.startsWith(todayStr) && tx.activityId) {
                // 同一活动只保留一条（取最新）
                if (!logMap[tx.activityId] || new Date(tx.createdAt) > new Date(logMap[tx.activityId].createdAt)) {
                  logMap[tx.activityId] = tx
                }
              }
            }
          } catch (e) {
            // 忽略单个成员查询失败
          }
        })
      )
      setTodayLogs(logMap)
    } catch (e) {
      console.error(e)
    }
  }, [currentMember.id, currentMember.role])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        if (viewMode === 'list') {
          await loadList()
        } else {
          await loadGrid()
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [viewMode, scheduleType, loadList, loadGrid])

  const handleReload = useCallback(async () => {
    if (viewMode === 'list') {
      await loadList()
    } else {
      await loadGrid()
    }
  }, [viewMode, loadList, loadGrid])

  const handleAdd = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const handleEdit = (a: Activity) => {
    setDetailOpen(false)
    setEditing(a)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await api(`/api/activities/${deleteId}`, { method: 'DELETE' })
      toast.success('已删除')
      setDeleteId(null)
      handleReload()
    } catch (e: any) {
      toast.error(e.message || '删除失败')
    }
  }

  const handleCheckPenalty = async () => {
    try {
      const res = await api<{ processed: number }>('/api/activities/check-penalty', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      if (res.processed === 0) {
        toast.success('当前没有需要扣分的活动')
      } else {
        toast.warning(`已处理 ${res.processed} 项扣分`)
      }
      handleReload()
    } catch (e: any) {
      toast.error(e.message || '操作失败')
    }
  }

  const handleActivityClick = (a: Activity) => {
    setDetailActivity(a)
    setDetailOpen(true)
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">日程管理</h2>
        {isParent && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleCheckPenalty} className="h-8">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" /> 扣分检查
            </Button>
            <Button size="sm" onClick={handleAdd} className="h-8">
              <Plus className="w-3.5 h-3.5 mr-1" /> 新建
            </Button>
          </div>
        )}
      </div>

      {!isParent && (
        <Card className="p-3 bg-muted/50">
          <p className="text-[11px] text-muted-foreground">
            👀 你正在以孩子身份查看，只有爸爸妈妈可以增删活动。
          </p>
        </Card>
      )}

      {/* 视图切换 Toggle */}
      <div className="flex items-center justify-center">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && setViewMode(v as ViewMode)}
          className="bg-muted rounded-lg p-0.5"
        >
          <ToggleGroupItem value="list" className="px-4 h-8 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md">
            <List className="w-3.5 h-3.5 mr-1" /> 列表视图
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" className="px-4 h-8 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md">
            <Grid3x3 className="w-3.5 h-3.5 mr-1" /> 时间网格
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* 列表视图：保留日度/周度/月度 Tab */}
      {viewMode === 'list' && (
        <Tabs value={scheduleType} onValueChange={(v) => setScheduleType(v as ScheduleType)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="daily">{SCHEDULE_LABEL.daily}</TabsTrigger>
            <TabsTrigger value="weekly">{SCHEDULE_LABEL.weekly}</TabsTrigger>
            <TabsTrigger value="monthly">{SCHEDULE_LABEL.monthly}</TabsTrigger>
          </TabsList>

          {(['daily', 'weekly', 'monthly'] as ScheduleType[]).map((st) => (
            <TabsContent key={st} value={st} className="mt-3">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">加载中...</div>
              ) : listActivities.length === 0 ? (
                <Card className="p-6 text-center">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="text-sm text-muted-foreground mb-3">
                    暂无{SCHEDULE_LABEL[st]}活动
                  </p>
                  {isParent && (
                    <Button size="sm" variant="outline" onClick={handleAdd}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> 添加第一个
                    </Button>
                  )}
                </Card>
              ) : (
                <div className="space-y-2">
                  {listActivities.map((a) => (
                    <Card key={a.id} className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{a.title}</span>
                            {a.scheduledTime && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                <Clock className="w-2.5 h-2.5 mr-0.5" />
                                {a.scheduledTime}
                              </Badge>
                            )}
                            {a.deadline && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground">
                                截止 {a.deadline}
                              </Badge>
                            )}
                          </div>
                          {a.description && (
                            <p className="text-[11px] text-muted-foreground mt-1">{a.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] flex-wrap">
                            <span className="flex items-center gap-0.5 text-primary">
                              <Sparkles className="w-3 h-3" />
                              {a.points} 分
                            </span>
                            {a.onTimeBonus > 0 && (
                              <span className="text-accent-foreground">按时 +{a.onTimeBonus}</span>
                            )}
                            {st === 'weekly' && a.dayOfWeek && (
                              <span className="text-muted-foreground">{WEEKDAY_LABEL[a.dayOfWeek]}</span>
                            )}
                            {st === 'monthly' && a.dayOfMonth && (
                              <span className="text-muted-foreground">每月 {a.dayOfMonth} 号</span>
                            )}
                            {a.assignedTo && (
                              <span className="text-muted-foreground">
                                {a.assignedTo.avatar} {a.assignedTo.name}
                              </span>
                            )}
                          </div>
                        </div>
                        {isParent && (
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleEdit(a)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(a.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* 网格视图：统一显示今日时间轴 */}
      {viewMode === 'grid' && (
        <>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">加载中...</div>
          ) : (
            <TimeGridView
              activities={allActivities}
              todayLogs={todayLogs}
              currentMember={currentMember}
              onReload={handleReload}
              onActivityClick={handleActivityClick}
              onActivityEdit={handleEdit}
            />
          )}
        </>
      )}

      <ActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activity={editing}
        defaultScheduleType={scheduleType}
        members={members}
        currentMember={currentMember}
        onSaved={handleReload}
      />

      <ActivityDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        activity={detailActivity}
        log={detailActivity ? todayLogs[detailActivity.id] : undefined}
        currentMember={currentMember}
        onEdit={handleEdit}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除该活动？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将不再出现于日程中，已记录的积分流水不受影响。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

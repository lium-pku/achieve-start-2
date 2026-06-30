'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, Member, ScheduleType, SCHEDULE_LABEL, WEEKDAY_LABEL, api } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Plus, Pencil, Trash2, Clock, Sparkles, AlertTriangle } from 'lucide-react'
import { ActivityDialog } from '@/components/dialogs/activity-dialog'
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

export function ScheduleTab({ currentMember, members }: Props) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [scheduleType, setScheduleType] = useState<ScheduleType>('daily')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Activity | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const isParent = currentMember.role === 'mom' || currentMember.role === 'dad'

  const load = useCallback(async () => {
    try {
      const list = await api<Activity[]>(`/api/activities?scheduleType=${scheduleType}`)
      setActivities(list)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [scheduleType])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const handleAdd = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const handleEdit = (a: Activity) => {
    setEditing(a)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await api(`/api/activities/${deleteId}`, { method: 'DELETE' })
      toast.success('已删除')
      setDeleteId(null)
      load()
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
    } catch (e: any) {
      toast.error(e.message || '操作失败')
    }
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
            ) : activities.length === 0 ? (
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
                {activities.map((a) => (
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

      <ActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activity={editing}
        defaultScheduleType={scheduleType}
        members={members}
        currentMember={currentMember}
        onSaved={load}
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

'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Activity, Member, ScheduleType, SCHEDULE_LABEL, WEEKDAY_LABEL, api } from '@/lib/types'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** 编辑时传入，新建时不传 */
  activity?: Activity | null
  defaultScheduleType?: ScheduleType
  members: Member[]
  currentMember: Member
  onSaved: () => void
}

export function ActivityDialog({
  open,
  onOpenChange,
  activity,
  defaultScheduleType = 'daily',
  members,
  currentMember,
  onSaved,
}: Props) {
  const isEdit = !!activity
  const children = members.filter((m) => m.role === 'child')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduleType, setScheduleType] = useState<ScheduleType>('daily')
  const [dayOfWeek, setDayOfWeek] = useState<number>(1)
  const [dayOfMonth, setDayOfMonth] = useState<number>(1)
  const [specificDate, setSpecificDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [deadline, setDeadline] = useState('')
  const [endDate, setEndDate] = useState('')
  const [points, setPoints] = useState('2')
  const [onTimeBonus, setOnTimeBonus] = useState('1')
  const [assignedToIds, setAssignedToIds] = useState<string[]>([])
  const [isPublic, setIsPublic] = useState(false) // 公共活动（所有孩子）
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (activity) {
        setTitle(activity.title)
        setDescription(activity.description || '')
        setScheduleType(activity.scheduleType)
        setDayOfWeek(activity.dayOfWeek || 1)
        setDayOfMonth(activity.dayOfMonth || 1)
        setSpecificDate(activity.specificDate ? new Date(activity.specificDate).toISOString().split('T')[0] : '')
        setScheduledTime(activity.scheduledTime || '')
        setDeadline(activity.deadline || '')
        setEndDate(activity.endDate ? new Date(activity.endDate).toISOString().split('T')[0] : '')
        setPoints(String(activity.points))
        setOnTimeBonus(String(activity.onTimeBonus))
        // 解析 assignedToIds
        const ids = (activity as any).assignedToIds
        if (ids === null || ids === undefined || ids === '') {
          setIsPublic(true)
          setAssignedToIds([])
        } else {
          setIsPublic(false)
          setAssignedToIds(ids.split(',').map((s: string) => s.trim()).filter(Boolean))
        }
      } else {
        setTitle('')
        setDescription('')
        setScheduleType(defaultScheduleType)
        setDayOfWeek(1)
        setDayOfMonth(1)
        setSpecificDate(new Date().toISOString().split('T')[0])
        setScheduledTime('')
        setDeadline('')
        setEndDate('')
        setPoints('2')
        setOnTimeBonus('1')
        setIsPublic(false)
        setAssignedToIds(children[0]?.id ? [children[0].id] : [])
      }
    }
  }, [open, activity, defaultScheduleType])

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('请填写活动名称')
      return
    }
    if (!currentMember || (currentMember.role !== 'mom' && currentMember.role !== 'dad')) {
      toast.error('只有家长才能添加/修改活动')
      return
    }

    setSaving(true)
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        scheduleType,
        dayOfWeek: scheduleType === 'weekly' ? dayOfWeek : null,
        dayOfMonth: scheduleType === 'monthly' ? dayOfMonth : null,
        specificDate: scheduleType === 'once' ? specificDate : null,
        scheduledTime: scheduledTime || null,
        deadline: deadline || null,
        endDate: endDate || null,
        points: Number(points) || 1,
        onTimeBonus: Number(onTimeBonus) || 0,
        assignedToIds: isPublic ? [] : assignedToIds,
        createdById: currentMember.id,
      }
      if (isEdit && activity) {
        await api(`/api/activities/${activity.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
        toast.success('已更新')
      } else {
        await api('/api/activities', {
          method: 'POST',
          body: JSON.stringify(body),
        })
        toast.success('已创建')
      }
      onSaved()
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑活动' : '新建活动'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>活动名称 *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：阅读 20 分钟"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>描述（可选）</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="补充说明"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>周期类型</Label>
            <Select
              value={scheduleType}
              onValueChange={(v) => setScheduleType(v as ScheduleType)}
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{SCHEDULE_LABEL.daily}</SelectItem>
                <SelectItem value="weekly">{SCHEDULE_LABEL.weekly}</SelectItem>
                <SelectItem value="monthly">{SCHEDULE_LABEL.monthly}</SelectItem>
                <SelectItem value="once">{SCHEDULE_LABEL.once}（一次性）</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scheduleType === 'weekly' && (
            <div className="space-y-1.5">
              <Label>每周哪一天</Label>
              <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAY_LABEL.slice(1).map((d, i) => (
                    <SelectItem key={i} value={String(i + 1)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scheduleType === 'monthly' && (
            <div className="space-y-1.5">
              <Label>每月几号</Label>
              <Select value={String(dayOfMonth)} onValueChange={(v) => setDayOfMonth(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} 号
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scheduleType === 'once' && (
            <div className="space-y-1.5">
              <Label>具体日期 *</Label>
              <Input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>计划时间</Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>截止时间 {!deadline && <span className="text-[10px] text-amber-600">（建议设置）</span>}</Label>
              <Input
                type="time"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">超过此时间算超时，无按时奖励</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>截止日期（可选）</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">超过此日期活动自动停止（如学期末）</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>基础积分</Label>
              <Input
                type="number"
                min={0}
                value={points}
                onChange={(e) => setPoints(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>按时奖励</Label>
              <Input
                type="number"
                min={0}
                value={onTimeBonus}
                onChange={(e) => setOnTimeBonus(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>分配给孩子</Label>
              <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-3 h-3"
                />
                公共活动（所有孩子）
              </label>
            </div>
            {isPublic ? (
              <div className="text-xs text-muted-foreground py-2 px-3 bg-muted/50 rounded-lg">
                🌐 公共活动：所有孩子都需要打卡
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {children.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setAssignedToIds((prev) =>
                        prev.includes(c.id)
                          ? prev.filter((id) => id !== c.id)
                          : [...prev, c.id]
                      )
                    }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      assignedToIds.includes(c.id)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border hover:bg-muted'
                    }`}
                  >
                    <span className="text-base">{c.avatar}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
                {assignedToIds.length === 0 && (
                  <span className="text-[11px] text-amber-600 self-center">请至少选择一个孩子</span>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

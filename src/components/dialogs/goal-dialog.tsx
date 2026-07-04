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
import { Member, api } from '@/lib/types'
import { toast } from 'sonner'

interface Goal {
  id?: string
  title: string
  description?: string | null
  status?: string
  deadline?: string | null
  memberId?: string
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  goal?: Goal | null
  members: Member[]
  defaultMemberId?: string
  onSaved: () => void
}

const STATUS_OPTIONS = [
  { value: 'not_started', label: '未开始', color: 'text-zinc-500' },
  { value: 'in_progress', label: '进行中', color: 'text-amber-600' },
  { value: 'achieved', label: '已达成', color: 'text-emerald-600' },
]

export function GoalDialog({ open, onOpenChange, goal, members, defaultMemberId, onSaved }: Props) {
  const isEdit = !!goal?.id
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('not_started')
  const [deadline, setDeadline] = useState('')
  const [memberId, setMemberId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (goal) {
        setTitle(goal.title)
        setDescription(goal.description || '')
        setStatus(goal.status || 'not_started')
        setDeadline(goal.deadline ? goal.deadline.split('T')[0] : '')
        setMemberId(goal.memberId || '')
      } else {
        setTitle('')
        setDescription('')
        setStatus('not_started')
        setDeadline('')
        setMemberId(defaultMemberId || members[0]?.id || '')
      }
    }
  }, [open, goal, defaultMemberId, members])

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('请填写目标标题')
      return
    }
    if (!memberId) {
      toast.error('请选择归属成员')
      return
    }
    setSaving(true)
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        status,
        deadline: deadline || null,
        memberId,
      }
      if (isEdit && goal?.id) {
        await api(`/api/goals/${goal.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
        toast.success('已更新')
      } else {
        await api('/api/goals', {
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
          <DialogTitle>{isEdit ? '编辑目标' : '新建目标'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>目标标题 *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：本学期数学成绩进入班级前 5"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>目标描述（可选）</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="具体内容、衡量标准、阶段性指标等"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>完成状态</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>截止日期（可选）</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>归属成员 *</Label>
            <Select value={memberId} onValueChange={setMemberId} disabled={isEdit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.avatar} {m.name} ({m.role === 'child' ? '孩子' : m.role === 'mom' ? '妈妈' : '爸爸'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

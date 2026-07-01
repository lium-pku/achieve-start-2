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
import { Reward, Member, api } from '@/lib/types'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  reward?: Reward | null
  currentMember: Member
  onSaved: () => void
}

const ICONS = ['🎁', '📺', '🍦', '🎠', '📚', '🎮', '🎬', '🛒', '🎨', '⚽', '🎪', '🚲', '🍿', '🧸']

export function RewardDialog({ open, onOpenChange, reward, currentMember, onSaved }: Props) {
  const isEdit = !!reward
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('🎁')
  const [pointsCost, setPointsCost] = useState('30')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (reward) {
        setTitle(reward.title)
        setDescription(reward.description || '')
        setIcon(reward.icon)
        setPointsCost(String(reward.pointsCost))
      } else {
        setTitle('')
        setDescription('')
        setIcon('🎁')
        setPointsCost('30')
      }
    }
  }, [open, reward])

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('请填写奖励名称')
      return
    }
    setSaving(true)
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        icon,
        pointsCost: Number(pointsCost) || 1,
        createdById: currentMember.id,
      }
      if (isEdit && reward) {
        await api(`/api/rewards/${reward.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
        toast.success('已更新')
      } else {
        await api('/api/rewards', {
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
          <DialogTitle>{isEdit ? '编辑奖励' : '新建奖励'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>奖励名称 *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：看 30 分钟动画片"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>描述（可选）</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="兑换规则、注意事项等"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>图标</Label>
            <div className="grid grid-cols-7 gap-2">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`aspect-square rounded-lg flex items-center justify-center text-xl border-2 transition-colors ${
                    icon === ic
                      ? 'border-primary bg-primary/10'
                      : 'border-transparent bg-muted hover:bg-muted/80'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>所需积分</Label>
            <Input
              type="number"
              min={1}
              value={pointsCost}
              onChange={(e) => setPointsCost(e.target.value)}
            />
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

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
import { Encouragement, api } from '@/lib/types'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}

const ICONS = ['🌱', '⭐', '🏆', '🌟', '👑', '🚀', '💎', '🎯', '🔥', '🌈', '✨', '🎈']

export function EncouragementDialog({ open, onOpenChange, onSaved }: Props) {
  const [threshold, setThreshold] = useState('20')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [icon, setIcon] = useState('🌟')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setThreshold('20')
      setTitle('')
      setMessage('')
      setIcon('🌟')
    }
  }, [open])

  const handleSave = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('请填写标题和鼓励语')
      return
    }
    const th = Number(threshold)
    if (!th || th <= 0) {
      toast.error('阈值必须大于 0')
      return
    }
    setSaving(true)
    try {
      await api('/api/encouragements', {
        method: 'POST',
        body: JSON.stringify({
          threshold: th,
          title: title.trim(),
          message: message.trim(),
          icon,
        }),
      })
      toast.success('已创建')
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新建鼓励里程碑</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>触发积分 *</Label>
            <Input
              type="number"
              min={1}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">孩子累计积分达到此值时触发</p>
          </div>

          <div className="space-y-1.5">
            <Label>图标</Label>
            <div className="grid grid-cols-6 gap-2">
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
            <Label>称号 *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：进步小达人"
            />
          </div>

          <div className="space-y-1.5">
            <Label>鼓励语 *</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="例如：50 分达成，你真棒！"
              rows={2}
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

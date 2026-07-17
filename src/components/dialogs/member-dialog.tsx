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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Member, Role, ROLE_LABEL, api } from '@/lib/types'
import { THEME_PRESETS, guessThemeByColor } from '@/lib/themes'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  member?: Member | null
  onSaved: () => void
}

const AVATARS = ['🧒', '👦', '👧', '👶', '👩', '👨', '👵', '👴', '🧑', '👱']

export function MemberDialog({ open, onOpenChange, member, onSaved }: Props) {
  const isEdit = !!member
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('child')
  const [avatar, setAvatar] = useState('🧒')
  const [theme, setTheme] = useState('orange')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (member) {
        setName(member.name)
        setRole(member.role)
        setAvatar(member.avatar)
        // 优先用 member.theme，兼容旧数据用 color 反查
        setTheme(member.theme || guessThemeByColor(member.color))
      } else {
        setName('')
        setRole('child')
        setAvatar('🧒')
        setTheme('orange')
      }
    }
  }, [open, member])

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('请填写姓名')
      return
    }
    // 根据主题取 color（兼容旧 color 字段）
    const preset = THEME_PRESETS.find((t) => t.key === theme) || THEME_PRESETS[0]
    setSaving(true)
    try {
      if (isEdit && member) {
        await api(`/api/members/${member.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: name.trim(), avatar, color: preset.color, theme }),
        })
        toast.success('已更新')
      } else {
        await api('/api/members', {
          method: 'POST',
          body: JSON.stringify({ name: name.trim(), role, avatar, color: preset.color, theme }),
        })
        toast.success('已添加')
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
          <DialogTitle>{isEdit ? '编辑成员' : '添加家庭成员'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>姓名 *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：小明"
              autoFocus
            />
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label>角色</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="child">🧒 孩子</SelectItem>
                  <SelectItem value="mom">👩 妈妈</SelectItem>
                  <SelectItem value="dad">👨 爸爸</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>头像</Label>
            <div className="grid grid-cols-5 gap-2">
              {AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setAvatar(av)}
                  className={`aspect-square rounded-lg flex items-center justify-center text-2xl border-2 transition-colors ${
                    avatar === av ? 'border-primary bg-primary/10' : 'border-transparent bg-muted'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>主题色（影响整个 App 配色）</Label>
            <div className="grid grid-cols-3 gap-2">
              {THEME_PRESETS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTheme(t.key)}
                  className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-all ${
                    theme === t.key ? 'border-foreground scale-105' : 'border-transparent bg-muted hover:bg-muted/80'
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-full shrink-0"
                    style={{ background: t.color }}
                  />
                  <span className="text-xs font-medium truncate">{t.emoji} {t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 预览 */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <span
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
              style={{ background: (THEME_PRESETS.find((t) => t.key === theme) || THEME_PRESETS[0]).color + '22' }}
            >
              {avatar}
            </span>
            <div>
              <div className="font-semibold">{name || '姓名预览'}</div>
              <div className="text-xs text-muted-foreground">{ROLE_LABEL[role]}</div>
            </div>
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

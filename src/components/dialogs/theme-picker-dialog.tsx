'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Member, api } from '@/lib/types'
import { THEME_PRESETS, guessThemeByColor } from '@/lib/themes'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  member: Member | null
  onSaved: () => void
}

/**
 * 配色方案选择对话框（轻量版，只改 theme）
 * 用户可随时重选自己的配色方案（孩子也能改自己）
 */
export function ThemePickerDialog({ open, onOpenChange, member, onSaved }: Props) {
  const [theme, setTheme] = useState(member?.theme || guessThemeByColor(member?.color) || 'orange')
  const [saving, setSaving] = useState(false)

  // 每次打开时同步 member 的 theme
  useState(() => {
    if (open && member) {
      setTheme(member.theme || guessThemeByColor(member.color))
    }
  })

  const handleSave = async () => {
    if (!member) return
    const preset = THEME_PRESETS.find((t) => t.key === theme) || THEME_PRESETS[0]
    setSaving(true)
    try {
      // theme-only 更新：孩子可以改自己（API 已支持）
      await api(`/api/members/${member.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ theme, color: preset.color }),
      })
      toast.success('配色已更新')
      onSaved()
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v && member) {
          setTheme(member.theme || guessThemeByColor(member.color))
        }
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>选择配色方案</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <p className="text-xs text-muted-foreground mb-3">
            {member?.avatar} {member?.name} 的主题色，切换后整个 App 配色会跟着改变
          </p>
          <div className="grid grid-cols-2 gap-2">
            {THEME_PRESETS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTheme(t.key)}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                  theme === t.key
                    ? 'border-foreground scale-105 bg-muted/50'
                    : 'border-border hover:bg-muted/40'
                }`}
              >
                <span
                  className="w-8 h-8 rounded-full shrink-0"
                  style={{ background: t.color }}
                />
                <div className="text-left flex-1 min-w-0">
                  <div className="text-sm font-medium">{t.emoji} {t.name}</div>
                  <div className="text-[10px] text-muted-foreground">{t.color}</div>
                </div>
                {theme === t.key && (
                  <span className="text-xs text-primary font-medium">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '应用配色'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

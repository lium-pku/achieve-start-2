'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

interface Props {
  onLoginSuccess: () => void
}

const QUICK_CODES = [
  { code: 'test-mom', label: '妈妈', avatar: '👩' },
  { code: 'test-dad', label: '爸爸', avatar: '👨' },
  { code: 'test-child', label: '孩子', avatar: '🧒' },
]

export function LoginDialog({ onLoginSuccess }: Props) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAppStore()

  const handleLogin = async (loginCode?: string) => {
    const finalCode = loginCode || code
    if (!finalCode.trim()) {
      toast.error('请输入登录码')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: finalCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '登录失败')
      setAuth(data.token, data.user)
      toast.success('登录成功')
      onLoginSuccess()
    } catch (e: any) {
      toast.error(e.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background gap-6">
      <div className="text-center">
        <div className="text-5xl mb-2">⏰</div>
        <h1 className="text-2xl font-bold">时间小达人</h1>
        <p className="text-sm text-muted-foreground mt-1">小学生时间管理</p>
      </div>

      <Card className="p-6 w-full max-w-sm space-y-4">
        <div className="space-y-2">
          <Label>快速登录（测试）</Label>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_CODES.map((c) => (
              <Button
                key={c.code}
                variant="outline"
                disabled={loading}
                onClick={() => handleLogin(c.code)}
                className="flex flex-col items-center gap-1 h-auto py-3"
              >
                <span className="text-2xl">{c.avatar}</span>
                <span className="text-xs">{c.label}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>或输入登录码</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="例如：test-mom"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <Button
            className="w-full"
            disabled={loading || !code.trim()}
            onClick={() => handleLogin()}
          >
            {loading ? '登录中...' : '登录'}
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          首次登录会自动创建一个家庭
        </p>
      </Card>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import { Member, api } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PenLine, History, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

interface Review {
  id: string
  periodType: string
  periodStart: string
  periodEnd: string
  authorId: string
  author: Member
  content: string
  createdAt: string
}

interface Props {
  currentMember: Member
  members: Member[]
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  e.setDate(e.getDate() - 1)
  return `${s.getMonth() + 1}/${s.getDate()} - ${e.getMonth() + 1}/${e.getDate()}`
}

function getCurrentPeriod(period: 'weekly' | 'monthly', offset: number) {
  const now = new Date()
  let start: Date
  let end: Date
  if (period === 'weekly') {
    const day = now.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    start = new Date(now)
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() + diffToMonday)
    start.setDate(start.getDate() - offset * 7)
    end = new Date(start)
    end.setDate(end.getDate() + 7)
  } else {
    start = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    end = new Date(start)
    end.setMonth(end.getMonth() + 1)
  }
  return { start, end }
}

export function CommentsTab({ currentMember }: Props) {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly')
  const [offset, setOffset] = useState(0)
  const [content, setContent] = useState('')
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const list = await api<Review[]>(`/api/reviews?periodType=${period}`)
      setReviews(list)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('请输入点评内容')
      return
    }
    setSaving(true)
    try {
      const { start, end } = getCurrentPeriod(period, offset)
      await api('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          periodType: period,
          periodStart: start.toISOString(),
          periodEnd: end.toISOString(),
          authorId: currentMember.id,
          content: content.trim(),
        }),
      })
      toast.success('点评已发布')
      setContent('')
      load()
    } catch (e: any) {
      toast.error(e.message || '发布失败')
    } finally {
      setSaving(false)
    }
  }

  const currentPeriod = getCurrentPeriod(period, offset)
  const periodLabel = `${formatDateRange(currentPeriod.start.toISOString(), currentPeriod.end.toISOString())}`

  return (
    <div className="space-y-3">
      {/* 周期切换 */}
      <Tabs value={period} onValueChange={(v) => { setPeriod(v as any); setOffset(0) }}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="weekly" className="text-xs">周报点评</TabsTrigger>
          <TabsTrigger value="monthly" className="text-xs">月报点评</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 时间导航 */}
      <div className="flex items-center justify-between">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => setOffset((o) => o + 1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center">
          <div className="text-sm font-semibold">
            {offset === 0 ? `本${period === 'weekly' ? '周' : '月'}` : `前${offset}个${period === 'weekly' ? '周' : '月'}`}
          </div>
          <div className="text-[10px] text-muted-foreground">{periodLabel}</div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          disabled={offset === 0}
          onClick={() => setOffset((o) => Math.max(0, o - 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* 写点评 */}
      <Card className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <PenLine className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-medium">写点评</h4>
          <span className="text-[10px] text-muted-foreground ml-auto">
            以 {currentMember.avatar} {currentMember.name} 身份
          </span>
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`写下对本${period === 'weekly' ? '周' : '月'}表现的点评、鼓励或建议...`}
          rows={4}
          className="resize-none"
        />
        <div className="flex justify-end mt-2">
          <Button size="sm" onClick={handleSave} disabled={saving || !content.trim()}>
            {saving ? '发布中...' : '发布点评'}
          </Button>
        </div>
      </Card>

      {/* 历史点评 */}
      <div>
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <History className="w-3.5 h-3.5 text-muted-foreground" />
          <h4 className="text-xs font-medium text-muted-foreground">
            往期点评 · {reviews.length} 条
          </h4>
        </div>
        {loading ? (
          <div className="text-center py-4 text-muted-foreground text-sm">加载中...</div>
        ) : reviews.length === 0 ? (
          <Card className="p-6 text-center">
            <div className="text-3xl mb-2">📝</div>
            <p className="text-sm text-muted-foreground">还没有点评记录</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {reviews.map((r) => (
              <Card key={r.id} className="p-3">
                <div className="flex items-start gap-2">
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarFallback
                      className="text-xs"
                      style={{ background: r.author.color + '22' }}
                    >
                      {r.author.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium">{r.author.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {r.author.role === 'child' ? '孩子' : r.author.role === 'mom' ? '妈妈' : '爸爸'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        · {formatDateRange(r.periodStart, r.periodEnd)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        · {new Date(r.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm mt-1 leading-relaxed whitespace-pre-wrap">{r.content}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

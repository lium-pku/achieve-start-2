'use client'

import { useCallback, useEffect, useState } from 'react'
import { Member, api } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckCircle2, XCircle, Clock3, Sparkles, RefreshCw, UserCheck } from 'lucide-react'
import { toast } from 'sonner'

interface PendingLog {
  id: string
  activityId: string
  memberId: string
  status: string
  onTime: boolean
  pointsAwarded: number
  bonusAwarded: number
  completedAt: string
  operatorId: string | null
  activity: { id: string; title: string; scheduledTime: string | null; scheduleType: string }
  member: { id: string; name: string; avatar: string }
}

interface Props {
  currentMember: Member
  onVerified: () => void
  refreshKey?: number
}

export function PendingVerificationPanel({ currentMember, onVerified, refreshKey }: Props) {
  const [logs, setLogs] = useState<PendingLog[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const isParent = currentMember.role === 'mom' || currentMember.role === 'dad'

  const load = useCallback(async () => {
    try {
      const list = await api<PendingLog[]>('/api/activities/pending')
      setLogs(list)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isParent) load()
  }, [isParent, load, refreshKey])

  if (!isParent) return null
  if (loading) return null
  // 即使没有待审核记录，也显示空状态卡片，让家长知道审核入口存在

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === logs.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(logs.map((l) => l.id)))
    }
  }

  const handleVerify = async (action: 'approve' | 'reject') => {
    const ids =
      action === 'approve'
        ? selected.size > 0
          ? Array.from(selected)
          : logs.map((l) => l.id)
        : Array.from(selected)
    if (ids.length === 0) {
      toast.error('请先选择记录')
      return
    }
    setProcessing(true)
    try {
      const res = await api<{ processed: number; action: string }>('/api/activities/verify', {
        method: 'POST',
        body: JSON.stringify({ logIds: ids, action, verifiedById: currentMember.id }),
      })
      toast.success(
        action === 'approve'
          ? `已通过 ${res.processed} 项，积分已发放`
          : `已拒绝 ${res.processed} 项`
      )
      setSelected(new Set())
      await load()
      onVerified()
    } catch (e: any) {
      toast.error(e.message || '操作失败')
    } finally {
      setProcessing(false)
    }
  }

  const allSelected = selected.size === logs.length && logs.length > 0

  return (
    <Card className="p-3 border-amber-300 bg-amber-50/50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 text-amber-800">
          <Clock3 className="w-4 h-4" />
          待审核打卡 · {logs.length} 项
        </h3>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={load}>
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="py-3 text-center text-[11px] text-muted-foreground">
          ✅ 暂无待审核记录
          <div className="mt-1 text-[10px] opacity-80">
            孩子打卡后，会在这里等待你的审核
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2 px-1">
            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
              <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
              全选
            </label>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
                disabled={processing}
                onClick={() => handleVerify('approve')}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {selected.size > 0 ? `通过选中(${selected.size})` : `全部通过(${logs.length})`}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50"
                disabled={processing || selected.size === 0}
                onClick={() => handleVerify('reject')}
              >
                <XCircle className="w-3 h-3 mr-1" />
                拒绝选中({selected.size})
              </Button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-80 overflow-y-auto scroll-area">
            {logs.map((log) => {
              const isSelected = selected.has(log.id)
              return (
                <div
                  key={log.id}
                  className={`flex items-center gap-2 p-2 rounded-lg bg-card border ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(log.id)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm truncate">{log.activity.title}</span>
                      {log.activity.scheduledTime && (
                        <Badge variant="outline" className="text-[9px] h-3.5 px-1">
                          {log.activity.scheduledTime}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <span>{log.member.avatar} {log.member.name}</span>
                      <span className="flex items-center gap-0.5 text-primary">
                        <Sparkles className="w-2.5 h-2.5" />
                        {log.pointsAwarded}
                        {log.bonusAwarded > 0 && (
                          <span className="text-accent-foreground">+{log.bonusAwarded}</span>
                        )}
                      </span>
                      {log.onTime && (
                        <Badge className="text-[9px] h-3.5 px-1 bg-accent text-accent-foreground">
                          按时
                        </Badge>
                      )}
                      {log.operatorId && (
                        <span className="text-amber-600 flex items-center gap-0.5">
                          <UserCheck className="w-2.5 h-2.5" /> 代打卡
                        </span>
                      )}
                      <span>
                        ·{' '}
                        {new Date(log.completedAt).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {selected.size > 0 && (
            <div className="mt-2 text-[10px] text-muted-foreground text-center">
              已选 {selected.size} / {logs.length} 项
            </div>
          )}
        </>
      )}
    </Card>
  )
}

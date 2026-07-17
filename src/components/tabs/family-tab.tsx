'use client'

import { useCallback, useEffect, useState } from 'react'
import { Member, PointTransaction, ROLE_LABEL, api } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, ChevronRight, History, TrendingUp, TrendingDown, Palette } from 'lucide-react'
import { MemberDialog } from '@/components/dialogs/member-dialog'
import { ThemePickerDialog } from '@/components/dialogs/theme-picker-dialog'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

interface Props {
  members: Member[]
  onChange: () => void
}

const TX_TYPE_LABEL: Record<string, string> = {
  earn: '完成',
  bonus: '奖励',
  penalty: '扣分',
  redeem: '兑换',
  adjust: '调整',
}

const TX_TYPE_COLOR: Record<string, string> = {
  earn: 'text-primary',
  bonus: 'text-accent-foreground',
  penalty: 'text-destructive',
  redeem: 'text-amber-600',
  adjust: 'text-muted-foreground',
}

export function FamilyTab({ members, onChange }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const [themeEditing, setThemeEditing] = useState<Member | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [loadingTx, setLoadingTx] = useState(false)
  const { setCurrentMember, currentMemberId } = useAppStore()

  const isParentView = (() => {
    const cur = members.find((m) => m.id === currentMemberId)
    return cur?.role === 'mom' || cur?.role === 'dad'
  })()

  const loadTx = useCallback(async (memberId: string) => {
    setLoadingTx(true)
    try {
      const txs = await api<PointTransaction[]>(`/api/points/${memberId}`)
      setTransactions(txs)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingTx(false)
    }
  }, [])

  useEffect(() => {
    if (selectedMemberId) {
      loadTx(selectedMemberId)
    }
  }, [selectedMemberId, loadTx])

  // 默认显示当前成员的流水
  useEffect(() => {
    if (!selectedMemberId && members.length > 0) {
      const target = members.find((m) => m.id === currentMemberId) || members[0]
      setSelectedMemberId(target.id)
    }
  }, [members, currentMemberId, selectedMemberId])

  const handleAdd = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const handleEdit = (m: Member) => {
    setEditing(m)
    setDialogOpen(true)
  }

  const handleSwitch = (m: Member) => {
    setCurrentMember(m.id)
    setSelectedMemberId(m.id)
    toast.success(`已切换为 ${m.name}`)
  }

  const selectedMember = members.find((m) => m.id === selectedMemberId) || members[0]

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">家庭</h2>
        {isParentView && (
          <Button size="sm" onClick={handleAdd} className="h-8">
            <Plus className="w-3.5 h-3.5 mr-1" /> 添加成员
          </Button>
        )}
      </div>

      {/* 成员卡片列表 */}
      <div className="space-y-2">
        {members.map((m) => (
          <Card
            key={m.id}
            className={`p-3 cursor-pointer card-pressable ${
              m.id === currentMemberId ? 'border-primary border-2' : ''
            }`}
            onClick={() => handleSwitch(m)}
          >
            <div className="flex items-center gap-3">
              <span
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0"
                style={{ background: m.color + '22' }}
              >
                {m.avatar}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{m.name}</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                    {ROLE_LABEL[m.role]}
                  </Badge>
                  {m.id === currentMemberId && (
                    <Badge className="text-[10px] h-4 px-1.5 bg-primary">当前</Badge>
                  )}
                </div>
                <div className="text-sm text-primary font-bold tabular-nums mt-0.5">
                  {m.totalPoints} 分
                </div>
              </div>
              {isParentView && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEdit(m)
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              )}
              {/* 配色按钮：家长可改任意成员，孩子只能改自己 */}
              {(isParentView || m.id === currentMemberId) && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  title="选择配色方案"
                  onClick={(e) => {
                    e.stopPropagation()
                    setThemeEditing(m)
                    setThemePickerOpen(true)
                  }}
                >
                  <Palette className="w-3.5 h-3.5" />
                </Button>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </Card>
        ))}
      </div>

      {/* 积分流水 */}
      {selectedMember && (
        <div>
          <h3 className="text-base font-semibold mb-2 flex items-center gap-1.5">
            <History className="w-4 h-4" />
            {selectedMember.name} 的积分流水
          </h3>

          {loadingTx ? (
            <div className="text-center py-4 text-sm text-muted-foreground">加载中...</div>
          ) : transactions.length === 0 ? (
            <Card className="p-6 text-center">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-sm text-muted-foreground">还没有积分记录</p>
            </Card>
          ) : (
            <Card className="p-2">
              <div className="max-h-96 overflow-y-auto scroll-area">
                {transactions.map((tx) => {
                  const positive = tx.amount >= 0
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 p-2.5 border-b border-border last:border-0"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          positive ? 'bg-accent/30' : 'bg-destructive/10'
                        }`}
                      >
                        {positive ? (
                          <TrendingUp className="w-4 h-4 text-accent-foreground" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{tx.reason}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {TX_TYPE_LABEL[tx.type] || tx.type} ·{' '}
                          {new Date(tx.createdAt).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-bold tabular-nums ${
                          positive ? 'text-accent-foreground' : 'text-destructive'
                        }`}
                      >
                        {positive ? '+' : ''}
                        {tx.amount}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 说明卡片 */}
      <Card className="p-3 bg-muted/40">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          💡 <strong>使用说明：</strong>
          <br />· 爸爸妈妈角色可以新建/编辑/删除活动与奖励
          <br />· 孩子角色可以打卡完成任务、兑换奖励
          <br />· 按时完成可获得额外奖励积分
          <br />· 未完成活动由家长触发"扣分检查"扣除当日积分
          <br />· 兑换奖励需家长审核通过后才生效
        </p>
      </Card>

      <MemberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        member={editing}
        onSaved={onChange}
      />

      <ThemePickerDialog
        open={themePickerOpen}
        onOpenChange={setThemePickerOpen}
        member={themeEditing}
        onSaved={onChange}
      />
    </div>
  )
}

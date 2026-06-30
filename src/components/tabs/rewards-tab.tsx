'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Reward,
  RewardRedemption,
  Encouragement,
  Member,
  api,
} from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Plus,
  Gift,
  Sparkles,
  Check,
  X,
  Pencil,
  Trash2,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { RewardDialog } from '@/components/dialogs/reward-dialog'
import { EncouragementDialog } from '@/components/dialogs/encouragement-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface Props {
  currentMember: Member
  members: Member[]
  onPointsChanged: () => void
}

const STATUS_LABEL: Record<RewardRedemption['status'], string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
  fulfilled: '已兑现',
}

const STATUS_COLOR: Record<RewardRedemption['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  fulfilled: 'bg-sky-100 text-sky-700',
}

export function RewardsTab({ currentMember, onPointsChanged }: Props) {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [encouragements, setEncouragements] = useState<Encouragement[]>([])
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([])
  const [loading, setLoading] = useState(true)
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false)
  const [editingReward, setEditingReward] = useState<Reward | null>(null)
  const [encDialogOpen, setEncDialogOpen] = useState(false)
  const [deleteRewardId, setDeleteRewardId] = useState<string | null>(null)
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [resolving, setResolving] = useState<string | null>(null)

  const isParent = currentMember.role === 'mom' || currentMember.role === 'dad'

  const load = useCallback(async () => {
    try {
      const [r, e, red] = await Promise.all([
        api<Reward[]>('/api/rewards'),
        api<Encouragement[]>('/api/encouragements'),
        api<RewardRedemption[]>('/api/redemptions'),
      ])
      setRewards(r)
      setEncouragements(e)
      setRedemptions(red)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleRedeem = async (rewardId: string) => {
    setRedeeming(rewardId)
    try {
      await api('/api/redemptions', {
        method: 'POST',
        body: JSON.stringify({ rewardId, memberId: currentMember.id }),
      })
      toast.success('兑换申请已提交，请等待爸爸妈妈审核 🎉')
      load()
      onPointsChanged()
    } catch (e: any) {
      toast.error(e.message || '兑换失败')
    } finally {
      setRedeeming(null)
    }
  }

  const handleResolve = async (
    redemptionId: string,
    status: 'approved' | 'rejected' | 'fulfilled'
  ) => {
    setResolving(redemptionId)
    try {
      await api(`/api/redemptions/${redemptionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, resolvedById: currentMember.id }),
      })
      toast.success(`已${status === 'approved' ? '通过' : status === 'rejected' ? '拒绝' : '兑现'}`)
      load()
      onPointsChanged()
    } catch (e: any) {
      toast.error(e.message || '操作失败')
    } finally {
      setResolving(null)
    }
  }

  const handleDeleteReward = async () => {
    if (!deleteRewardId) return
    try {
      await api(`/api/rewards/${deleteRewardId}`, { method: 'DELETE' })
      toast.success('已下架')
      setDeleteRewardId(null)
      load()
    } catch (e: any) {
      toast.error(e.message || '失败')
    }
  }

  const sortedEncs = [...encouragements].sort((a, b) => a.threshold - b.threshold)

  return (
    <div className="p-4 space-y-4">
      {/* 头部：积分总览 */}
      <Card className="p-4 bg-gradient-to-br from-accent to-[#7ee68a] text-accent-foreground border-0 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-80">{currentMember.name} 的可兑换积分</p>
            <div className="text-3xl font-black tabular-nums">{currentMember.totalPoints}</div>
          </div>
          <Gift className="w-10 h-10 opacity-50" />
        </div>
      </Card>

      {/* 鼓励里程碑 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> 积分里程碑
          </h3>
          {isParent && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setEncDialogOpen(true)}
            >
              <Plus className="w-3 h-3 mr-1" /> 添加
            </Button>
          )}
        </div>
        <Card className="p-3">
          {sortedEncs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">暂未设置里程碑</p>
          ) : (
            <div className="space-y-2">
              {sortedEncs.map((e) => {
                const reached = currentMember.totalPoints >= e.threshold
                return (
                  <div
                    key={e.id}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      reached ? 'bg-accent/30' : 'bg-muted/40'
                    }`}
                  >
                    <span className={`text-2xl ${reached ? '' : 'grayscale opacity-50'}`}>
                      {e.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium flex items-center gap-1">
                        {e.title}
                        <span className="text-primary tabular-nums">· {e.threshold}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">{e.message}</div>
                      {!reached && (
                        <Progress
                          value={(currentMember.totalPoints / e.threshold) * 100}
                          className="h-1 mt-1"
                        />
                      )}
                    </div>
                    {reached && <CheckCircle2 className="w-4 h-4 text-accent-foreground" />}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* 兑换商店 + 审核记录 */}
      <Tabs defaultValue="shop">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="shop">兑换商店</TabsTrigger>
          <TabsTrigger value="records">
            审核记录
            {redemptions.filter((r) => r.status === 'pending').length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px]">
                {redemptions.filter((r) => r.status === 'pending').length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 兑换商店 */}
        <TabsContent value="shop" className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              共 {rewards.length} 项奖励
            </h3>
            {isParent && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  setEditingReward(null)
                  setRewardDialogOpen(true)
                }}
              >
                <Plus className="w-3 h-3 mr-1" /> 新建奖励
              </Button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">加载中...</div>
          ) : rewards.length === 0 ? (
            <Card className="p-6 text-center">
              <div className="text-3xl mb-2">🎁</div>
              <p className="text-sm text-muted-foreground">还没有奖励，等家长添加</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {rewards.map((r) => {
                const canAfford = currentMember.totalPoints >= r.pointsCost
                return (
                  <Card key={r.id} className="p-3 flex flex-col card-pressable">
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-3xl">{r.icon}</span>
                      {isParent && (
                        <div className="flex">
                          <button
                            className="p-1 hover:bg-muted rounded"
                            onClick={() => {
                              setEditingReward(r)
                              setRewardDialogOpen(true)
                            }}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            className="p-1 hover:bg-muted rounded text-destructive"
                            onClick={() => setDeleteRewardId(r.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="font-semibold text-sm leading-tight mb-1">{r.title}</div>
                    {r.description && (
                      <p className="text-[11px] text-muted-foreground mb-2 line-clamp-2">
                        {r.description}
                      </p>
                    )}
                    <div className="mt-auto pt-2">
                      <div
                        className={`text-sm font-bold tabular-nums mb-1.5 ${
                          canAfford ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        {r.pointsCost} 分
                      </div>
                      {!isParent && (
                        <Button
                          size="sm"
                          className="w-full h-7 text-xs"
                          disabled={!canAfford || redeeming === r.id}
                          onClick={() => handleRedeem(r.id)}
                        >
                          {redeeming === r.id
                            ? '兑换中...'
                            : canAfford
                            ? '立即兑换'
                            : '积分不足'}
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* 审核记录 */}
        <TabsContent value="records" className="mt-3">
          {redemptions.length === 0 ? (
            <Card className="p-6 text-center">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm text-muted-foreground">还没有兑换记录</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {redemptions.map((r) => (
                <Card key={r.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{r.reward.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{r.reward.title}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLOR[r.status]}`}
                        >
                          {STATUS_LABEL[r.status]}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {r.member.avatar} {r.member.name} · {r.pointsSpent} 分 ·{' '}
                        {new Date(r.createdAt).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      {r.note && (
                        <div className="text-[11px] mt-1 text-muted-foreground">备注：{r.note}</div>
                      )}
                      {isParent && r.status === 'pending' && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs bg-accent text-accent-foreground hover:bg-accent/90"
                            disabled={resolving === r.id}
                            onClick={() => handleResolve(r.id, 'approved')}
                          >
                            <Check className="w-3 h-3 mr-1" /> 通过
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-destructive border-destructive/30"
                            disabled={resolving === r.id}
                            onClick={() => handleResolve(r.id, 'rejected')}
                          >
                            <X className="w-3 h-3 mr-1" /> 拒绝
                          </Button>
                        </div>
                      )}
                      {isParent && r.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs mt-2"
                          disabled={resolving === r.id}
                          onClick={() => handleResolve(r.id, 'fulfilled')}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> 标记已兑现
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <RewardDialog
        open={rewardDialogOpen}
        onOpenChange={setRewardDialogOpen}
        reward={editingReward}
        currentMember={currentMember}
        onSaved={load}
      />

      <EncouragementDialog
        open={encDialogOpen}
        onOpenChange={setEncDialogOpen}
        onSaved={load}
      />

      <AlertDialog open={!!deleteRewardId} onOpenChange={(v) => !v && setDeleteRewardId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>下架该奖励？</AlertDialogTitle>
            <AlertDialogDescription>下架后孩子将无法继续兑换。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReward}>确认下架</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

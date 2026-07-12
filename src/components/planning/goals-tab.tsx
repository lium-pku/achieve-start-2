'use client'

import { useCallback, useEffect, useState } from 'react'
import { Member, api } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Plus, Pencil, Trash2, Target, Calendar, User } from 'lucide-react'
import { GoalDialog } from '@/components/dialogs/goal-dialog'
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

interface Goal {
  id: string
  title: string
  description: string | null
  status: string
  deadline: string | null
  memberId: string
  member?: Member
  createdAt: string
}

interface Props {
  currentMember: Member
  members: Member[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  not_started: { label: '未开始', color: 'bg-zinc-100 text-zinc-600', dot: 'bg-zinc-400' },
  in_progress: { label: '进行中', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  achieved: { label: '已达成', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
}

function formatDate(s: string | null): string {
  if (!s) return ''
  const d = new Date(s)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isOverdue(deadline: string | null, status: string): boolean {
  if (!deadline || status === 'achieved') return false
  return new Date(deadline) < new Date()
}

export function GoalsTab({ currentMember, members }: Props) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filterMemberId, setFilterMemberId] = useState<string>('all')

  const isChild = currentMember.role === 'child'

  const load = useCallback(async () => {
    try {
      // 孩子只查自己的目标，家长查全家
      const url = isChild ? `/api/goals?memberId=${currentMember.id}` : '/api/goals'
      const list = await api<Goal[]>(url)
      setGoals(list)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [isChild, currentMember.id])

  useEffect(() => {
    load()
  }, [load])

  const handleAdd = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const handleEdit = (g: Goal) => {
    setEditing(g)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await api(`/api/goals/${deleteId}`, { method: 'DELETE' })
      toast.success('已删除')
      setDeleteId(null)
      load()
    } catch (e: any) {
      toast.error(e.message || '删除失败')
    }
  }

  const handleQuickStatus = async (goal: Goal, newStatus: string) => {
    try {
      await api(`/api/goals/${goal.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      })
      toast.success(`状态已更新为「${STATUS_CONFIG[newStatus].label}」`)
      load()
    } catch (e: any) {
      toast.error(e.message || '更新失败')
    }
  }

  // 按成员过滤
  const filtered = filterMemberId === 'all' ? goals : goals.filter((g) => g.memberId === filterMemberId)

  // 按状态分组
  const grouped = {
    not_started: filtered.filter((g) => g.status === 'not_started'),
    in_progress: filtered.filter((g) => g.status === 'in_progress'),
    achieved: filtered.filter((g) => g.status === 'achieved'),
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          共 {goals.length} 个目标
        </h3>
        {isChild && (
          <Button size="sm" onClick={handleAdd} className="h-7 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> 新建目标
          </Button>
        )}
      </div>

      {/* 成员过滤（仅家长可见，孩子只看自己的） */}
      {!isChild && (
      <Tabs value={filterMemberId} onValueChange={setFilterMemberId}>
        <TabsList className="w-full" style={{ display: 'flex' }}>
          <TabsTrigger value="all" className="flex-1 text-xs">全部</TabsTrigger>
          {members.map((m) => (
            <TabsTrigger key={m.id} value={m.id} className="flex-1 text-xs">
              {m.avatar} {m.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={filterMemberId} className="mt-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">加载中...</div>
          ) : filtered.length === 0 ? (
            <Card className="p-6 text-center">
              <div className="text-3xl mb-2">🎯</div>
              <p className="text-sm text-muted-foreground mb-3">还没有目标</p>
              {isChild && (
                <Button size="sm" variant="outline" onClick={handleAdd}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> 添加第一个目标
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-4">
              {/* 按状态分组渲染 */}
              {(['not_started', 'in_progress', 'achieved'] as const).map((status) => {
                const list = grouped[status]
                if (list.length === 0) return null
                const cfg = STATUS_CONFIG[status]
                return (
                  <div key={status}>
                    <div className="flex items-center gap-1.5 mb-2 px-1">
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className="text-xs font-medium text-muted-foreground">
                        {cfg.label} · {list.length} 个
                      </span>
                    </div>
                    <div className="space-y-2">
                      {list.map((g) => {
                        const overdue = isOverdue(g.deadline, g.status)
                        return (
                          <Card key={g.id} className={`p-3 ${g.status === 'achieved' ? 'bg-emerald-50/50' : ''}`}>
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm">{g.title}</span>
                                  <Badge className={`text-[10px] h-4 px-1.5 ${cfg.color}`}>
                                    {cfg.label}
                                  </Badge>
                                  {overdue && (
                                    <Badge className="text-[10px] h-4 px-1.5 bg-red-100 text-red-700">
                                      已过期
                                    </Badge>
                                  )}
                                </div>
                                {g.description && (
                                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                                    {g.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground flex-wrap">
                                  {g.deadline && (
                                    <span className={`flex items-center gap-0.5 ${overdue ? 'text-red-600' : ''}`}>
                                      <Calendar className="w-2.5 h-2.5" />
                                      {formatDate(g.deadline)}
                                    </span>
                                  )}
                                  {g.member && (
                                    <span className="flex items-center gap-0.5">
                                      <User className="w-2.5 h-2.5" />
                                      {g.member.avatar} {g.member.name}
                                    </span>
                                  )}
                                </div>
                                {/* 快速切换状态 */}
                                <div className="flex gap-1 mt-2">
                                  {(['not_started', 'in_progress', 'achieved'] as const).map((s) => (
                                    <button
                                      key={s}
                                      onClick={() => handleQuickStatus(g, s)}
                                      className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                                        g.status === s
                                          ? STATUS_CONFIG[s].color + ' font-medium'
                                          : 'bg-muted text-muted-foreground hover:bg-muted/70'
                                      }`}
                                    >
                                      {STATUS_CONFIG[s].label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {isChild && (
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => handleEdit(g)}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteId(g.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                              )}
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
      )}

      <GoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        goal={editing}
        members={members}
        defaultMemberId={currentMember.id}
        onSaved={load}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除该目标？</AlertDialogTitle>
            <AlertDialogDescription>删除后无法恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

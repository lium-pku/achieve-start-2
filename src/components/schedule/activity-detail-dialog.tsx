'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Activity, Member, SCHEDULE_LABEL, WEEKDAY_LABEL } from '@/lib/types'
import {
  Clock,
  Sparkles,
  Calendar,
  User,
  Pencil,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  activity: Activity | null
  log?: any
  currentMember: Member
  onEdit?: (a: Activity) => void
}

export function ActivityDetailDialog({
  open,
  onOpenChange,
  activity,
  log,
  currentMember,
  onEdit,
}: Props) {
  if (!activity) return null

  const isParent = currentMember.role === 'mom' || currentMember.role === 'dad'
  const status = log
    ? log.amount > 0
      ? 'completed'
      : 'missed'
    : 'pending'

  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const [dh, dm] = (activity.deadline || '23:59').split(':').map(Number)
  const deadlineMin = dh * 60 + dm
  const isOverdue = !log && activity.deadline && nowMin > deadlineMin

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {activity.title}
            {status === 'completed' && (
              <Badge className="bg-emerald-100 text-emerald-700">已完成</Badge>
            )}
            {status === 'missed' && (
              <Badge className="bg-zinc-200 text-zinc-600">已扣分</Badge>
            )}
            {status === 'pending' && isOverdue && (
              <Badge className="bg-red-100 text-red-700">已超时</Badge>
            )}
            {status === 'pending' && !isOverdue && (
              <Badge variant="outline">待完成</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* 时间信息 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">计划时间</span>
              <span className="font-medium tabular-nums">
                {activity.scheduledTime || '未指定'}
              </span>
              {activity.deadline && (
                <>
                  <span className="text-muted-foreground">→ 截止</span>
                  <span
                    className={`font-medium tabular-nums ${
                      isOverdue ? 'text-red-600' : ''
                    }`}
                  >
                    {activity.deadline}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">周期</span>
              <span className="font-medium">{SCHEDULE_LABEL[activity.scheduleType]}</span>
              {activity.scheduleType === 'weekly' && activity.dayOfWeek && (
                <span className="text-muted-foreground">· {WEEKDAY_LABEL[activity.dayOfWeek]}</span>
              )}
              {activity.scheduleType === 'monthly' && activity.dayOfMonth && (
                <span className="text-muted-foreground">· 每月 {activity.dayOfMonth} 号</span>
              )}
            </div>
          </div>

          <Separator />

          {/* 积分信息 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-primary/10 rounded-lg p-2.5">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> 完成积分
              </div>
              <div className="text-lg font-bold text-primary tabular-nums">
                +{activity.points}
              </div>
            </div>
            <div className="bg-accent/30 rounded-lg p-2.5">
              <div className="text-[11px] text-accent-foreground/80 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 按时奖励
              </div>
              <div className="text-lg font-bold text-accent-foreground tabular-nums">
                +{activity.onTimeBonus}
              </div>
            </div>
          </div>

          {/* 完成状态 */}
          {log && (
            <>
              <Separator />
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-[11px] text-muted-foreground mb-1">本周期完成情况</div>
                {status === 'completed' ? (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>
                      已完成 · 获得 <strong className="text-emerald-600">+{log.amount}</strong> 分
                      {log.amount > activity.points && ' (含按时奖励)'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-zinc-500" />
                    <span>
                      未按时完成 · 扣除 <strong className="text-red-600">{log.amount}</strong> 分
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 描述 */}
          {activity.description && (
            <>
              <Separator />
              <div>
                <div className="text-[11px] text-muted-foreground mb-1">说明</div>
                <p className="text-sm leading-relaxed">{activity.description}</p>
              </div>
            </>
          )}

          {/* 分配给 */}
          {activity.assignedTo && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <User className="w-3 h-3" />
              分配给：{activity.assignedTo.avatar} {activity.assignedTo.name}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          {isParent && onEdit && (
            <Button onClick={() => onEdit(activity)}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> 编辑
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// 共享工具函数
import { db } from '@/lib/db'

// 角色判断
export const isParent = (role: string) => role === 'mom' || role === 'dad'
export const isChild = (role: string) => role === 'child'

// 格式化日期为 YYYY-MM-DD（本地时区）
export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 解析 YYYY-MM-DD 为 Date（本地时区，零点）
export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// 当前时间的 HH:mm
export function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 比较两个 HH:mm 字符串
export function compareTime(a: string, b: string): number {
  return a.localeCompare(b)
}

// 获取某天的活动实例日期（用于活动日志的唯一性）
// 日度活动 = 当天；周度活动 = 当周的开始日期（周一）；月度活动 = 当月的1号
export function getOccurrenceDate(scheduleType: string, date: Date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  if (scheduleType === 'daily') {
    return d
  }
  if (scheduleType === 'weekly') {
    // 周一为一周开始
    const day = d.getDay() // 0=周日, 1=周一
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    return d
  }
  if (scheduleType === 'monthly') {
    return new Date(d.getFullYear(), d.getMonth(), 1)
  }
  return d
}

// 判断给定活动在今天是否应该出现
// 判断给定活动在指定日期是否应该出现
// 支持 daily / weekly / monthly / once 四种类型
// 支持 endDate（截止日期）：超过 endDate 的活动不再出现
export function isActiveOnDate(activity: {
  scheduleType: string
  dayOfWeek: number | null
  dayOfMonth: number | null
  specificDate: Date | null
  startDate: Date
  endDate: Date | null
  active: boolean
}, date: Date = new Date()): boolean {
  if (!activity.active) return false

  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const startDay = new Date(activity.startDate)
  startDay.setHours(0, 0, 0, 0)
  if (startDay > target) return false

  // 检查截止日期：如果 endDate 已过，活动不再出现
  if (activity.endDate) {
    const endDay = new Date(activity.endDate)
    endDay.setHours(23, 59, 59, 999)
    if (endDay < target) return false
  }

  if (activity.scheduleType === 'daily') return true

  if (activity.scheduleType === 'weekly') {
    const day = target.getDay()
    const targetDow = day === 0 ? 7 : day
    return activity.dayOfWeek === targetDow
  }

  if (activity.scheduleType === 'monthly') {
    return activity.dayOfMonth === target.getDate()
  }

  if (activity.scheduleType === 'once') {
    if (!activity.specificDate) return false
    const spec = new Date(activity.specificDate)
    spec.setHours(0, 0, 0, 0)
    return spec.getTime() === target.getTime()
  }

  return false
}

// 兼容旧名（默认查今天）
export function isActiveToday(activity: {
  scheduleType: string
  dayOfWeek: number | null
  dayOfMonth: number | null
  specificDate: Date | null
  startDate: Date
  active: boolean
}, date: Date = new Date()): boolean {
  return isActiveOnDate(activity, date)
}

// 判断活动当前是否还在按时窗口内
export function isOnTime(activity: { deadline: string | null }, now: Date = new Date()): boolean {
  if (!activity.deadline) return true
  return compareTime(nowHHMM(now), activity.deadline) <= 0
}

// 给成员加分（同时更新 totalPoints，并写入流水）
// 使用事务保证原子性，自动处理 familyId
export async function addPoints(opts: {
  memberId: string
  amount: number
  type: 'earn' | 'bonus' | 'penalty' | 'redeem' | 'adjust'
  reason: string
  activityId?: string
}) {
  const { memberId, amount, type, reason, activityId } = opts

  return db.$transaction(async (tx) => {
    const member = await tx.member.findUnique({
      where: { id: memberId },
      select: { totalPoints: true, familyId: true },
    })
    if (!member) throw new Error('成员不存在')

    // 扣分不能让积分低于0
    let actualAmount = amount
    if (amount < 0) {
      if (member.totalPoints <= 0) {
        actualAmount = 0
      } else if (member.totalPoints + amount < 0) {
        actualAmount = -member.totalPoints
      }
    }

    if (actualAmount !== 0) {
      await tx.pointTransaction.create({
        data: {
          familyId: member.familyId,
          memberId,
          amount: actualAmount,
          type,
          reason,
          activityId: activityId ?? null,
        },
      })
      await tx.member.update({
        where: { id: memberId },
        data: { totalPoints: { increment: actualAmount } },
      })
    }
    return actualAmount
  })
}

// 返回统一 JSON 响应
export function ok(data: unknown, init?: ResponseInit) {
  return Response.json(data, init)
}

export function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

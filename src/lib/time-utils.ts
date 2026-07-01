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
export function isActiveToday(activity: {
  scheduleType: string
  dayOfWeek: number | null
  dayOfMonth: number | null
  startDate: Date
  active: boolean
}, date: Date = new Date()): boolean {
  if (!activity.active) return false
  if (activity.startDate > date) return false

  const today = new Date(date)
  today.setHours(0, 0, 0, 0)

  if (activity.scheduleType === 'daily') return true

  if (activity.scheduleType === 'weekly') {
    // 周日 0，周一 1
    const day = today.getDay()
    // 把周日 0 转成 7 以便和 1-7 对齐
    const todayDow = day === 0 ? 7 : day
    return activity.dayOfWeek === todayDow
  }

  if (activity.scheduleType === 'monthly') {
    return activity.dayOfMonth === today.getDate()
  }

  return false
}

// 判断活动当前是否还在按时窗口内
export function isOnTime(activity: { deadline: string | null }, now: Date = new Date()): boolean {
  if (!activity.deadline) return true
  return compareTime(nowHHMM(now), activity.deadline) <= 0
}

// 给成员加分（同时更新 totalPoints，并写入流水）
export async function addPoints(opts: {
  memberId: string
  amount: number
  type: 'earn' | 'bonus' | 'penalty' | 'redeem' | 'adjust'
  reason: string
  activityId?: string
}) {
  const { memberId, amount, type, reason, activityId } = opts
  // 扣分不能让积分低于0
  let actualAmount = amount
  if (amount < 0) {
    const member = await db.member.findUnique({ where: { id: memberId } })
    const currentPoints = member?.totalPoints ?? 0
    if (currentPoints <= 0) {
      actualAmount = 0
    } else if (currentPoints + amount < 0) {
      actualAmount = -currentPoints
    }
  }

  if (actualAmount !== 0) {
    await db.pointTransaction.create({
      data: {
        memberId,
        amount: actualAmount,
        type,
        reason,
        activityId: activityId ?? null,
      },
    })
    await db.member.update({
      where: { id: memberId },
      data: { totalPoints: { increment: actualAmount } },
    })
  }
  return actualAmount
}

// 返回统一 JSON 响应
export function ok(data: unknown, init?: ResponseInit) {
  return Response.json(data, init)
}

export function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, isActiveToday, getOccurrenceDate, isOnTime, addPoints } from '@/lib/time-utils'

// 检查未完成活动并扣分
// 调用时机：日末（或家长手动触发）
// 逻辑：
//   1. 找出所有"今天该出现但未完成"的活动
//   2. 如果当前时间已超过 deadline，则视为 missed，扣分（最多扣到 0）
// body: { memberId?, force? }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { memberId, force } = body || {}

  const children = await db.member.findMany({
    where: { role: 'child', ...(memberId && { id: memberId }) },
  })

  const results: any[] = []
  const now = new Date()

  for (const child of children) {
    const todays = await db.activity.findMany({
      where: { active: true, assignedToId: child.id },
    })

    for (const activity of todays) {
      if (!isActiveToday(activity, now)) continue
      if (!isOnTime(activity, now) || force) {
        // 已经超过 deadline
        const occurrence = getOccurrenceDate(activity.scheduleType, now)
        const existing = await db.activityLog.findUnique({
          where: {
            activityId_memberId_occurrenceDate: {
              activityId: activity.id,
              memberId: child.id,
              occurrenceDate: occurrence,
            },
          },
        })
        // 已完成 / 已扣过分 → 跳过
        if (existing && (existing.status === 'completed' || existing.status === 'missed')) continue

        // 标记为 missed 并扣分
        const penalty = -activity.points // 扣除基础积分
        await db.activityLog.upsert({
          where: {
            activityId_memberId_occurrenceDate: {
              activityId: activity.id,
              memberId: child.id,
              occurrenceDate: occurrence,
            },
          },
          update: {
            status: 'missed',
            onTime: false,
            pointsAwarded: penalty,
            bonusAwarded: 0,
          },
          create: {
            activityId: activity.id,
            memberId: child.id,
            occurrenceDate: occurrence,
            status: 'missed',
            onTime: false,
            pointsAwarded: penalty,
            bonusAwarded: 0,
          },
        })

        const actual = await addPoints({
          memberId: child.id,
          amount: penalty,
          type: 'penalty',
          reason: `未完成「${activity.title}」`,
          activityId: activity.id,
        })

        results.push({
          memberId: child.id,
          activityId: activity.id,
          title: activity.title,
          penalty: actual,
        })
      }
    }
  }

  return ok({ processed: results.length, results })
}

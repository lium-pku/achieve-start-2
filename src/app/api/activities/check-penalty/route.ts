import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, isActiveToday, getOccurrenceDate, isOnTime, addPoints, isAssignedTo } from '@/lib/time-utils'
import { getContext, requireParent } from '@/lib/auth'

// 检查未完成活动并扣分
export async function POST(req: Request) {
  const ctx = getContext(req)
  const err = requireParent(ctx)
  if (err) return err

  const body = await req.json().catch(() => ({}))
  const { memberId, force } = body || {}

  // 查当前 family 的所有孩子
  const children = await db.member.findMany({
    where: {
      familyId: ctx.familyId,
      role: 'child',
      ...(memberId && { id: memberId }),
    },
  })

  const results: any[] = []
  const now = new Date()

  for (const child of children) {
    const allActs = await db.activity.findMany({
      where: { familyId: ctx.familyId, active: true },
    })
    // 过滤出分配给该孩子的活动（含公共活动）
    const todays = allActs.filter((a) => isAssignedTo(a, child.id))

    for (const activity of todays) {
      if (!isActiveToday(activity, now)) continue
      if (!isOnTime(activity, now) || force) {
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
        // 已打卡（待审核/已通过/已拒绝）/ 已扣过分 → 跳过
        if (
          existing &&
          (existing.status === 'completed' ||
            existing.status === 'missed' ||
            existing.status === 'pending_verification' ||
            existing.status === 'rejected')
        )
          continue

        const penalty = -activity.points
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
            familyId: ctx.familyId,
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

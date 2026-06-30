import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, getOccurrenceDate, isOnTime, addPoints } from '@/lib/time-utils'

// 标记活动完成（孩子主动打卡）
// body: { activityId, memberId }
export async function POST(req: Request) {
  const body = await req.json()
  const { activityId, memberId } = body
  if (!activityId || !memberId) return fail('缺少 activityId / memberId')

  const activity = await db.activity.findUnique({ where: { id: activityId } })
  if (!activity || !activity.active) return fail('活动不存在或已停用')

  const member = await db.member.findUnique({ where: { id: memberId } })
  if (!member) return fail('成员不存在')
  if (member.role !== 'child') return fail('只有孩子角色才能完成活动')

  const occurrence = getOccurrenceDate(activity.scheduleType)

  // 检查是否已经完成过
  const existing = await db.activityLog.findUnique({
    where: {
      activityId_memberId_occurrenceDate: {
        activityId,
        memberId,
        occurrenceDate: occurrence,
      },
    },
  })
  if (existing && existing.status === 'completed') {
    return fail('本周期已完成该活动', 409)
  }

  const onTime = isOnTime(activity)
  const pointsAwarded = activity.points
  const bonusAwarded = onTime ? activity.onTimeBonus : 0

  // 写入或更新日志
  const log = await db.activityLog.upsert({
    where: {
      activityId_memberId_occurrenceDate: {
        activityId,
        memberId,
        occurrenceDate: occurrence,
      },
    },
    update: {
      status: 'completed',
      onTime,
      pointsAwarded,
      bonusAwarded,
      completedAt: new Date(),
    },
    create: {
      activityId,
      memberId,
      occurrenceDate: occurrence,
      status: 'completed',
      onTime,
      pointsAwarded,
      bonusAwarded,
      completedAt: new Date(),
    },
  })

  // 发放基础积分
  await addPoints({
    memberId,
    amount: pointsAwarded,
    type: 'earn',
    reason: `完成「${activity.title}」`,
    activityId,
  })
  // 发放按时奖励
  if (bonusAwarded > 0) {
    await addPoints({
      memberId,
      amount: bonusAwarded,
      type: 'bonus',
      reason: `按时完成「${activity.title}」奖励`,
      activityId,
    })
  }

  // 重新查最新积分
  const updatedMember = await db.member.findUnique({ where: { id: memberId } })

  // 检查是否触发新的鼓励阈值
  const encouragements = await db.encouragement.findMany({
    where: { threshold: { lte: updatedMember!.totalPoints } },
    orderBy: { threshold: 'desc' },
  })

  return ok({
    log,
    pointsAwarded,
    bonusAwarded,
    onTime,
    totalPoints: updatedMember!.totalPoints,
    encouragements,
  })
}

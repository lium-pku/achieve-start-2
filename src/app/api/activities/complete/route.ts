import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, getOccurrenceDate, isOnTime } from '@/lib/time-utils'

// 标记活动完成（孩子主动打卡 或 家长代打卡）
// body: { activityId, memberId, operatorId? }
export async function POST(req: Request) {
  const body = await req.json()
  const { activityId, memberId, operatorId } = body
  if (!activityId || !memberId) return fail('缺少 activityId / memberId')

  const activity = await db.activity.findUnique({ where: { id: activityId } })
  if (!activity || !activity.active) return fail('活动不存在或已停用')

  const member = await db.member.findUnique({ where: { id: memberId } })
  if (!member) return fail('成员不存在')
  if (member.role !== 'child') return fail('只有孩子角色才能完成活动')

  if (operatorId) {
    const operator = await db.member.findUnique({ where: { id: operatorId } })
    if (!operator) return fail('操作人不存在')
    if (operator.role !== 'mom' && operator.role !== 'dad') return fail('只有家长才能代打卡')
  }

  const occurrence = getOccurrenceDate(activity.scheduleType)

  const existing = await db.activityLog.findUnique({
    where: {
      activityId_memberId_occurrenceDate: {
        activityId,
        memberId,
        occurrenceDate: occurrence,
      },
    },
  })
  if (existing && (existing.status === 'pending_verification' || existing.status === 'completed')) {
    return fail('本周期已打卡该活动', 409)
  }

  const onTime = isOnTime(activity)
  const pointsAwarded = activity.points
  const bonusAwarded = onTime ? activity.onTimeBonus : 0

  const log = await db.activityLog.upsert({
    where: {
      activityId_memberId_occurrenceDate: {
        activityId,
        memberId,
        occurrenceDate: occurrence,
      },
    },
    update: {
      status: 'pending_verification',
      onTime,
      pointsAwarded,
      bonusAwarded,
      completedAt: new Date(),
      operatorId: operatorId || null,
      verifiedAt: null,
      verifiedById: null,
    },
    create: {
      activityId,
      memberId,
      occurrenceDate: occurrence,
      status: 'pending_verification',
      onTime,
      pointsAwarded,
      bonusAwarded,
      completedAt: new Date(),
      operatorId: operatorId || null,
    },
  })

  return ok({
    log,
    pointsAwarded,
    bonusAwarded,
    onTime,
    message: operatorId
      ? '代打卡成功，等待其他家长审核'
      : '打卡成功，等待家长审核',
  })
}

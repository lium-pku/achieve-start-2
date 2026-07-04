import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, getOccurrenceDate, isOnTime } from '@/lib/time-utils'
import { getContext } from '@/lib/auth'

// 标记活动完成（孩子自己 或 家长代打卡）
export async function POST(req: Request) {
  const ctx = getContext(req)
  const body = await req.json()
  const { activityId, memberId, operatorId } = body
  if (!activityId || !memberId) return fail('缺少 activityId / memberId')

  // 校验 activity 和 member 都属于当前 family
  const activity = await db.activity.findFirst({
    where: { id: activityId, familyId: ctx.familyId },
  })
  if (!activity || !activity.active) return fail('活动不存在或已停用')

  const member = await db.member.findFirst({
    where: { id: memberId, familyId: ctx.familyId },
  })
  if (!member) return fail('成员不存在或无权访问')
  if (member.role !== 'child') return fail('只有孩子角色才能完成活动')

  // 如果是代打卡，校验 operatorId
  if (operatorId) {
    const operator = await db.member.findFirst({
      where: { id: operatorId, familyId: ctx.familyId },
    })
    if (!operator) return fail('操作人不存在或无权访问')
    if (operator.role !== 'mom' && operator.role !== 'dad') return fail('只有家长才能代打卡')
  }

  const occurrence = getOccurrenceDate(activity.scheduleType)

  // 检查是否已经打卡过
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
      familyId: ctx.familyId,
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

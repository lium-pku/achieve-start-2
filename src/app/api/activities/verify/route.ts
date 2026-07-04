import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, addPoints } from '@/lib/time-utils'
import { getContext, requireParent } from '@/lib/auth'

// 批量审核打卡记录
export async function POST(req: Request) {
  const ctx = getContext(req)
  const err = requireParent(ctx)
  if (err) return err

  const body = await req.json()
  const { logIds, action, verifiedById } = body

  if (!Array.isArray(logIds) || logIds.length === 0) return fail('缺少 logIds')
  if (!['approve', 'reject'].includes(action)) return fail('action 必须为 approve / reject')
  if (!verifiedById) return fail('缺少 verifiedById')

  // 校验 verifiedById 属于当前 family
  const verifier = await db.member.findFirst({
    where: { id: verifiedById, familyId: ctx.familyId },
  })
  if (!verifier) return fail('审核人不存在或无权访问')

  // 查待审核 logs（带 familyId 隔离）
  const logs = await db.activityLog.findMany({
    where: {
      id: { in: logIds },
      familyId: ctx.familyId,
      status: 'pending_verification',
    },
    include: { activity: true },
  })

  if (logs.length === 0) return ok({ processed: 0, message: '没有待审核的记录' })

  const now = new Date()

  if (action === 'approve') {
    for (const log of logs) {
      await db.activityLog.update({
        where: { id: log.id },
        data: { status: 'completed', verifiedAt: now, verifiedById },
      })
      if (log.pointsAwarded > 0) {
        await addPoints({
          memberId: log.memberId,
          amount: log.pointsAwarded,
          type: 'earn',
          reason: `完成「${log.activity.title}」(已审核)`,
          activityId: log.activityId,
        })
      }
      if (log.bonusAwarded > 0) {
        await addPoints({
          memberId: log.memberId,
          amount: log.bonusAwarded,
          type: 'bonus',
          reason: `按时完成「${log.activity.title}」奖励(已审核)`,
          activityId: log.activityId,
        })
      }
    }
  } else {
    await db.activityLog.updateMany({
      where: { id: { in: logs.map((l) => l.id) } },
      data: { status: 'rejected', verifiedAt: now, verifiedById },
    })
  }

  return ok({ processed: logs.length, action })
}

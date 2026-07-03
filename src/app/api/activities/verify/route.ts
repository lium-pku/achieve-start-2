import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, addPoints } from '@/lib/time-utils'

// 批量审核打卡记录
// body: { logIds: string[], action: "approve" | "reject", verifiedById: string }
export async function POST(req: Request) {
  const body = await req.json()
  const { logIds, action, verifiedById } = body

  if (!Array.isArray(logIds) || logIds.length === 0) return fail('缺少 logIds')
  if (!['approve', 'reject'].includes(action)) return fail('action 必须为 approve / reject')
  if (!verifiedById) return fail('缺少 verifiedById')

  const verifier = await db.member.findUnique({ where: { id: verifiedById } })
  if (!verifier) return fail('审核人不存在')
  if (verifier.role !== 'mom' && verifier.role !== 'dad') return fail('只有家长才能审核')

  const logs = await db.activityLog.findMany({
    where: {
      id: { in: logIds },
      status: 'pending_verification',
    },
    include: { activity: true },
  })

  if (logs.length === 0) {
    return ok({ processed: 0, message: '没有待审核的记录' })
  }

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

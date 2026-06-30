import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, addPoints } from '@/lib/time-utils'

// 家长审核兑换（approve / reject / fulfill）
// body: { status, resolvedById, note? }
// - reject：退还积分
// - approve / fulfill：仅改状态
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { status, resolvedById, note } = body
  if (!['pending', 'approved', 'rejected', 'fulfilled'].includes(status)) {
    return fail('status 非法')
  }

  const redemption = await db.rewardRedemption.findUnique({
    where: { id },
    include: { reward: true },
  })
  if (!redemption) return fail('兑换记录不存在')

  // 如果是从 pending → rejected，需要退还积分
  if (redemption.status === 'pending' && status === 'rejected') {
    await addPoints({
      memberId: redemption.memberId,
      amount: redemption.pointsSpent,
      type: 'adjust',
      reason: `兑换「${redemption.reward.title}」被拒绝，积分退还`,
    })
  }

  const updated = await db.rewardRedemption.update({
    where: { id },
    data: {
      status,
      note: note || redemption.note,
      resolvedAt: ['approved', 'rejected', 'fulfilled'].includes(status) ? new Date() : null,
      resolvedById: resolvedById || null,
    },
    include: { reward: true, member: true },
  })

  return ok(updated)
}

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, addPoints } from '@/lib/time-utils'
import { getContext, requireParent } from '@/lib/auth'

// 家长审核兑换
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = getContext(req)
  const err = requireParent(ctx)
  if (err) return err

  const body = await req.json()
  const { status, resolvedById, note } = body
  if (!['pending', 'approved', 'rejected', 'fulfilled'].includes(status)) {
    return fail('status 非法')
  }

  const redemption = await db.rewardRedemption.findFirst({
    where: { id, familyId: ctx.familyId },
    include: { reward: true },
  })
  if (!redemption) return fail('兑换记录不存在或无权访问', 404)

  // 校验 resolvedById 属于当前 family
  if (resolvedById) {
    const resolver = await db.member.findFirst({
      where: { id: resolvedById, familyId: ctx.familyId },
    })
    if (!resolver) return fail('审核人不存在或无权访问')
  }

  // 拒绝时退分
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

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'
import { getContext } from '@/lib/auth'

// 获取兑换记录
export async function GET(req: Request) {
  const ctx = getContext(req)
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')
  const status = searchParams.get('status')

  const list = await db.rewardRedemption.findMany({
    where: {
      familyId: ctx.familyId,
      ...(memberId && { memberId }),
      ...(status && { status }),
    },
    include: { reward: true, member: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return ok(list)
}

// 提交兑换申请（事务化：扣分 + 创建记录 原子）
export async function POST(req: Request) {
  const ctx = getContext(req)
  const body = await req.json()
  const { rewardId, memberId } = body
  if (!rewardId || !memberId) return fail('缺少 rewardId / memberId')

  // 校验 reward 和 member 都属于当前 family
  const reward = await db.reward.findFirst({
    where: { id: rewardId, familyId: ctx.familyId, active: true },
  })
  if (!reward) return fail('奖励不存在或已下架')

  const member = await db.member.findFirst({
    where: { id: memberId, familyId: ctx.familyId },
  })
  if (!member) return fail('成员不存在或无权访问')
  if (member.totalPoints < reward.pointsCost) {
    return fail(`积分不足，需要 ${reward.pointsCost}，当前 ${member.totalPoints}`, 402)
  }

  // 事务：扣分 + 创建兑换记录
  const redemption = await db.$transaction(async (tx) => {
    // 再查一次确认积分（防止并发）
    const m = await tx.member.findUnique({ where: { id: memberId } })
    if (!m || m.totalPoints < reward.pointsCost) {
      throw new Error('积分不足或异常，无法兑换')
    }

    await tx.pointTransaction.create({
      data: {
        familyId: ctx.familyId,
        memberId,
        amount: -reward.pointsCost,
        type: 'redeem',
        reason: `兑换「${reward.title}」`,
      },
    })
    await tx.member.update({
      where: { id: memberId },
      data: { totalPoints: { decrement: reward.pointsCost } },
    })

    return tx.rewardRedemption.create({
      data: {
        familyId: ctx.familyId,
        rewardId,
        memberId,
        status: 'pending',
        pointsSpent: reward.pointsCost,
      },
      include: { reward: true, member: true },
    })
  })

  return NextResponse.json(redemption, { status: 201 })
}

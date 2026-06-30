import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, addPoints } from '@/lib/time-utils'

// 获取兑换记录
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')
  const status = searchParams.get('status')
  const list = await db.rewardRedemption.findMany({
    where: {
      ...(memberId && { memberId }),
      ...(status && { status }),
    },
    include: { reward: true, member: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return ok(list)
}

// 提交兑换申请（孩子发起）
export async function POST(req: Request) {
  const body = await req.json()
  const { rewardId, memberId } = body
  if (!rewardId || !memberId) return fail('缺少 rewardId / memberId')

  const reward = await db.reward.findUnique({ where: { id: rewardId } })
  if (!reward || !reward.active) return fail('奖励不存在或已下架')

  const member = await db.member.findUnique({ where: { id: memberId } })
  if (!member) return fail('成员不存在')
  if (member.totalPoints < reward.pointsCost) {
    return fail(`积分不足，需要 ${reward.pointsCost}，当前 ${member.totalPoints}`, 402)
  }

  // 先扣分
  const spent = await addPoints({
    memberId,
    amount: -reward.pointsCost,
    type: 'redeem',
    reason: `兑换「${reward.title}」`,
  })

  // 如果实际扣分与预期不符（因为下限保护），告知用户
  if (Math.abs(spent) < reward.pointsCost) {
    return fail('积分不足或异常，无法兑换', 402)
  }

  const redemption = await db.rewardRedemption.create({
    data: {
      rewardId,
      memberId,
      status: 'pending',
      pointsSpent: reward.pointsCost,
    },
    include: { reward: true, member: true },
  })

  return NextResponse.json(redemption, { status: 201 })
}

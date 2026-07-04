import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'
import { getContext } from '@/lib/auth'

// 获取某成员的积分流水
export async function GET(_req: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const ctx = getContext(_req)
  const { memberId } = await params

  // 校验 memberId 属于当前 family
  const member = await db.member.findFirst({
    where: { id: memberId, familyId: ctx.familyId },
  })
  if (!member) return fail('成员不存在或无权访问', 404)

  const transactions = await db.pointTransaction.findMany({
    where: { familyId: ctx.familyId, memberId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return ok(transactions)
}

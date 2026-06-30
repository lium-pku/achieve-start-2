import { db } from '@/lib/db'
import { ok } from '@/lib/time-utils'

// 获取某成员的积分流水
export async function GET(_req: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params
  const transactions = await db.pointTransaction.findMany({
    where: { memberId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return ok(transactions)
}

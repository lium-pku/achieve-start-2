import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'
import { getContext } from '@/lib/auth'

// 查询某成员的活动打卡记录
export async function GET(req: Request) {
  const ctx = getContext(req)
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')
  const days = Number(searchParams.get('days') || '7')

  if (!memberId) return ok([])

  // 校验 memberId 属于当前 family
  const member = await db.member.findFirst({
    where: { id: memberId, familyId: ctx.familyId },
  })
  if (!member) return fail('成员不存在或无权访问', 404)

  const since = new Date()
  since.setDate(since.getDate() - days)

  const logs = await db.activityLog.findMany({
    where: {
      familyId: ctx.familyId,
      memberId,
      occurrenceDate: { gte: since },
    },
    include: { activity: true },
    orderBy: { occurrenceDate: 'desc' },
  })

  return ok(logs)
}

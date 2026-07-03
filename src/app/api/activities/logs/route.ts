import { db } from '@/lib/db'
import { ok } from '@/lib/time-utils'

// 查询某成员的活动打卡记录
// GET /api/activities/logs?memberId=xxx&days=7
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')
  const days = Number(searchParams.get('days') || '7')

  if (!memberId) return ok([])

  const since = new Date()
  since.setDate(since.getDate() - days)

  const logs = await db.activityLog.findMany({
    where: {
      memberId,
      occurrenceDate: { gte: since },
    },
    include: { activity: true },
    orderBy: { occurrenceDate: 'desc' },
  })

  return ok(logs)
}

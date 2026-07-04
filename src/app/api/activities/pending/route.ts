import { db } from '@/lib/db'
import { ok } from '@/lib/time-utils'
import { getContext } from '@/lib/auth'

// 查询待审核的打卡记录
export async function GET(req: Request) {
  const ctx = getContext(req)
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')

  const logs = await db.activityLog.findMany({
    where: {
      familyId: ctx.familyId,
      status: 'pending_verification',
      ...(memberId && { memberId }),
    },
    include: { activity: true, member: true },
    orderBy: { completedAt: 'desc' },
  })

  return ok(logs)
}

import { db } from '@/lib/db'
import { ok } from '@/lib/time-utils'

// 查询待审核的打卡记录
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')

  const logs = await db.activityLog.findMany({
    where: {
      status: 'pending_verification',
      ...(memberId && { memberId }),
    },
    include: { activity: true, member: true },
    orderBy: { completedAt: 'desc' },
  })

  return ok(logs)
}

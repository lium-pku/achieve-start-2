import { db } from '@/lib/db'
import { ok } from '@/lib/time-utils'

// 统计 API
// GET /api/stats?memberId=xxx&period=weekly&offset=0
//   period: "weekly" | "monthly"
//   offset: 0=本周/本月, 1=上周/上月, 2=上上周...
// 返回：
//   - completionRate: 任务完成率 (0-100)
//   - onTimeRate: 按时完成率 (0-100)
//   - pointsEarned: 获得积分
//   - pointsPenalty: 扣除积分
//   - pointsNet: 净增积分
//   - totalTasks: 总任务数
//   - completedTasks: 已完成任务数
//   - onTimeTasks: 按时完成任务数
//   - periodStart, periodEnd
//   - trend: 最近 4 个周期的趋势数据
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')
  const period = searchParams.get('period') || 'weekly'
  const offset = Number(searchParams.get('offset') || '0')

  if (!memberId) return ok({ error: '缺少 memberId' })

  // 计算周期范围
  const now = new Date()
  let periodStart: Date
  let periodEnd: Date

  if (period === 'weekly') {
    // 周一为一周开始
    const day = now.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    const thisMonday = new Date(now)
    thisMonday.setHours(0, 0, 0, 0)
    thisMonday.setDate(thisMonday.getDate() + diffToMonday)
    periodStart = new Date(thisMonday)
    periodStart.setDate(periodStart.getDate() - offset * 7)
    periodEnd = new Date(periodStart)
    periodEnd.setDate(periodEnd.getDate() + 7)
  } else {
    // 月度
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    periodStart = new Date(thisMonthStart)
    periodStart.setMonth(periodStart.getMonth() - offset)
    periodEnd = new Date(periodStart)
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  }

  // 查询该周期内的活动日志
  const logs = await db.activityLog.findMany({
    where: {
      memberId,
      occurrenceDate: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
  })

  // 查询该周期内的积分流水
  const txs = await db.pointTransaction.findMany({
    where: {
      memberId,
      createdAt: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
  })

  // 统计
  const totalTasks = logs.length
  const completedTasks = logs.filter((l) => l.status === 'completed').length
  const onTimeTasks = logs.filter((l) => l.status === 'completed' && l.onTime).length
  const missedTasks = logs.filter((l) => l.status === 'missed').length

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const onTimeRate =
    completedTasks > 0 ? Math.round((onTimeTasks / completedTasks) * 100) : 0

  const pointsEarned = txs
    .filter((t) => t.amount > 0 && (t.type === 'earn' || t.type === 'bonus'))
    .reduce((s, t) => s + t.amount, 0)
  const pointsPenalty = txs
    .filter((t) => t.type === 'penalty')
    .reduce((s, t) => s + Math.abs(t.amount), 0)
  const pointsRedeem = txs
    .filter((t) => t.type === 'redeem')
    .reduce((s, t) => s + Math.abs(t.amount), 0)
  const pointsNet = txs.reduce((s, t) => s + t.amount, 0)

  // 趋势数据：最近 4 个周期
  const trend: any[] = []
  for (let i = 3; i >= 0; i--) {
    const tOffset = offset + i
    let tStart: Date
    let tEnd: Date
    if (period === 'weekly') {
      const day = now.getDay()
      const diffToMonday = day === 0 ? -6 : 1 - day
      const thisMonday = new Date(now)
      thisMonday.setHours(0, 0, 0, 0)
      thisMonday.setDate(thisMonday.getDate() + diffToMonday)
      tStart = new Date(thisMonday)
      tStart.setDate(tStart.getDate() - tOffset * 7)
      tEnd = new Date(tStart)
      tEnd.setDate(tEnd.getDate() + 7)
    } else {
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      tStart = new Date(thisMonthStart)
      tStart.setMonth(tStart.getMonth() - tOffset)
      tEnd = new Date(tStart)
      tEnd.setMonth(tEnd.getMonth() + 1)
    }

    const tLogs = await db.activityLog.findMany({
      where: {
        memberId,
        occurrenceDate: { gte: tStart, lt: tEnd },
      },
    })
    const tTxs = await db.pointTransaction.findMany({
      where: {
        memberId,
        createdAt: { gte: tStart, lt: tEnd },
      },
    })

    const tTotal = tLogs.length
    const tCompleted = tLogs.filter((l) => l.status === 'completed').length
    const tOnTime = tLogs.filter((l) => l.status === 'completed' && l.onTime).length
    const tNet = tTxs.reduce((s, t) => s + t.amount, 0)

    trend.push({
      label:
        period === 'weekly'
          ? `${tStart.getMonth() + 1}/${tStart.getDate()}`
          : `${tStart.getMonth() + 1}月`,
      completionRate: tTotal > 0 ? Math.round((tCompleted / tTotal) * 100) : 0,
      onTimeRate: tCompleted > 0 ? Math.round((tOnTime / tCompleted) * 100) : 0,
      pointsNet: tNet,
    })
  }

  return ok({
    period,
    offset,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    totalTasks,
    completedTasks,
    onTimeTasks,
    missedTasks,
    completionRate,
    onTimeRate,
    pointsEarned,
    pointsPenalty,
    pointsRedeem,
    pointsNet,
    trend,
  })
}

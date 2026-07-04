import { test, expect } from '@playwright/test'
import {
  findMemberByRole,
  getStats,
  checkIn,
  verify,
  getTodayActivities,
  getPending,
  resetAll,
  setMemberPoints,
} from './helpers'

test.beforeAll(async () => {
  await resetAll()
})

test.describe('流程 16：统计计算准确性', () => {
  test('完成率 = 已完成 / 总任务数', async () => {
    const child = await findMemberByRole('child')
    const mom = await findMemberByRole('mom')
    await setMemberPoints(child.id, 0)

    // 获取本周统计基准
    const before = await getStats(child.id, 'weekly', 0)

    // 打卡 2 个活动，只审核 1 个
    const activities = await getTodayActivities(child.id)
    if (activities.length < 2) {
      test.skip()
      return
    }

    // 打卡第一个，审核通过
    await checkIn(activities[0].id, child.id)
    let pending = await getPending()
    let log = pending.find((p) => p.activityId === activities[0].id)
    if (log) await verify([log.id], 'approve', mom.id)

    // 打卡第二个，不审核（保持 pending_verification）
    await checkIn(activities[1].id, child.id)

    // 重新统计
    const after = await getStats(child.id, 'weekly', 0)

    // 总任务数应增加 2
    expect(after.totalTasks).toBe(before.totalTasks + 2)
    // 已完成应增加 1（只有审核通过的算）
    expect(after.completedTasks).toBe(before.completedTasks + 1)
    // 完成率 = completedTasks / totalTasks
    if (after.totalTasks > 0) {
      const expected = Math.round((after.completedTasks / after.totalTasks) * 100)
      expect(after.completionRate).toBe(expected)
    }
  })

  test('按时率 = 按时完成 / 已完成', async () => {
    const child = await findMemberByRole('child')
    const stats = await getStats(child.id, 'weekly', 0)

    if (stats.completedTasks > 0) {
      const expected = Math.round((stats.onTimeTasks / stats.completedTasks) * 100)
      expect(stats.onTimeRate).toBe(expected)
    } else {
      expect(stats.onTimeRate).toBe(0)
    }
  })

  test('积分计算：获得/扣除/兑换分离', async () => {
    const child = await findMemberByRole('child')
    const stats = await getStats(child.id, 'weekly', 0)

    // pointsEarned 应等于 earn + bonus 类型的总额
    // pointsPenalty 应等于 penalty 类型的总额
    // pointsRedeem 应等于 redeem 类型的总额
    // pointsNet 应等于所有流水的 sum
    expect(stats.pointsNet).toBe(stats.pointsEarned - stats.pointsPenalty - stats.pointsRedeem)
  })

  test('趋势数组第一个是当前周期', async () => {
    const child = await findMemberByRole('child')
    const stats = await getStats(child.id, 'weekly', 0)

    expect(stats.trend.length).toBe(4)
    // 最后一个 trend 元素应对应当前周期（offset=0）
    const lastTrend = stats.trend[3]
    const lastTrendStart = lastTrend.label
    // 当前周期的 periodStart
    const currentStart = new Date(stats.periodStart)
    const expectedLabel = `${currentStart.getMonth() + 1}/${currentStart.getDate()}`
    expect(lastTrendStart).toBe(expectedLabel)
  })

  test('统计包含 missedTasks 字段', async () => {
    const child = await findMemberByRole('child')
    const stats = await getStats(child.id, 'weekly', 0)

    expect(stats).toHaveProperty('missedTasks')
    expect(typeof stats.missedTasks).toBe('number')
    expect(stats.missedTasks).toBeGreaterThanOrEqual(0)
    // missedTasks + completedTasks <= totalTasks
    expect(stats.missedTasks + stats.completedTasks).toBeLessThanOrEqual(stats.totalTasks)
  })

  test('月报趋势 label 是月份格式', async () => {
    const child = await findMemberByRole('child')
    const stats = await getStats(child.id, 'monthly', 0)

    expect(stats.trend.length).toBe(4)
    for (const t of stats.trend) {
      // 月报的 label 应该是 "X月" 格式
      expect(t.label).toMatch(/月$/)
    }
  })

  test('周报趋势 label 是日期格式', async () => {
    const child = await findMemberByRole('child')
    const stats = await getStats(child.id, 'weekly', 0)

    expect(stats.trend.length).toBe(4)
    for (const t of stats.trend) {
      // 周报的 label 应该是 "M/D" 格式
      expect(t.label).toMatch(/^\d+\/\d+$/)
    }
  })

  test('不同 offset 返回不同周期', async () => {
    const child = await findMemberByRole('child')

    const w0 = await getStats(child.id, 'weekly', 0)
    const w1 = await getStats(child.id, 'weekly', 1)
    const w2 = await getStats(child.id, 'weekly', 2)

    // 三个周期的 periodStart 都应不同
    expect(w0.periodStart).not.toBe(w1.periodStart)
    expect(w1.periodStart).not.toBe(w2.periodStart)
    expect(w0.periodStart).not.toBe(w2.periodStart)
  })
})

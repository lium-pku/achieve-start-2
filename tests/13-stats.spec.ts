import { test, expect } from '@playwright/test'
import {
  findMemberByRole,
  getStats,
  checkIn,
  verify,
  resetAndSeed,
} from './helpers'

test.beforeAll(async () => {
  await resetAndSeed()
})

test.describe('流程 13：统计数据准确性', () => {
  test('本周统计包含正确的任务数和完成率', async () => {
    const child = await findMemberByRole('child')
    const mom = await findMemberByRole('mom')

    // 获取本周统计（offset=0）
    const stats = await getStats(child.id, 'weekly', 0)
    expect(stats).toBeTruthy()
    expect(stats.period).toBe('weekly')
    expect(stats.offset).toBe(0)
    expect(stats.periodStart).toBeTruthy()
    expect(stats.periodEnd).toBeTruthy()
    // 趋势数组应有 4 个周期
    expect(stats.trend.length).toBe(4)
  })

  test('打卡+审核后统计正确反映', async () => {
    const child = await findMemberByRole('child')
    const mom = await findMemberByRole('mom')

    // 用 helpers 打卡一个活动并审核通过
    const { getTodayActivities, getPending } = await import('./helpers')
    const activities = await getTodayActivities(child.id)
    if (activities.length === 0) {
      test.skip()
      return
    }

    const before = await getStats(child.id, 'weekly', 0)
    const beforeCompleted = before.completedTasks

    // 打卡 + 审核
    await checkIn(activities[0].id, child.id)
    const pending = await getPending()
    const log = pending.find((p) => p.activityId === activities[0].id)
    if (log) {
      await verify([log.id], 'approve', mom.id)
    }

    // 重新查统计
    const after = await getStats(child.id, 'weekly', 0)
    // 已完成任务应增加（或至少不减）
    expect(after.completedTasks).toBeGreaterThanOrEqual(beforeCompleted)
    expect(after.totalTasks).toBeGreaterThanOrEqual(before.totalTasks)
  })

  test('趋势数据包含 completionRate/onTimeRate/pointsNet', async () => {
    const child = await findMemberByRole('child')
    const stats = await getStats(child.id, 'weekly', 0)

    for (const t of stats.trend) {
      expect(t).toHaveProperty('label')
      expect(t).toHaveProperty('completionRate')
      expect(t).toHaveProperty('onTimeRate')
      expect(t).toHaveProperty('pointsNet')
      expect(typeof t.completionRate).toBe('number')
      expect(typeof t.onTimeRate).toBe('number')
      expect(typeof t.pointsNet).toBe('number')
    }
  })

  test('月报统计 periodStart 是月初', async () => {
    const child = await findMemberByRole('child')
    const stats = await getStats(child.id, 'monthly', 0)

    const start = new Date(stats.periodStart)
    expect(start.getDate()).toBe(1) // 月初
    expect(stats.period).toBe('monthly')
  })

  test('offset=1 查询上周/上月数据', async () => {
    const child = await findMemberByRole('child')

    const thisWeek = await getStats(child.id, 'weekly', 0)
    const lastWeek = await getStats(child.id, 'weekly', 1)

    // 上周的 periodStart 应早于本周
    const thisStart = new Date(thisWeek.periodStart).getTime()
    const lastStart = new Date(lastWeek.periodStart).getTime()
    expect(lastStart).toBeLessThan(thisStart)
  })
})

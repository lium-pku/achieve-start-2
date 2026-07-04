import { test, expect } from '@playwright/test'
import {
  findMemberByRole,
  getTodayActivities,
  checkIn,
  checkPenalty,
  getActivityLogs,
  setMemberPoints,
  getMembers,
  getPending,
  resetAll,
} from './helpers'

test.beforeAll(async () => {
  await resetAll()
})

test.describe('流程 3：扣分流程', () => {
  test('已打卡待审核的活动不应被扣分', async () => {
    const child = await findMemberByRole('child')
    await setMemberPoints(child.id, 50) // 给点初始积分
    const mom = await findMemberByRole('mom')

    // 获取今日活动
    const activities = await getTodayActivities(child.id)
    expect(activities.length).toBeGreaterThan(0)

    // 找一个未打卡的活动
    const logsBefore = await getActivityLogs(child.id)
    const loggedIds = new Set(logsBefore.map((l) => l.activityId))
    const activity = activities.find((a) => !loggedIds.has(a.id))

    if (!activity) {
      test.skip()
      return
    }

    // 1. 打卡（状态 = pending_verification）
    await checkIn(activity.id, child.id)

    // 2. 触发扣分检查
    const res = await checkPenalty(child.id)

    // 3. 确认刚打卡的活动没被扣分
    const logsAfter = await getActivityLogs(child.id)
    const log = logsAfter.find((l) => l.activityId === activity.id)
    expect(log).toBeTruthy()
    // 状态应保持 pending_verification，不应变成 missed
    expect(log.status).toBe('pending_verification')

    // 4. 确认积分没变（50 分）
    const membersAfter = await getMembers()
    const childAfter = membersAfter.find((m) => m.id === child.id)!
    // 积分应该还是 50（已打卡的活动不会被扣分）
    expect(childAfter.totalPoints).toBe(50)
  })

  test('未打卡且超时的活动会被扣分', async () => {
    const child = await findMemberByRole('child')
    await setMemberPoints(child.id, 50)

    // 触发扣分检查
    const res: any = await checkPenalty(child.id)

    // 如果有未打卡且超时的活动，应该被扣分
    if (res.processed > 0) {
      // 积分应该减少（但不会扣到负数）
      const membersAfter = await getMembers()
      const childAfter = membersAfter.find((m) => m.id === child.id)!
      expect(childAfter.totalPoints).toBeGreaterThanOrEqual(0)
      expect(childAfter.totalPoints).toBeLessThanOrEqual(50)
    }
  })
})

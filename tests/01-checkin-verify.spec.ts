import { test, expect } from '@playwright/test'
import {
  findMemberByRole,
  getTodayActivities,
  checkIn,
  getPending,
  verify,
  getActivityLogs,
  setMemberPoints,
  resetAndSeed,
  getMembers,
} from './helpers'

test.beforeAll(async () => {
  await resetAndSeed()
})

test.describe('流程 1：打卡 → 审核 → 发分', () => {
  test('孩子打卡后待审核，家长通过后积分到账', async () => {
    // 前置：重置孩子积分为 0
    const child = await findMemberByRole('child')
    await setMemberPoints(child.id, 0)

    // 1. 获取今日第一个活动
    const activities = await getTodayActivities(child.id)
    expect(activities.length).toBeGreaterThan(0)
    const activity = activities[0]

    // 2. 确认当前没有待审核记录
    const pendingBefore = await getPending()
    const before = pendingBefore.filter((p) => p.activityId === activity.id).length
    expect(before).toBe(0)

    // 3. 孩子打卡
    const checkInRes: any = await checkIn(activity.id, child.id)
    expect(checkInRes.log.status).toBe('pending_verification')
    expect(checkInRes.pointsAwarded).toBe(activity.points)

    // 4. 确认待审核列表出现该记录
    const pendingAfter = await getPending()
    const found = pendingAfter.find((p) => p.activityId === activity.id)
    expect(found).toBeTruthy()
    expect(found.status).toBe('pending_verification')

    // 5. 家长审核通过
    const mom = await findMemberByRole('mom')
    const verifyRes = await verify([found.id], 'approve', mom.id)
    expect(verifyRes.processed).toBe(1)
    expect(verifyRes.action).toBe('approve')

    // 6. 确认待审核列表里已移除
    const pendingFinal = await getPending()
    expect(pendingFinal.find((p) => p.id === found.id)).toBeUndefined()

    // 7. 确认 ActivityLog 状态变为 completed
    const logs = await getActivityLogs(child.id)
    const log = logs.find((l) => l.activityId === activity.id)
    expect(log).toBeTruthy()
    expect(log.status).toBe('completed')
    expect(log.verifiedById).toBe(mom.id)
    expect(log.verifiedAt).toBeTruthy()

    // 8. 确认积分已到账（用打卡时实际计算的积分）
    const expectedPoints = checkInRes.pointsAwarded + checkInRes.bonusAwarded
    const membersAfter = await getMembers()
    const childAfter = membersAfter.find((m) => m.id === child.id)!
    expect(childAfter.totalPoints).toBe(expectedPoints)
  })

  test('重复打卡同一活动应被拒绝', async () => {
    const child = await findMemberByRole('child')
    const activities = await getTodayActivities(child.id)
    if (activities.length < 2) {
      test.skip()
      return
    }
    const activity = activities[1]

    // 第一次打卡
    await checkIn(activity.id, child.id)

    // 第二次打卡应该失败
    await expect(checkIn(activity.id, child.id)).rejects.toThrow(/已打卡/)
  })
})

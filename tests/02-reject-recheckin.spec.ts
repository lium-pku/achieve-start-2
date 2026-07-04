import { test, expect } from '@playwright/test'
import {
  findMemberByRole,
  getTodayActivities,
  checkIn,
  getPending,
  verify,
  getActivityLogs,
  setMemberPoints,
  getMembers,
  resetAndSeed,
} from './helpers'

test.beforeAll(async () => {
  await resetAndSeed()
})

test.describe('流程 2：拒绝审核 → 重新打卡', () => {
  test('家长拒绝后不发积分，且可重新打卡', async () => {
    const child = await findMemberByRole('child')
    await setMemberPoints(child.id, 0)
    const mom = await findMemberByRole('mom')

    // 获取今日活动，找一个未打卡的
    const activities = await getTodayActivities(child.id)
    expect(activities.length).toBeGreaterThan(0)

    // 找一个还没打卡的活动
    const logsBefore = await getActivityLogs(child.id)
    const loggedActivityIds = new Set(logsBefore.map((l) => l.activityId))
    const activity = activities.find((a) => !loggedActivityIds.has(a.id))

    if (!activity) {
      test.skip()
      return
    }

    // 1. 打卡
    await checkIn(activity.id, child.id)

    // 2. 家长拒绝
    const pending = await getPending()
    const log = pending.find((p) => p.activityId === activity.id)
    expect(log).toBeTruthy()

    const verifyRes = await verify([log.id], 'reject', mom.id)
    expect(verifyRes.processed).toBe(1)
    expect(verifyRes.action).toBe('reject')

    // 3. 确认状态变为 rejected
    const logsAfter = await getActivityLogs(child.id)
    const rejectedLog = logsAfter.find((l) => l.activityId === activity.id)
    expect(rejectedLog).toBeTruthy()
    expect(rejectedLog.status).toBe('rejected')

    // 4. 确认积分没有增加
    const membersAfter = await getMembers()
    const childAfter = membersAfter.find((m) => m.id === child.id)!
    expect(childAfter.totalPoints).toBe(0)

    // 5. 重新打卡（rejected 状态允许重新打卡）
    const reCheckIn: any = await checkIn(activity.id, child.id)
    expect(reCheckIn.log.status).toBe('pending_verification')

    // 6. 确认又出现在待审核列表
    const pendingFinal = await getPending()
    const found = pendingFinal.find((p) => p.activityId === activity.id)
    expect(found).toBeTruthy()
    expect(found.status).toBe('pending_verification')
  })
})

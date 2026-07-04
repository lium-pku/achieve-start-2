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
  resetAll,
} from './helpers'

test.beforeAll(async () => {
  await resetAll()
})

test.describe('流程 5：代打卡 → 审核', () => {
  test('家长代打卡后记录 operatorId，审核通过后发分', async () => {
    const child = await findMemberByRole('child')
    const mom = await findMemberByRole('mom')
    await setMemberPoints(child.id, 0)

    // 1. 获取今日活动
    const activities = await getTodayActivities(child.id)
    expect(activities.length).toBeGreaterThan(0)

    // 找一个未打卡的
    const logsBefore = await getActivityLogs(child.id)
    const loggedIds = new Set(logsBefore.map((l) => l.activityId))
    const activity = activities.find((a) => !loggedIds.has(a.id))

    if (!activity) {
      test.skip()
      return
    }

    // 2. 妈妈代打卡
    const res: any = await checkIn(activity.id, child.id, mom.id)
    expect(res.log.status).toBe('pending_verification')
    expect(res.log.operatorId).toBe(mom.id)
    expect(res.message).toContain('代打卡')

    // 3. 确认待审核列表有该记录，且 operatorId 正确
    const pending = await getPending()
    const found = pending.find((p) => p.activityId === activity.id)
    expect(found).toBeTruthy()
    expect(found.operatorId).toBe(mom.id)

    // 4. 爸爸审核通过（用另一个家长审核，模拟真实场景）
    const dad = await findMemberByRole('dad')
    const verifyRes = await verify([found.id], 'approve', dad.id)
    expect(verifyRes.processed).toBe(1)

    // 5. 确认状态 completed，verifiedById 是爸爸
    const logsAfter = await getActivityLogs(child.id)
    const log = logsAfter.find((l) => l.activityId === activity.id)
    expect(log.status).toBe('completed')
    expect(log.verifiedById).toBe(dad.id)
    expect(log.operatorId).toBe(mom.id) // 打卡人仍是妈妈

    // 6. 确认积分到账
    const membersAfter = await getMembers()
    const childAfter = membersAfter.find((m) => m.id === child.id)!
    const expected = activity.points + (activity.onTimeBonus || 0)
    expect(childAfter.totalPoints).toBe(expected)
  })

  test('孩子自己打卡 operatorId 为 null', async () => {
    const child = await findMemberByRole('child')

    const activities = await getTodayActivities(child.id)
    const logsBefore = await getActivityLogs(child.id)
    const loggedIds = new Set(logsBefore.map((l) => l.activityId))
    const activity = activities.find((a) => !loggedIds.has(a.id))

    if (!activity) {
      test.skip()
      return
    }

    // 孩子自己打卡（不传 operatorId）
    const res: any = await checkIn(activity.id, child.id)
    expect(res.log.operatorId).toBeNull()

    // 确认待审核记录的 operatorId 也是 null
    const pending = await getPending()
    const found = pending.find((p) => p.activityId === activity.id)
    expect(found).toBeTruthy()
    expect(found.operatorId).toBeNull()
  })
})

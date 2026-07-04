import { test, expect } from '@playwright/test'
import {
  login,
  switchRole,
  resetAndSeed,
  findMemberByRole,
  createActivity,
  createReward,
  createMember,
  verify,
  resolveRedemption,
  checkPenalty,
  createEncouragement,
  getMembers,
  getTodayActivities,
  checkIn,
  getPending,
  redeem,
  getRewards,
} from './helpers'

test.describe('流程 20：角色权限校验（v2.0 安全核心）', () => {
  test.beforeAll(async () => {
    await login('test-mom')
    await resetAndSeed()
  })

  test('孩子不能创建活动', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    // 切换到孩子身份
    await switchRole('test-child')

    await expect(
      createActivity({
        title: '孩子试图创建活动',
        scheduleType: 'daily',
        createdById: mom.id,
        assignedToId: child.id,
      })
    ).rejects.toThrow(/家长权限/)
  })

  test('孩子不能创建奖励', async () => {
    const mom = await findMemberByRole('mom')
    await switchRole('test-child')

    await expect(
      createReward({ title: '孩子奖励', pointsCost: 10, createdById: mom.id })
    ).rejects.toThrow(/家长权限/)
  })

  test('孩子不能创建成员', async () => {
    await switchRole('test-child')

    await expect(
      createMember({ name: '新成员', role: 'child' })
    ).rejects.toThrow(/家长权限/)
  })

  test('孩子不能审核打卡', async () => {
    // 先用妈妈身份打卡一个活动
    await switchRole('test-mom')
    const child = await findMemberByRole('child')
    const activities = await getTodayActivities(child.id)
    if (activities.length === 0) {
      test.skip()
      return
    }
    await checkIn(activities[0].id, child.id)
    const pending = await getPending()
    const log = pending[0]

    // 切换到孩子身份审核
    await switchRole('test-child')
    await expect(verify([log.id], 'approve', child.id)).rejects.toThrow(/家长权限/)
  })

  test('孩子不能审核兑换', async () => {
    // 先用妈妈身份给孩子加积分 + 兑换
    await switchRole('test-mom')
    const child = await findMemberByRole('child')
    const { setMemberPoints } = await import('./helpers')
    await setMemberPoints(child.id, 50)

    const rewards = await getRewards()
    const cheapest = [...rewards].sort((a, b) => a.pointsCost - b.pointsCost)[0]
    const redemption: any = await redeem(cheapest.id, child.id)

    // 切换到孩子身份审核兑换
    await switchRole('test-child')
    await expect(
      resolveRedemption(redemption.id, 'approved', child.id)
    ).rejects.toThrow(/家长权限/)
  })

  test('孩子不能触发扣分检查', async () => {
    await switchRole('test-child')
    await expect(checkPenalty()).rejects.toThrow(/家长权限/)
  })

  test('孩子不能创建鼓励阈值', async () => {
    await switchRole('test-child')
    await expect(
      createEncouragement({
        threshold: 999,
        title: '测试',
        message: '测试',
      })
    ).rejects.toThrow(/家长权限/)
  })

  test('孩子可以打卡自己的任务', async () => {
    await switchRole('test-child')
    const child = await findMemberByRole('child')
    const activities = await getTodayActivities(child.id)
    if (activities.length === 0) {
      test.skip()
      return
    }
    // 找一个没打卡的
    const { getActivityLogs } = await import('./helpers')
    const logs = await getActivityLogs(child.id)
    const logged = new Set(logs.map((l) => l.activityId))
    const unlogged = activities.find((a) => !logged.has(a.id))
    if (!unlogged) {
      test.skip()
      return
    }
    const res: any = await checkIn(unlogged.id, child.id)
    expect(res.log.status).toBe('pending_verification')
  })

  test('孩子可以兑换奖励', async () => {
    await switchRole('test-mom')
    const child = await findMemberByRole('child')
    const { setMemberPoints } = await import('./helpers')
    await setMemberPoints(child.id, 50)

    const rewards = await getRewards()
    const cheapest = [...rewards].sort((a, b) => a.pointsCost - b.pointsCost)[0]

    // 孩子身份兑换
    await switchRole('test-child')
    const res: any = await redeem(cheapest.id, child.id)
    expect(res.status).toBe('pending')
  })

  test('孩子可以写点评', async () => {
    await switchRole('test-child')
    const child = await findMemberByRole('child')
    const { createReview } = await import('./helpers')
    const res: any = await createReview({
      periodType: 'weekly',
      periodStart: '2026-06-23T00:00:00.000Z',
      periodEnd: '2026-06-30T00:00:00.000Z',
      authorId: child.id,
      content: '孩子自评',
    })
    expect(res.content).toBe('孩子自评')
  })

  test('孩子可以创建自己的目标', async () => {
    await switchRole('test-child')
    const child = await findMemberByRole('child')
    const { createGoal } = await import('./helpers')
    const res: any = await createGoal({
      title: '孩子的目标',
      memberId: child.id,
    })
    expect(res.title).toBe('孩子的目标')
  })
})

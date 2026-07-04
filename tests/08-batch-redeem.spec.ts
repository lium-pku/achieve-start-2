import { test, expect } from '@playwright/test'
import {
  findMemberByRole,
  getTodayActivities,
  checkIn,
  getPending,
  verify,
  getRewards,
  redeem,
  getRedemptions,
  resolveRedemption,
  setMemberPoints,
  resetAll,
} from './helpers'

test.beforeAll(async () => {
  await resetAll()
})

test.describe('流程 8：批量审核多个 + 兑换 fulfilled', () => {
  test('一次审核通过多个打卡记录', async () => {
    const child = await findMemberByRole('child')
    const mom = await findMemberByRole('mom')
    await setMemberPoints(child.id, 0)

    // 1. 打卡 3 个活动
    const activities = await getTodayActivities(child.id)
    expect(activities.length).toBeGreaterThanOrEqual(3)

    const targets = activities.slice(0, 3)
    for (const a of targets) {
      await checkIn(a.id, child.id)
    }

    // 2. 确认 3 条待审核
    const pending = await getPending()
    expect(pending.length).toBeGreaterThanOrEqual(3)

    // 3. 一次性批量通过这 3 条
    const logIds = pending
      .filter((p) => targets.some((t) => t.id === p.activityId))
      .map((p) => p.id)
    expect(logIds.length).toBe(3)

    const res = await verify(logIds, 'approve', mom.id)
    expect(res.processed).toBe(3)

    // 4. 确认待审核列表清空了这 3 条
    const pendingAfter = await getPending()
    logIds.forEach((id) => {
      expect(pendingAfter.find((p) => p.id === id)).toBeUndefined()
    })
  })

  test('兑换审核完整流程：pending → approved → fulfilled', async () => {
    const child = await findMemberByRole('child')
    const mom = await findMemberByRole('mom')

    // 1. 设置足够积分
    const rewards = await getRewards()
    const cheapest = [...rewards].sort((a, b) => a.pointsCost - b.pointsCost)[0]
    await setMemberPoints(child.id, cheapest.pointsCost)

    // 2. 兑换（pending）
    const redeemRes: any = await redeem(cheapest.id, child.id)
    expect(redeemRes.status).toBe('pending')

    // 3. 家长通过（approved）
    await resolveRedemption(redeemRes.id, 'approved', mom.id)
    const list1 = await getRedemptions()
    expect(list1.find((r) => r.id === redeemRes.id).status).toBe('approved')

    // 4. 标记已兑现（fulfilled）
    await resolveRedemption(redeemRes.id, 'fulfilled', mom.id)
    const list2 = await getRedemptions()
    expect(list2.find((r) => r.id === redeemRes.id).status).toBe('fulfilled')
  })

  test('不能对已 fulfilled 的兑换再次操作', async () => {
    const child = await findMemberByRole('child')
    const mom = await findMemberByRole('mom')

    const rewards = await getRewards()
    const cheapest = [...rewards].sort((a, b) => a.pointsCost - b.pointsCost)[0]
    await setMemberPoints(child.id, cheapest.pointsCost)

    const redeemRes: any = await redeem(cheapest.id, child.id)
    await resolveRedemption(redeemRes.id, 'approved', mom.id)
    await resolveRedemption(redeemRes.id, 'fulfilled', mom.id)

    // 再次 fulfilled 应该仍能调用（幂等），但不应退还积分
    await resolveRedemption(redeemRes.id, 'rejected', mom.id)

    // 积分不应被退还（仍是 0）
    const members = await import('./helpers').then((m) => m.getMembers())
    const childAfter = members.find((m: any) => m.id === child.id)!
    expect(childAfter.totalPoints).toBe(0)
  })
})

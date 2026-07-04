import { test, expect } from '@playwright/test'
import {
  findMemberByRole,
  getRewards,
  redeem,
  getRedemptions,
  resolveRedemption,
  setMemberPoints,
  getMembers,
  resetAll,
} from './helpers'

test.beforeAll(async () => {
  await resetAll()
})

test.describe('流程 4：兑换流程', () => {
  test('积分足够时兑换 → 家长通过 → 积分扣除', async () => {
    const child = await findMemberByRole('child')
    const mom = await findMemberByRole('mom')

    // 1. 获取最便宜的奖励
    const rewards = await getRewards()
    expect(rewards.length).toBeGreaterThan(0)
    const cheapest = [...rewards].sort((a, b) => a.pointsCost - b.pointsCost)[0]

    // 2. 设置孩子积分足够
    await setMemberPoints(child.id, cheapest.pointsCost)

    // 3. 兑换
    const redeemRes: any = await redeem(cheapest.id, child.id)
    expect(redeemRes.status).toBe('pending')
    expect(redeemRes.pointsSpent).toBe(cheapest.pointsCost)
    expect(redeemRes.reward.id).toBe(cheapest.id)

    // 4. 确认积分已扣除
    const membersAfter = await getMembers()
    const childAfter = membersAfter.find((m) => m.id === child.id)!
    expect(childAfter.totalPoints).toBe(0)

    // 5. 家长审核通过
    const redemptionId = redeemRes.id
    await resolveRedemption(redemptionId, 'approved', mom.id)

    // 6. 确认状态变为 approved
    const redemptions = await getRedemptions()
    const r = redemptions.find((r) => r.id === redemptionId)
    expect(r).toBeTruthy()
    expect(r.status).toBe('approved')
  })

  test('积分不足时兑换应失败', async () => {
    const child = await findMemberByRole('child')

    // 设置积分为 0
    await setMemberPoints(child.id, 0)

    // 获取最贵的奖励
    const rewards = await getRewards()
    expect(rewards.length).toBeGreaterThan(0)
    const expensive = [...rewards].sort((a, b) => b.pointsCost - a.pointsCost)[0]

    // 兑换应该失败
    await expect(redeem(expensive.id, child.id)).rejects.toThrow(/积分不足/)

    // 确认积分还是 0
    const membersAfter = await getMembers()
    const childAfter = membersAfter.find((m) => m.id === child.id)!
    expect(childAfter.totalPoints).toBe(0)
  })

  test('兑换被拒绝后积分退还', async () => {
    const child = await findMemberByRole('child')
    const mom = await findMemberByRole('mom')

    const rewards = await getRewards()
    const cheapest = [...rewards].sort((a, b) => a.pointsCost - b.pointsCost)[0]

    // 设置积分足够
    await setMemberPoints(child.id, cheapest.pointsCost)

    // 兑换
    const redeemRes: any = await redeem(cheapest.id, child.id)

    // 确认积分已扣
    let membersAfter = await getMembers()
    let childAfter = membersAfter.find((m) => m.id === child.id)!
    expect(childAfter.totalPoints).toBe(0)

    // 家长拒绝
    await resolveRedemption(redeemRes.id, 'rejected', mom.id)

    // 确认积分退还
    membersAfter = await getMembers()
    childAfter = membersAfter.find((m) => m.id === child.id)!
    expect(childAfter.totalPoints).toBe(cheapest.pointsCost)

    // 确认状态为 rejected
    const redemptions = await getRedemptions()
    const r = redemptions.find((r) => r.id === redeemRes.id)
    expect(r.status).toBe('rejected')
  })
})

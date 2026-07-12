import { test, expect } from '@playwright/test'
import {
  login,
  switchRole,
  resetAndSeed,
  findMemberByRole,
  getTodayActivities,
  createActivity,
  createReward,
  createGoal,
  checkIn,
  redeem,
  getMembers,
  getGoals,
  getRewards,
  api,
} from './helpers'

test.describe('流程 21：跨家庭越权访问防护（v2.0 安全核心）', () => {
  test('家庭 B 不能访问家庭 A 的成员详情', async () => {
    // 家庭 A 登录，拿到成员 id
    await login('test-mom')
    await resetAndSeed()
    const aMembers = await getMembers()
    const aChildId = aMembers.find((m) => m.role === 'child')!.id

    // 家庭 B 登录
    await login('family-x-mom')

    // 用家庭 B 的 token 访问家庭 A 的成员积分流水
    await expect(api(`/api/points/${aChildId}`)).rejects.toThrow(/不存在|无权|404/)
  })

  test('家庭 B 不能 PATCH 家庭 A 的活动', async () => {
    // 家庭 A 创建活动
    await login('test-mom')
    await resetAndSeed()
    const aActivities = await getTodayActivities()
    if (aActivities.length === 0) {
      test.skip()
      return
    }
    const aActivityId = aActivities[0].id

    // 家庭 B 尝试修改
    await login('family-y-mom')
    await expect(
      api(`/api/activities/${aActivityId}`, {
        method: 'PATCH',
        body: { title: '被篡改' },
      })
    ).rejects.toThrow(/不存在|无权|404/)
  })

  test('家庭 B 不能 DELETE 家庭 A 的目标', async () => {
    // 家庭 A 孩子创建目标
    await login('test-child')
    await resetAndSeed()
    const aChild = await findMemberByRole('child')
    const aGoal: any = await createGoal({ title: '家庭A目标', memberId: aChild.id })

    // 家庭 B 尝试删除
    await login('family-z-child')
    await expect(
      api(`/api/goals/${aGoal.id}`, { method: 'DELETE' })
    ).rejects.toThrow(/不存在|无权|404/)
  })

  test('家庭 B 不能用家庭 A 的活动打卡', async () => {
    // 家庭 A 拿活动 id
    await login('test-mom')
    await resetAndSeed()
    const aChild = await findMemberByRole('child')
    const aActivities = await getTodayActivities(aChild.id)
    if (aActivities.length === 0) {
      test.skip()
      return
    }
    const aActivityId = aActivities[0].id

    // 家庭 B 登录，用自己的孩子 id 但家庭 A 的活动 id
    await login('family-w-mom')
    const bChild = await findMemberByRole('child')
    await expect(
      checkIn(aActivityId, bChild.id)
    ).rejects.toThrow(/不存在|无权|404/)
  })

  test('家庭 B 不能用家庭 A 的奖励兑换', async () => {
    // 家庭 A 拿奖励 id
    await login('test-mom')
    await resetAndSeed()
    const aRewards = await getRewards()
    const aRewardId = aRewards[0].id

    // 家庭 B 登录，用自己的孩子 id 但家庭 A 的奖励 id
    await login('family-v-mom')
    const bChild = await findMemberByRole('child')
    const { setMemberPoints } = await import('./helpers')
    await setMemberPoints(bChild.id, 100)
    await expect(
      redeem(aRewardId, bChild.id)
    ).rejects.toThrow(/不存在|无权|404|下架/)
  })

  test('家庭 B 不能审核家庭 A 的兑换', async () => {
    // 家庭 A 兑换
    await login('test-mom')
    await resetAndSeed()
    const aChild = await findMemberByRole('child')
    const { setMemberPoints } = await import('./helpers')
    await setMemberPoints(aChild.id, 50)
    const aRewards = await getRewards()
    const cheapest = [...aRewards].sort((a, b) => a.pointsCost - b.pointsCost)[0]
    const aRedemption: any = await redeem(cheapest.id, aChild.id)

    // 家庭 B 尝试审核
    await login('family-u-mom')
    const bMom = await findMemberByRole('mom')
    await expect(
      api(`/api/redemptions/${aRedemption.id}`, {
        method: 'PATCH',
        body: { status: 'approved', resolvedById: bMom.id },
      })
    ).rejects.toThrow(/不存在|无权|404/)
  })

  test('家庭 B 看不到家庭 A 的统计', async () => {
    // 家庭 A 拿孩子 id
    await login('test-mom')
    await resetAndSeed()
    const aChild = await findMemberByRole('child')

    // 家庭 B 登录，查家庭 A 孩子的统计
    await login('family-t-mom')
    await expect(
      api(`/api/stats?memberId=${aChild.id}&period=weekly&offset=0`)
    ).rejects.toThrow(/不存在|无权|404/)
  })

  test('家庭 B 看不到家庭 A 的鼓励阈值', async () => {
    // 家庭 A 有 3 个鼓励
    await login('test-mom')
    await resetAndSeed()
    const { getEncouragements } = await import('./helpers')
    const aEncs = await getEncouragements()
    expect(aEncs.length).toBe(3)

    // 家庭 B（新家庭）没有鼓励
    await login('family-s-mom')
    const bEncs = await getEncouragements()
    expect(bEncs.length).toBe(0)
  })

  test('家庭 B 看不到家庭 A 的点评', async () => {
    // 家庭 A 孩子写点评
    await login('test-child')
    await resetAndSeed()
    const aChild = await findMemberByRole('child')
    const { createReview, getReviews } = await import('./helpers')
    await createReview({
      periodType: 'weekly',
      periodStart: '2026-06-23T00:00:00.000Z',
      periodEnd: '2026-06-30T00:00:00.000Z',
      authorId: aChild.id,
      content: '家庭A的点评',
    })

    // 家庭 B 查点评，不应看到家庭 A 的
    await login('family-r-mom')
    const bReviews = await getReviews('weekly')
    expect(bReviews.find((r) => r.content === '家庭A的点评')).toBeUndefined()
  })
})

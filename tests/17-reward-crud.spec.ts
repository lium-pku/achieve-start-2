import { test, expect } from '@playwright/test'
import {
  findMemberByRole,
  getRewards,
  createReward,
  updateReward,
  deleteReward,
  resetAndSeed,
} from './helpers'

test.beforeAll(async () => {
  await resetAndSeed()
})

test.describe('流程 17：奖励 CRUD', () => {
  test('新建奖励 → 编辑 → 删除', async () => {
    const mom = await findMemberByRole('mom')

    // 1. 新建
    const created: any = await createReward({
      title: '测试奖励-看动画片',
      pointsCost: 25,
      createdById: mom.id,
      icon: '📺',
      description: '看 30 分钟',
    })
    expect(created.id).toBeTruthy()
    expect(created.title).toBe('测试奖励-看动画片')
    expect(created.pointsCost).toBe(25)
    expect(created.active).toBe(true)

    // 2. 确认在列表里
    const rewards = await getRewards()
    expect(rewards.find((r) => r.id === created.id)).toBeTruthy()

    // 3. 编辑
    const updated: any = await updateReward(created.id, {
      title: '测试奖励-改',
      pointsCost: 35,
    })
    expect(updated.title).toBe('测试奖励-改')
    expect(updated.pointsCost).toBe(35)

    // 4. 删除（软删除 active=false）
    await deleteReward(created.id)
    const rewardsAfter = await getRewards()
    expect(rewardsAfter.find((r) => r.id === created.id)).toBeUndefined()
  })

  test('缺少 title 应失败', async () => {
    const mom = await findMemberByRole('mom')
    await expect(
      createReward({ title: '', pointsCost: 30, createdById: mom.id })
    ).rejects.toThrow(/title/)
  })

  test('固定 seed 应有 2 个奖励', async () => {
    const rewards = await getRewards()
    expect(rewards.length).toBe(2)
    // 应该有 30 分和 80 分的
    const costs = rewards.map((r) => r.pointsCost).sort((a, b) => a - b)
    expect(costs).toEqual([30, 80])
  })
})

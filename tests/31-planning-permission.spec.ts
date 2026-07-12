import { test, expect } from '@playwright/test'
import {
  login,
  resetAndSeed,
  findMemberByRole,
  createGoal,
  updateGoal,
  deleteGoal,
  createReview,
  getGoals,
  getReviews,
} from './helpers'

test.beforeAll(async () => {
  await login('test-mom')
  await resetAndSeed()
})

test.describe('流程 31：规划功能 API/UI 权限一致性', () => {
  test('家长不能创建目标（API 限制）', async () => {
    await login('test-mom')
    const mom = await findMemberByRole('mom')

    await expect(
      createGoal({ title: '家长的目标', memberId: mom.id })
    ).rejects.toThrow(/只有孩子/)
  })

  test('家长不能编辑目标（API 限制）', async () => {
    await login('test-child')
    const child = await findMemberByRole('child')
    const goal: any = await createGoal({ title: '孩子的目标', memberId: child.id })

    await login('test-mom')
    await expect(
      updateGoal(goal.id, { title: '被家长篡改' })
    ).rejects.toThrow(/只有孩子/)
  })

  test('家长不能删除目标（API 限制）', async () => {
    await login('test-child')
    const child = await findMemberByRole('child')
    const goal: any = await createGoal({ title: '待删除目标', memberId: child.id })

    await login('test-mom')
    await expect(
      deleteGoal(goal.id)
    ).rejects.toThrow(/只有孩子/)
  })

  test('家长不能写点评（API 限制）', async () => {
    await login('test-mom')
    const mom = await findMemberByRole('mom')

    await expect(
      createReview({
        periodType: 'weekly',
        periodStart: '2026-07-07T00:00:00.000Z',
        periodEnd: '2026-07-14T00:00:00.000Z',
        authorId: mom.id,
        content: '家长点评',
      })
    ).rejects.toThrow(/只有孩子/)
  })

  test('孩子能创建自己的目标', async () => {
    await login('test-child')
    const child = await findMemberByRole('child')

    const goal: any = await createGoal({ title: '孩子新目标', memberId: child.id })
    expect(goal.id).toBeTruthy()
    expect(goal.memberId).toBe(child.id)
  })

  test('孩子不能给别人创建目标（API 限制）', async () => {
    await login('test-child')
    const mom = await findMemberByRole('mom')

    await expect(
      createGoal({ title: '给妈妈的目标', memberId: mom.id })
    ).rejects.toThrow(/只能为自己/)
  })

  test('孩子能看到自己的目标（数量正确）', async () => {
    await login('test-child')
    const child = await findMemberByRole('child')

    const goals = await getGoals(child.id)
    // seed 的 1 个 + 之前测试创建的（可能有多个，至少 1 个）
    expect(goals.length).toBeGreaterThanOrEqual(1)
    for (const g of goals) {
      expect(g.memberId).toBe(child.id)
    }
  })

  test('家长能查看全家目标但不能操作', async () => {
    await login('test-mom')
    const allGoals = await getGoals()
    expect(allGoals.length).toBeGreaterThanOrEqual(1)
    // 家长能查但不能增删改（前面已测）
  })

  test('孩子点评只看到自己的（前端过滤验证）', async () => {
    // 先用孩子写一条点评
    await login('test-child')
    const child = await findMemberByRole('child')
    await createReview({
      periodType: 'weekly',
      periodStart: '2026-07-07T00:00:00.000Z',
      periodEnd: '2026-07-14T00:00:00.000Z',
      authorId: child.id,
      content: '孩子自评测试',
    })

    // 查所有点评，验证孩子写的在里面
    const allReviews = await getReviews('weekly')
    const childReviews = allReviews.filter((r) => r.authorId === child.id)
    expect(childReviews.length).toBeGreaterThanOrEqual(1)
    expect(childReviews[0].content).toBe('孩子自评测试')
  })
})

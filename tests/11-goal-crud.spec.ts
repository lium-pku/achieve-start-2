import { test, expect } from '@playwright/test'
import {
  findMemberByRole,
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  resetAndSeed,
} from './helpers'

test.beforeAll(async () => {
  await resetAndSeed()
})

test.describe('流程 11：目标 CRUD + 状态切换', () => {
  test('新建目标 → 改状态 → 编辑 → 删除', async () => {
    const child = await findMemberByRole('child')

    // 1. 新建
    const created: any = await createGoal({
      title: '本学期数学进前 5',
      memberId: child.id,
      description: '期末考试数学成绩进入班级前 5 名',
      deadline: '2026-12-31',
    })
    expect(created.id).toBeTruthy()
    expect(created.status).toBe('not_started')

    // 2. 确认能查到
    const goals = await getGoals(child.id)
    expect(goals.find((g) => g.id === created.id)).toBeTruthy()

    // 3. 切换状态为进行中
    const updated: any = await updateGoal(created.id, { status: 'in_progress' })
    expect(updated.status).toBe('in_progress')

    // 4. 切换为已达成
    const achieved: any = await updateGoal(created.id, { status: 'achieved' })
    expect(achieved.status).toBe('achieved')

    // 5. 编辑标题
    const edited: any = await updateGoal(created.id, { title: '本学期数学进前 3' })
    expect(edited.title).toBe('本学期数学进前 3')

    // 6. 删除
    await deleteGoal(created.id)
    const goalsAfter = await getGoals(child.id)
    expect(goalsAfter.find((g) => g.id === created.id)).toBeUndefined()
  })

  test('每个成员都有独立的目标', async () => {
    const child = await findMemberByRole('child')
    const mom = await findMemberByRole('mom')

    const childGoal = await createGoal({ title: '孩子的目标', memberId: child.id })
    const momGoal = await createGoal({ title: '妈妈的目标', memberId: mom.id })

    // 查孩子的目标，不应包含妈妈的
    const childGoals = await getGoals(child.id)
    expect(childGoals.find((g) => g.id === childGoal.id)).toBeTruthy()
    expect(childGoals.find((g) => g.id === momGoal.id)).toBeUndefined()

    // 查妈妈的目标，不应包含孩子的
    const momGoals = await getGoals(mom.id)
    expect(momGoals.find((g) => g.id === momGoal.id)).toBeTruthy()
    expect(momGoals.find((g) => g.id === childGoal.id)).toBeUndefined()
  })

  test('缺少 title 应失败', async () => {
    const child = await findMemberByRole('child')
    await expect(createGoal({ title: '', memberId: child.id })).rejects.toThrow(/title/)
  })

  test('缺少 memberId 应失败', async () => {
    await expect(
      createGoal({ title: '测试', memberId: '' })
    ).rejects.toThrow(/memberId/)
  })
})

import { test, expect } from '@playwright/test'
import {
  findMemberByRole,
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  resetAll,
} from './helpers'

test.beforeAll(async () => {
  await resetAll()
})

test.describe('流程 14：目标边界与字段校验', () => {
  test('截止日期正确存储和读取', async () => {
    const child = await findMemberByRole('child')

    const created: any = await createGoal({
      title: '带截止日期的目标',
      memberId: child.id,
      deadline: '2026-12-31',
    })
    expect(created.deadline).toBeTruthy()
    expect(new Date(created.deadline).getFullYear()).toBe(2026)
    expect(new Date(created.deadline).getMonth()).toBe(11) // 12 月
    expect(new Date(created.deadline).getDate()).toBe(31)

    // 编辑截止日期
    const updated: any = await updateGoal(created.id, { deadline: '2027-06-15' })
    expect(new Date(updated.deadline).getFullYear()).toBe(2027)
    expect(new Date(updated.deadline).getMonth()).toBe(5) // 6 月

    await deleteGoal(created.id)
  })

  test('描述字段正确存储', async () => {
    const child = await findMemberByRole('child')

    const created: any = await createGoal({
      title: '带描述的目标',
      memberId: child.id,
      description: '这是详细描述内容',
    })
    expect(created.description).toBe('这是详细描述内容')

    // 编辑描述
    const updated: any = await updateGoal(created.id, { description: '改后的描述' })
    expect(updated.description).toBe('改后的描述')

    await deleteGoal(created.id)
  })

  test('默认状态为 not_started', async () => {
    const child = await findMemberByRole('child')
    const created: any = await createGoal({
      title: '默认状态测试',
      memberId: child.id,
    })
    expect(created.status).toBe('not_started')
    await deleteGoal(created.id)
  })

  test('切换到已达成后再切回未开始', async () => {
    const child = await findMemberByRole('child')
    const created: any = await createGoal({
      title: '状态循环测试',
      memberId: child.id,
    })

    await updateGoal(created.id, { status: 'in_progress' })
    let g: any = await getGoals(child.id)
    expect(g.find((x) => x.id === created.id).status).toBe('in_progress')

    await updateGoal(created.id, { status: 'achieved' })
    g = await getGoals(child.id)
    expect(g.find((x) => x.id === created.id).status).toBe('achieved')

    // 切回未开始
    await updateGoal(created.id, { status: 'not_started' })
    g = await getGoals(child.id)
    expect(g.find((x) => x.id === created.id).status).toBe('not_started')

    await deleteGoal(created.id)
  })

  test('清空截止日期（设为 null）', async () => {
    const child = await findMemberByRole('child')
    const created: any = await createGoal({
      title: '清空日期测试',
      memberId: child.id,
      deadline: '2026-12-31',
    })
    expect(created.deadline).toBeTruthy()

    const updated: any = await updateGoal(created.id, { deadline: null })
    expect(updated.deadline).toBeNull()

    await deleteGoal(created.id)
  })

  test('查全部目标（不按 memberId 过滤）', async () => {
    const child = await findMemberByRole('child')
    const mom = await findMemberByRole('mom')

    const c1 = await createGoal({ title: '孩子目标1', memberId: child.id })
    const m1 = await createGoal({ title: '妈妈目标1', memberId: mom.id })

    // 不传 memberId，应返回所有目标
    const all = await getGoals()
    expect(all.find((g) => g.id === c1.id)).toBeTruthy()
    expect(all.find((g) => g.id === m1.id)).toBeTruthy()
    expect(all.length).toBeGreaterThanOrEqual(2)

    await deleteGoal(c1.id)
    await deleteGoal(m1.id)
  })

  test('删除不存在的目标应失败', async () => {
    await expect(deleteGoal('nonexistent-id')).rejects.toThrow()
  })
})

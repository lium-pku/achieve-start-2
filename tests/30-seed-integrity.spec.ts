import { test, expect } from '@playwright/test'
import {
  login,
  resetAndSeed,
  getMembers,
  getGoals,
  findMemberByRole,
} from './helpers'

test.beforeAll(async () => {
  await login('test-mom')
  await resetAndSeed()
})

test.describe('流程 30：seed 数据完整性', () => {
  test('seed 应有 4 个成员（2 孩子 + 妈妈 + 爸爸）', async () => {
    const members = await getMembers()
    expect(members.length).toBe(4)

    const children = members.filter((m) => m.role === 'child')
    expect(children.length).toBe(2)

    const names = children.map((m) => m.name).sort()
    expect(names).toEqual(['小宇', '小苒'])
  })

  test('seed 应有 2 个目标（小宇和小苒各 1 个）', async () => {
    const allGoals = await getGoals()
    expect(allGoals.length).toBe(2)

    const child = await findMemberByRole('child')
    const childGoals = await getGoals(child.id)
    expect(childGoals.length).toBe(1)
    expect(childGoals[0].title).toBe('暑假学会游泳')
    expect(childGoals[0].status).toBe('in_progress')
  })

  test('小宇和小苒都能看到各自的目标', async () => {
    const members = await getMembers()
    const children = members.filter((m) => m.role === 'child')

    for (const c of children) {
      const goals = await getGoals(c.id)
      expect(goals.length).toBe(1)
      expect(goals[0].memberId).toBe(c.id)
    }
  })
})

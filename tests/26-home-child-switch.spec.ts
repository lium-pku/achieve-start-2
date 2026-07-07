import { test, expect } from '@playwright/test'
import {
  login,
  resetAndSeed,
  findMemberByRole,
  getMembers,
  createMember,
  getTodayActivities,
  setMemberPoints,
  checkIn,
} from './helpers'

test.beforeAll(async () => {
  await login('test-mom')
  await resetAndSeed()
})

test.describe('流程 27：家长首页切换孩子', () => {
  test('家长视角下应有多个孩子可选', async () => {
    const mom = await findMemberByRole('mom')

    // 创建第二个孩子
    const child2: any = await createMember({
      name: '小苒',
      role: 'child',
      avatar: '👧',
      color: '#FF9A3C',
    })

    const members = await getMembers()
    const children = members.filter((m) => m.role === 'child')
    // 至少 2 个孩子
    expect(children.length).toBeGreaterThanOrEqual(2)
  })

  test('家长应能查看任意孩子的今日活动', async () => {
    const child = await findMemberByRole('child')

    // 创建第二个孩子
    const child2: any = await createMember({
      name: '小苒2',
      role: 'child',
      avatar: '👧',
      color: '#FF9A3C',
    })

    // 查 child 的活动
    const acts1 = await getTodayActivities(child.id)
    expect(acts1.length).toBeGreaterThan(0)

    // 查 child2 的活动（应有公共活动"家庭阅读时间"）
    const acts2 = await getTodayActivities(child2.id)
    const publicAct = acts2.find((a) => a.title === '家庭阅读时间')
    expect(publicAct).toBeTruthy()
  })

  test('家长应能给任意孩子代打卡', async () => {
    const child = await findMemberByRole('child')

    // 创建第二个孩子
    const child2: any = await createMember({
      name: '小苒3',
      role: 'child',
      avatar: '👧',
      color: '#FF9A3C',
    })

    // 给 child2 打卡公共活动
    const acts2 = await getTodayActivities(child2.id)
    const publicAct = acts2.find((a) => a.title === '家庭阅读时间')
    if (!publicAct) {
      test.skip()
      return
    }

    const mom = await findMemberByRole('mom')
    const res: any = await checkIn(publicAct.id, child2.id, mom.id)
    expect(res.log.status).toBe('pending_verification')
    expect(res.log.memberId).toBe(child2.id)
    expect(res.log.operatorId).toBe(mom.id)
  })

  test('家长默认看第一个孩子的任务', async () => {
    const members = await getMembers()
    const children = members.filter((m) => m.role === 'child')
    expect(children.length).toBeGreaterThanOrEqual(1)

    // 第一个孩子应有今日活动
    const acts = await getTodayActivities(children[0].id)
    expect(acts.length).toBeGreaterThan(0)
  })
})

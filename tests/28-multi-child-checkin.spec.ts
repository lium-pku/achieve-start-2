import { test, expect } from '@playwright/test'
import {
  login,
  resetAndSeed,
  findMemberByRole,
  getMembers,
  createMember,
  getTodayActivities,
  checkIn,
  getPending,
  setMemberPoints,
  switchRole,
} from './helpers'

test.beforeAll(async () => {
  await login('test-mom')
  await resetAndSeed()
})

test.describe('流程 29：多孩代打卡切换', () => {
  test('家长切换孩子后，代打卡作用于选中的孩子', async () => {
    const mom = await findMemberByRole('mom')
    const child1 = await findMemberByRole('child')

    // 创建第二个孩子
    const child2: any = await createMember({
      name: '小苒',
      role: 'child',
      avatar: '👧',
      color: '#FF9A3C',
    })

    // 查 child1 的今日活动
    const acts1 = await getTodayActivities(child1.id)
    expect(acts1.length).toBeGreaterThan(0)

    // 查 child2 的今日活动（应有公共活动）
    const acts2 = await getTodayActivities(child2.id)
    expect(acts2.length).toBeGreaterThan(0)

    // 家长给 child1 代打卡一个活动
    const act1 = acts1[0]
    const res1: any = await checkIn(act1.id, child1.id, mom.id)
    expect(res1.log.memberId).toBe(child1.id)
    expect(res1.log.operatorId).toBe(mom.id)

    // 家长给 child2 代打卡一个活动（公共活动或 child2 独有的）
    const act2 = acts2.find((a) => !acts1.find((a1) => a1.id === a.id)) || acts2[0]
    const res2: any = await checkIn(act2.id, child2.id, mom.id)
    expect(res2.log.memberId).toBe(child2.id)
    expect(res2.log.operatorId).toBe(mom.id)

    // 确认两个孩子的打卡记录是独立的
    expect(res1.log.memberId).not.toBe(res2.log.memberId)
  })

  test('家长给不同孩子打卡同一公共活动，各自独立', async () => {
    const mom = await findMemberByRole('mom')
    const child1 = await findMemberByRole('child')

    // 创建第二个孩子
    const child2: any = await createMember({
      name: '小红',
      role: 'child',
      avatar: '👧',
      color: '#FF9A3C',
    })

    // 找到公共活动（家庭阅读时间）
    const acts = await getTodayActivities(child1.id)
    const publicAct = acts.find((a) => a.title === '家庭阅读时间')
    if (!publicAct) {
      test.skip()
      return
    }

    // 给 child1 打卡
    const res1: any = await checkIn(publicAct.id, child1.id, mom.id)
    expect(res1.log.status).toBe('pending_verification')
    expect(res1.log.memberId).toBe(child1.id)

    // 给 child2 打卡同一活动
    const res2: any = await checkIn(publicAct.id, child2.id, mom.id)
    expect(res2.log.status).toBe('pending_verification')
    expect(res2.log.memberId).toBe(child2.id)

    // 两个打卡记录的 memberId 不同
    expect(res1.log.memberId).not.toBe(res2.log.memberId)
  })

  test('待审核列表包含多个孩子的打卡记录', async () => {
    // 单独 reset 避免数据污染
    const { resetAndSeed } = await import('./helpers')
    await resetAndSeed()

    const mom = await findMemberByRole('mom')
    const child1 = await findMemberByRole('child')

    // 创建第二个孩子
    const child2: any = await createMember({
      name: '小华',
      role: 'child',
      avatar: '👦',
      color: '#10B981',
    })

    // 给两个孩子分别打卡公共活动
    const acts1 = await getTodayActivities(child1.id)
    const publicAct = acts1.find((a) => a.title === '家庭阅读时间')
    if (!publicAct) {
      test.skip()
      return
    }

    await checkIn(publicAct.id, child1.id, mom.id)
    await checkIn(publicAct.id, child2.id, mom.id)

    // 查待审核列表
    const pending = await getPending()
    const child1Pending = pending.filter((p) => p.memberId === child1.id)
    const child2Pending = pending.filter((p) => p.memberId === child2.id)

    expect(child1Pending.length).toBeGreaterThan(0)
    expect(child2Pending.length).toBeGreaterThan(0)
  })

  test('家长切换到爸爸身份后同样可以代打卡', async () => {
    // 切换到爸爸
    await switchRole('test-dad')
    const dad = await findMemberByRole('dad')
    const child = await findMemberByRole('child')

    const acts = await getTodayActivities(child.id)
    if (acts.length === 0) {
      test.skip()
      return
    }

    // 找一个没打卡的
    const { getActivityLogs } = await import('./helpers')
    const logs = await getActivityLogs(child.id)
    const logged = new Set(logs.map((l) => l.activityId))
    const unlogged = acts.find((a) => !logged.has(a.id))
    if (!unlogged) {
      test.skip()
      return
    }

    const res: any = await checkIn(unlogged.id, child.id, dad.id)
    expect(res.log.operatorId).toBe(dad.id)
    expect(res.log.memberId).toBe(child.id)
    expect(res.message).toContain('代打卡')
  })
})

import { test, expect } from '@playwright/test'
import {
  login,
  resetAndSeed,
  findMemberByRole,
  getMembers,
  createActivity,
  getTodayActivities,
  checkIn,
  verify,
  getPending,
  createMember,
} from './helpers'

test.beforeAll(async () => {
  await login('test-mom')
  await resetAndSeed()
})

test.describe('流程 26：多孩功能', () => {
  test('公共活动对所有孩子可见', async () => {
    const child = await findMemberByRole('child')
    const todayActs = await getTodayActivities(child.id)
    // seed 里有"家庭阅读时间"是公共活动
    const publicAct = todayActs.find((a) => a.title === '家庭阅读时间')
    expect(publicAct).toBeTruthy()
  })

  test('创建分配给多个孩子的活动', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    // 新建一个孩子
    const child2: any = await createMember({
      name: '小红',
      role: 'child',
      avatar: '👧',
      color: '#FF9A3C',
    })

    // 创建分配给两个孩子的活动
    const created: any = await createActivity({
      title: '多孩测试活动',
      scheduleType: 'daily',
      scheduledTime: '16:00',
      deadline: '23:59',
      points: 5,
      createdById: mom.id,
      assignedToIds: [child.id, child2.id],
    })

    expect(created.id).toBeTruthy()
    expect(created.assignedToIds).toBe(`${child.id},${child2.id}`)

    // 两个孩子的今日活动都应包含这个
    const acts1 = await getTodayActivities(child.id)
    const acts2 = await getTodayActivities(child2.id)
    expect(acts1.find((a) => a.id === created.id)).toBeTruthy()
    expect(acts2.find((a) => a.id === created.id)).toBeTruthy()
  })

  test('创建公共活动（assignedToIds 为空）', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    const created: any = await createActivity({
      title: '公共测试活动',
      scheduleType: 'daily',
      scheduledTime: '18:00',
      deadline: '23:59',
      points: 3,
      createdById: mom.id,
      assignedToIds: [], // 空数组 = 公共活动
    })

    expect(created.assignedToIds).toBeNull()

    // 任何孩子都应看到
    const acts = await getTodayActivities(child.id)
    expect(acts.find((a) => a.id === created.id)).toBeTruthy()
  })

  test('公共活动每个孩子可独立打卡', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    // 创建第二个孩子
    const child2: any = await createMember({
      name: '小华',
      role: 'child',
      avatar: '👦',
      color: '#10B981',
    })

    // 创建公共活动
    const created: any = await createActivity({
      title: '全家打卡测试',
      scheduleType: 'daily',
      scheduledTime: '19:00',
      deadline: '23:59',
      points: 2,
      createdById: mom.id,
      assignedToIds: [],
    })

    // 两个孩子分别打卡
    const res1: any = await checkIn(created.id, child.id)
    const res2: any = await checkIn(created.id, child2.id)

    expect(res1.log.status).toBe('pending_verification')
    expect(res2.log.status).toBe('pending_verification')
    expect(res1.log.memberId).toBe(child.id)
    expect(res2.log.memberId).toBe(child2.id)

    // 待审核列表应有 2 条（同一活动，不同孩子）
    const pending = await getPending()
    const actPending = pending.filter((p) => p.activityId === created.id)
    expect(actPending.length).toBe(2)
  })

  test('非分配的孩子看不到活动', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    // 创建第二个孩子
    const child2: any = await createMember({
      name: '小乐',
      role: 'child',
      avatar: '👶',
      color: '#8B5CF6',
    })

    // 只分配给 child 的活动
    const created: any = await createActivity({
      title: '只给大孩子的活动',
      scheduleType: 'daily',
      scheduledTime: '15:00',
      deadline: '23:59',
      points: 4,
      createdById: mom.id,
      assignedToIds: [child.id],
    })

    // child 能看到
    const acts1 = await getTodayActivities(child.id)
    expect(acts1.find((a) => a.id === created.id)).toBeTruthy()

    // child2 看不到
    const acts2 = await getTodayActivities(child2.id)
    expect(acts2.find((a) => a.id === created.id)).toBeUndefined()
  })
})

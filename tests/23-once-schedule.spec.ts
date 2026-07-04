import { test, expect } from '@playwright/test'
import {
  login,
  resetAndSeed,
  findMemberByRole,
  createActivity,
  getTodayActivities,
  getMembers,
  api,
} from './helpers'

test.beforeAll(async () => {
  await login('test-mom')
  await resetAndSeed()
})

test.describe('流程 23：临时日程（once）+ 网格视图改进', () => {
  test('临时日程只在指定日期出现', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    // 创建明天的临时活动
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const created: any = await createActivity({
      title: '明天的一次性活动',
      scheduleType: 'once',
      specificDate: tomorrowStr,
      scheduledTime: '10:00',
      deadline: '12:00',
      points: 5,
      createdById: mom.id,
      assignedToId: child.id,
    })
    expect(created.id).toBeTruthy()
    expect(created.scheduleType).toBe('once')

    // 查今日活动，不应包含明天的
    const todayActs = await getTodayActivities(child.id)
    expect(todayActs.find((a) => a.id === created.id)).toBeUndefined()

    // 查明天的活动，应包含
    const tomorrowActs = await api<any[]>(
      `/api/activities?date=${tomorrowStr}&assignedToId=${child.id}`
    )
    expect(tomorrowActs.find((a) => a.id === created.id)).toBeTruthy()
  })

  test('今天的临时日程出现在今日待办', async () => {
    const child = await findMemberByRole('child')
    const todayActs = await getTodayActivities(child.id)
    // seed 里有"临时活动-看牙医"
    const onceAct = todayActs.find((a) => a.scheduleType === 'once')
    expect(onceAct).toBeTruthy()
    expect(onceAct!.title).toContain('看牙医')
  })

  test('临时日程缺少 specificDate 应失败', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    await expect(
      createActivity({
        title: '无日期临时活动',
        scheduleType: 'once',
        createdById: mom.id,
        assignedToId: child.id,
      } as any)
    ).rejects.toThrow(/specificDate|日期/)
  })

  test('date 参数查询指定天的活动', async () => {
    const child = await findMemberByRole('child')

    // 查今天的
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const todayActs = await api<any[]>(
      `/api/activities?date=${todayStr}&assignedToId=${child.id}`
    )
    expect(todayActs.length).toBeGreaterThan(0)

    // 查一周前的（应该没有 daily 之外的活动，daily 会一直有）
    const lastWeek = new Date()
    lastWeek.setDate(lastWeek.getDate() - 7)
    const lastWeekStr = lastWeek.toISOString().split('T')[0]
    const lastWeekActs = await api<any[]>(
      `/api/activities?date=${lastWeekStr}&assignedToId=${child.id}`
    )
    // 日度活动会在，但今天的 once 不会在
    expect(lastWeekActs.find((a) => a.scheduleType === 'once' && a.title.includes('看牙医'))).toBeUndefined()
  })

  test('网格视图显示选中天所有类型活动', async () => {
    const child = await findMemberByRole('child')
    const todayActs = await getTodayActivities(child.id)

    // 应该包含 daily / weekly / once 多种类型
    const types = new Set(todayActs.map((a) => a.scheduleType))
    expect(types.has('daily')).toBe(true)
    // weekly 或 once 至少有一个（取决于今天星期几）
    expect(types.size).toBeGreaterThanOrEqual(2)
  })

  test('截止时间在所有周期类型都可设置', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    // 创建带 deadline 的 daily 活动
    const daily: any = await createActivity({
      title: '带截止时间的日度活动',
      scheduleType: 'daily',
      scheduledTime: '09:00',
      deadline: '21:00',
      points: 3,
      createdById: mom.id,
      assignedToId: child.id,
    })
    expect(daily.deadline).toBe('21:00')

    // 创建带 deadline 的 once 活动
    const today = new Date().toISOString().split('T')[0]
    const once: any = await createActivity({
      title: '带截止时间的临时活动',
      scheduleType: 'once',
      specificDate: today,
      scheduledTime: '15:00',
      deadline: '18:00',
      points: 4,
      createdById: mom.id,
      assignedToId: child.id,
    })
    expect(once.deadline).toBe('18:00')
  })
})

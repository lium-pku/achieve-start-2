import { test, expect } from '@playwright/test'
import {
  findMemberByRole,
  createActivity,
  getTodayActivities,
  resetAndSeed,
} from './helpers'

test.beforeEach(async () => {
  await resetAndSeed()
})

test.describe('流程 18：周期活动今日是否出现', () => {
  test('日度活动今日应出现', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    // 创建一个日度活动
    const created: any = await createActivity({
      title: '日度测试活动',
      scheduleType: 'daily',
      scheduledTime: '10:00',
      deadline: '23:59',
      points: 3,
      onTimeBonus: 1,
      createdById: mom.id,
      assignedToId: child.id,
    })

    // 查今日活动，应该包含这个
    const today = await getTodayActivities(child.id)
    expect(today.find((a) => a.id === created.id)).toBeTruthy()
  })

  test('周度活动在对应星期几才出现', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    const today = new Date()
    const todayDow = today.getDay() === 0 ? 7 : today.getDay() // 周一=1...周日=7
    const otherDow = todayDow === 1 ? 2 : 1 // 找一个不一样的星期

    // 创建"今天"的周度活动
    const todayActivity: any = await createActivity({
      title: '今天周度活动',
      scheduleType: 'weekly',
      dayOfWeek: todayDow,
      scheduledTime: '10:00',
      deadline: '23:59',
      points: 3,
      createdById: mom.id,
      assignedToId: child.id,
    })

    // 创建"非今天"的周度活动
    const otherActivity: any = await createActivity({
      title: '非今天周度活动',
      scheduleType: 'weekly',
      dayOfWeek: otherDow,
      scheduledTime: '10:00',
      deadline: '23:59',
      points: 3,
      createdById: mom.id,
      assignedToId: child.id,
    })

    const todayList = await getTodayActivities(child.id)
    expect(todayList.find((a) => a.id === todayActivity.id)).toBeTruthy()
    expect(todayList.find((a) => a.id === otherActivity.id)).toBeUndefined()
  })

  test('月度活动在对应日期才出现', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    const today = new Date()
    const todayDate = today.getDate()
    const otherDate = todayDate === 1 ? 2 : 1

    const todayActivity: any = await createActivity({
      title: '今天月度活动',
      scheduleType: 'monthly',
      dayOfMonth: todayDate,
      scheduledTime: '10:00',
      deadline: '23:59',
      points: 5,
      createdById: mom.id,
      assignedToId: child.id,
    })

    const otherActivity: any = await createActivity({
      title: '非今天月度活动',
      scheduleType: 'monthly',
      dayOfMonth: otherDate,
      scheduledTime: '10:00',
      deadline: '23:59',
      points: 5,
      createdById: mom.id,
      assignedToId: child.id,
    })

    const todayList = await getTodayActivities(child.id)
    expect(todayList.find((a) => a.id === todayActivity.id)).toBeTruthy()
    expect(todayList.find((a) => a.id === otherActivity.id)).toBeUndefined()
  })

  test('固定 seed 的 3 个日度活动今日都应出现', async () => {
    const child = await findMemberByRole('child')
    const today = await getTodayActivities(child.id)
    const daily = today.filter((a) => a.scheduleType === 'daily')
    expect(daily.length).toBe(3)
  })
})

import { test, expect } from '@playwright/test'
import {
  login,
  resetAndSeed,
  findMemberByRole,
  createActivity,
  getTodayActivities,
  api,
} from './helpers'

test.beforeAll(async () => {
  await login('test-mom')
  await resetAndSeed()
})

test.describe('流程 28：截止日期（endDate）', () => {
  test('创建带 endDate 的活动，endDate 持久化', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    const created: any = await createActivity({
      title: '带截止日期的活动',
      scheduleType: 'daily',
      scheduledTime: '10:00',
      deadline: '23:59',
      endDate: '2026-12-31',
      points: 3,
      createdById: mom.id,
      assignedToIds: [child.id],
    })

    expect(created.endDate).toBeTruthy()
    expect(new Date(created.endDate).getFullYear()).toBe(2026)
    expect(new Date(created.endDate).getMonth()).toBe(11) // 12 月
    expect(new Date(created.endDate).getDate()).toBe(31)
  })

  test('未到 endDate 的活动正常出现', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    // endDate 设为未来
    const created: any = await createActivity({
      title: '未到截止日期',
      scheduleType: 'daily',
      scheduledTime: '11:00',
      deadline: '23:59',
      endDate: '2099-12-31',
      points: 2,
      createdById: mom.id,
      assignedToIds: [child.id],
    })

    // 今天应该能看到
    const todayActs = await getTodayActivities(child.id)
    expect(todayActs.find((a) => a.id === created.id)).toBeTruthy()
  })

  test('超过 endDate 的活动不再出现', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    // endDate 设为过去
    const created: any = await createActivity({
      title: '已过期活动',
      scheduleType: 'daily',
      scheduledTime: '12:00',
      deadline: '23:59',
      endDate: '2020-01-01',
      points: 2,
      createdById: mom.id,
      assignedToIds: [child.id],
    })

    // 今天不应该看到
    const todayActs = await getTodayActivities(child.id)
    expect(todayActs.find((a) => a.id === created.id)).toBeUndefined()
  })

  test('不设 endDate 的活动永久出现', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    const created: any = await createActivity({
      title: '无截止日期',
      scheduleType: 'daily',
      scheduledTime: '13:00',
      deadline: '23:59',
      points: 2,
      createdById: mom.id,
      assignedToIds: [child.id],
    })

    expect(created.endDate).toBeNull()

    const todayActs = await getTodayActivities(child.id)
    expect(todayActs.find((a) => a.id === created.id)).toBeTruthy()
  })

  test('编辑活动可清空 endDate', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    // 创建带 endDate 的
    const created: any = await createActivity({
      title: '清空截止日期测试',
      scheduleType: 'daily',
      scheduledTime: '14:00',
      deadline: '23:59',
      endDate: '2026-06-01',
      points: 2,
      createdById: mom.id,
      assignedToIds: [child.id],
    })
    expect(created.endDate).toBeTruthy()

    // 清空 endDate
    const updated: any = await api(`/api/activities/${created.id}`, {
      method: 'PATCH',
      body: { endDate: null },
    })
    expect(updated.endDate).toBeNull()
  })
})

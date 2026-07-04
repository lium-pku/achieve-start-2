import { test, expect } from '@playwright/test'
import {
  findMemberByRole,
  createActivity,
  updateActivity,
  deleteActivity,
  getTodayActivities,
  resetAll,
  api,
} from './helpers'

test.beforeAll(async () => {
  await resetAll()
})

test.describe('流程 6：活动 CRUD', () => {
  test('新建活动 → 编辑 → 删除', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    // 1. 新建日度活动
    const created: any = await createActivity({
      title: '测试活动-唱首歌',
      scheduleType: 'daily',
      scheduledTime: '15:00',
      deadline: '16:00',
      points: 5,
      onTimeBonus: 2,
      createdById: mom.id,
      assignedToId: child.id,
    })
    expect(created.id).toBeTruthy()
    expect(created.title).toBe('测试活动-唱首歌')
    expect(created.points).toBe(5)
    expect(created.onTimeBonus).toBe(2)

    // 2. 确认能查到（今日活动列表）
    const todayActs = await getTodayActivities(child.id)
    const found = todayActs.find((a) => a.id === created.id)
    expect(found).toBeTruthy()
    expect(found.title).toBe('测试活动-唱首歌')

    // 3. 编辑活动（改标题和积分）
    const updated: any = await updateActivity(created.id, {
      title: '测试活动-唱首歌-改',
      points: 8,
    })
    expect(updated.title).toBe('测试活动-唱首歌-改')
    expect(updated.points).toBe(8)

    // 4. 删除活动（软删除：active=false）
    await deleteActivity(created.id)

    // 5. 确认今日活动列表里没有了
    const todayActsAfter = await getTodayActivities(child.id)
    expect(todayActsAfter.find((a) => a.id === created.id)).toBeUndefined()
  })

  test('周度活动需指定 dayOfWeek', async () => {
    const mom = await findMemberByRole('mom')
    await expect(
      createActivity({
        title: '无星期周度活动',
        scheduleType: 'weekly',
        createdById: mom.id,
      })
    ).rejects.toThrow(/dayOfWeek/)
  })

  test('月度活动需指定 dayOfMonth', async () => {
    const mom = await findMemberByRole('mom')
    await expect(
      createActivity({
        title: '无日期月度活动',
        scheduleType: 'monthly',
        createdById: mom.id,
      })
    ).rejects.toThrow(/dayOfMonth/)
  })

  test('非法 scheduleType 应被拒绝', async () => {
    const mom = await findMemberByRole('mom')
    await expect(
      createActivity({
        title: '非法周期',
        scheduleType: 'hourly' as any,
        createdById: mom.id,
      })
    ).rejects.toThrow(/scheduleType/)
  })
})

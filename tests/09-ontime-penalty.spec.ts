import { test, expect } from '@playwright/test'
import {
  findMemberByRole,
  getTodayActivities,
  checkIn,
  verify,
  setMemberPoints,
  getMembers,
  resetAll,
  createActivity,
} from './helpers'

test.beforeAll(async () => {
  await resetAll()
})

test.describe('流程 9：按时奖励逻辑 + 积分扣到 0 保护', () => {
  test('打卡时 onTime 字段正确计算', async () => {
    const child = await findMemberByRole('child')
    const mom = await findMemberByRole('mom')

    // 创建一个截止时间是"很远以后"的活动（确保按时）
    const futureActivity: any = await createActivity({
      title: '未来活动-按时测试',
      scheduleType: 'daily',
      scheduledTime: '23:30',
      deadline: '23:59',
      points: 10,
      onTimeBonus: 5,
      createdById: mom.id,
      assignedToId: child.id,
    })

    // 打卡（应该在截止时间前，onTime=true）
    const res: any = await checkIn(futureActivity.id, child.id)
    expect(res.onTime).toBe(true)
    expect(res.pointsAwarded).toBe(10)
    expect(res.bonusAwarded).toBe(5) // 按时奖励

    // 审核通过
    const { getPending } = await import('./helpers')
    const pending = await getPending()
    const log = pending.find((p) => p.activityId === futureActivity.id)
    await verify([log.id], 'approve', mom.id)

    // 确认积分 = 10 + 5 = 15
    const members = await getMembers()
    const childAfter = members.find((m) => m.id === child.id)!
    expect(childAfter.totalPoints).toBe(15)
  })

  test('超时打卡只有基础积分，无按时奖励', async () => {
    const child = await findMemberByRole('child')
    const mom = await findMemberByRole('mom')
    await setMemberPoints(child.id, 0)

    // 创建一个截止时间是"过去"的活动（确保超时）
    // deadline 用很早的时间
    const pastActivity: any = await createActivity({
      title: '过去活动-超时测试',
      scheduleType: 'daily',
      scheduledTime: '00:01',
      deadline: '00:02',
      points: 8,
      onTimeBonus: 4,
      createdById: mom.id,
      assignedToId: child.id,
    })

    // 打卡（已超时，onTime=false）
    const res: any = await checkIn(pastActivity.id, child.id)
    expect(res.onTime).toBe(false)
    expect(res.pointsAwarded).toBe(8)
    expect(res.bonusAwarded).toBe(0) // 没有按时奖励

    // 审核通过
    const { getPending } = await import('./helpers')
    const pending = await getPending()
    const log = pending.find((p) => p.activityId === pastActivity.id)
    await verify([log.id], 'approve', mom.id)

    // 确认积分只有 8（无按时奖励）
    const members = await getMembers()
    const childAfter = members.find((m) => m.id === child.id)!
    expect(childAfter.totalPoints).toBe(8)
  })

  test('扣分不会让积分变为负数', async () => {
    const child = await findMemberByRole('child')

    // 设置积分为 3
    await setMemberPoints(child.id, 3)

    // 触发扣分检查（如果有超时未打卡活动，会扣分）
    const { checkPenalty } = await import('./helpers')
    await checkPenalty(child.id)

    // 积分应该 >= 0
    const members = await getMembers()
    const childAfter = members.find((m) => m.id === child.id)!
    expect(childAfter.totalPoints).toBeGreaterThanOrEqual(0)
  })

  test('积分扣到 0 为止（不会扣成负数）', async () => {
    const child = await findMemberByRole('child')
    const mom = await findMemberByRole('mom')

    // 设置积分为 1（很少）
    await setMemberPoints(child.id, 1)

    // 创建一个超时活动，积分 100（远大于现有积分）
    const pastActivity: any = await createActivity({
      title: '大积分超时活动',
      scheduleType: 'daily',
      scheduledTime: '00:01',
      deadline: '00:02',
      points: 100,
      onTimeBonus: 0,
      createdById: mom.id,
      assignedToId: child.id,
    })

    // 触发扣分检查
    const { checkPenalty } = await import('./helpers')
    await checkPenalty(child.id)

    // 积分应该被扣到 0，不会变 -99
    const members = await getMembers()
    const childAfter = members.find((m) => m.id === child.id)!
    expect(childAfter.totalPoints).toBe(0)
  })
})

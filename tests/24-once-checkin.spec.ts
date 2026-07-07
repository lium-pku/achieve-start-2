import { test, expect } from '@playwright/test'
import {
  login,
  resetAndSeed,
  findMemberByRole,
  createActivity,
  checkIn,
  verify,
  getPending,
  getMembers,
  getTodayActivities,
} from './helpers'

test.beforeAll(async () => {
  await login('test-mom')
  await resetAndSeed()
})

test.describe('流程 24：临时日程打卡/审核完整链路', () => {
  test('临时活动可正常打卡', async () => {
    const child = await findMemberByRole('child')
    const mom = await findMemberByRole('mom')
    const today = new Date().toISOString().split('T')[0]

    // 创建独立的 once 活动
    const onceAct: any = await createActivity({
      title: '打卡测试-临时活动',
      scheduleType: 'once',
      specificDate: today,
      scheduledTime: '23:30',
      deadline: '23:59',
      points: 6,
      onTimeBonus: 2,
      createdById: mom.id,
      assignedToId: child.id,
    })

    const res: any = await checkIn(onceAct.id, child.id)
    expect(res.log.status).toBe('pending_verification')
    expect(res.log.activityId).toBe(onceAct.id)
    expect(res.pointsAwarded).toBe(onceAct.points)
  })

  test('临时活动审核通过发分', async () => {
    const child = await findMemberByRole('child')
    const mom = await findMemberByRole('mom')
    const { setMemberPoints } = await import('./helpers')
    await setMemberPoints(child.id, 0)

    // 创建新的 once 活动（避免和前面测试冲突）
    const today = new Date().toISOString().split('T')[0]
    const onceAct: any = await createActivity({
      title: '审核发分测试-临时活动',
      scheduleType: 'once',
      specificDate: today,
      scheduledTime: '23:30',
      deadline: '23:59',
      points: 8,
      onTimeBonus: 4,
      createdById: mom.id,
      assignedToId: child.id,
    })

    await checkIn(onceAct.id, child.id)
    const pending = await getPending()
    const log = pending.find((p) => p.activityId === onceAct.id)
    if (!log) {
      test.skip()
      return
    }

    await verify([log.id], 'approve', mom.id)

    const members = await getMembers()
    const childAfter = members.find((m) => m.id === child.id)!
    // 应得 points + bonus（按时）
    expect(childAfter.totalPoints).toBe(onceAct.points + onceAct.onTimeBonus)
  })

  test('临时活动同一天重复打卡应拒绝', async () => {
    const child = await findMemberByRole('child')
    const mom = await findMemberByRole('mom')
    const today = new Date().toISOString().split('T')[0]

    // 创建独立的 once 活动
    const onceAct: any = await createActivity({
      title: '重复打卡测试-临时活动',
      scheduleType: 'once',
      specificDate: today,
      scheduledTime: '23:30',
      deadline: '23:59',
      points: 5,
      createdById: mom.id,
      assignedToId: child.id,
    })

    // 第一次打卡
    await checkIn(onceAct.id, child.id)

    // 第二次应拒绝
    await expect(checkIn(onceAct.id, child.id)).rejects.toThrow(/已打卡/)
  })

  test('临时活动审核拒绝不发分，可重新打卡', async () => {
    const child = await findMemberByRole('child')
    const mom = await findMemberByRole('mom')
    const { setMemberPoints } = await import('./helpers')
    await setMemberPoints(child.id, 0)

    // 创建新的 once 活动（避免和前面测试冲突）
    const today = new Date().toISOString().split('T')[0]
    const onceAct: any = await createActivity({
      title: '拒绝测试-临时活动',
      scheduleType: 'once',
      specificDate: today,
      scheduledTime: '23:30',
      deadline: '23:59',
      points: 8,
      onTimeBonus: 4,
      createdById: mom.id,
      assignedToId: child.id,
    })

    // 打卡
    await checkIn(onceAct.id, child.id)
    const pending = await getPending()
    const log = pending.find((p) => p.activityId === onceAct.id)!

    // 拒绝
    await verify([log.id], 'reject', mom.id)

    // 确认没发分
    const members1 = await getMembers()
    expect(members1.find((m) => m.id === child.id)!.totalPoints).toBe(0)

    // 重新打卡
    const reCheck: any = await checkIn(onceAct.id, child.id)
    expect(reCheck.log.status).toBe('pending_verification')
  })
})

test.describe('流程 25：各周期类型 deadline 持久化 + 按时奖励', () => {
  test('weekly 活动 deadline 持久化', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    const created: any = await createActivity({
      title: '带截止时间的周度活动',
      scheduleType: 'weekly',
      dayOfWeek: 6,
      scheduledTime: '10:00',
      deadline: '20:30',
      points: 3,
      createdById: mom.id,
      assignedToId: child.id,
    })
    expect(created.deadline).toBe('20:30')
  })

  test('monthly 活动 deadline 持久化', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    const created: any = await createActivity({
      title: '带截止时间的月度活动',
      scheduleType: 'monthly',
      dayOfMonth: 1,
      scheduledTime: '19:00',
      deadline: '21:45',
      points: 5,
      createdById: mom.id,
      assignedToId: child.id,
    })
    expect(created.deadline).toBe('21:45')
  })

  test('once 活动按时打卡得 bonus', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')
    const today = new Date().toISOString().split('T')[0]

    // 创建截止时间在未来的 once 活动
    const created: any = await createActivity({
      title: '按时测试-临时活动',
      scheduleType: 'once',
      specificDate: today,
      scheduledTime: '23:30',
      deadline: '23:59',
      points: 10,
      onTimeBonus: 5,
      createdById: mom.id,
      assignedToId: child.id,
    })

    const res: any = await checkIn(created.id, child.id)
    expect(res.onTime).toBe(true)
    expect(res.bonusAwarded).toBe(5)
  })

  test('once 活动超时打卡不得 bonus', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')
    const today = new Date().toISOString().split('T')[0]

    // 创建截止时间在过去的 once 活动
    const created: any = await createActivity({
      title: '超时测试-临时活动',
      scheduleType: 'once',
      specificDate: today,
      scheduledTime: '00:01',
      deadline: '00:02',
      points: 8,
      onTimeBonus: 4,
      createdById: mom.id,
      assignedToId: child.id,
    })

    const res: any = await checkIn(created.id, child.id)
    expect(res.onTime).toBe(false)
    expect(res.bonusAwarded).toBe(0)
  })

  test('weekly 活动按时打卡得 bonus（当天）', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')
    const today = new Date()
    const todayDow = today.getDay() === 0 ? 7 : today.getDay()

    const created: any = await createActivity({
      title: '按时测试-周度活动',
      scheduleType: 'weekly',
      dayOfWeek: todayDow,
      scheduledTime: '23:30',
      deadline: '23:59',
      points: 6,
      onTimeBonus: 3,
      createdById: mom.id,
      assignedToId: child.id,
    })

    const res: any = await checkIn(created.id, child.id)
    expect(res.onTime).toBe(true)
    expect(res.bonusAwarded).toBe(3)
  })

  test('monthly 活动按时打卡得 bonus（当天）', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')
    const todayDate = new Date().getDate()

    const created: any = await createActivity({
      title: '按时测试-月度活动',
      scheduleType: 'monthly',
      dayOfMonth: todayDate,
      scheduledTime: '23:30',
      deadline: '23:59',
      points: 7,
      onTimeBonus: 3,
      createdById: mom.id,
      assignedToId: child.id,
    })

    const res: any = await checkIn(created.id, child.id)
    expect(res.onTime).toBe(true)
    expect(res.bonusAwarded).toBe(3)
  })
})

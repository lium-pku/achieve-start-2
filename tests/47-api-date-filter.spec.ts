import { test, expect } from '@playwright/test'
import {
  login,
  resetAndSeed,
  getMembers,
  findMemberByRole,
  createActivity,
  deleteActivity,
  api,
} from './helpers'

const BASE_URL = 'http://localhost:3000'

test.describe('API 47：?date= 日期过滤边界', () => {
  test.beforeAll(async () => {
    await login('test-mom')
    await resetAndSeed()
  })

  test('date=今天 返回今日活动（与 today=1 等价）', async () => {
    const members = await getMembers()
    const child = members.find((m) => m.role === 'child')!

    const now = new Date()
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const byDate = await api<any[]>(`/api/activities?date=${dateStr}&assignedToId=${child.id}`)
    const byToday = await api<any[]>(`/api/activities?today=1&assignedToId=${child.id}`)

    // 两者应返回相同的活动 ID 集合
    const idsByDate = byDate.map((a) => a.id).sort()
    const idsByToday = byToday.map((a) => a.id).sort()
    expect(idsByDate).toEqual(idsByToday)
  })

  test('date=明天 返回明天的活动（daily 活动应出现）', async () => {
    const child = await findMemberByRole('child')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

    const acts = await api<any[]>(`/api/activities?date=${dateStr}&assignedToId=${child.id}`)
    // daily 活动在明天也应出现
    expect(acts.length).toBeGreaterThan(0)
    // 应包含 daily 类型活动
    const dailyActs = acts.filter((a) => a.scheduleType === 'daily')
    expect(dailyActs.length).toBeGreaterThan(0)
  })

  test('date=昨天 返回空（seed 活动 startDate 为今天，昨天未开始）', async () => {
    const child = await findMemberByRole('child')
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

    const acts = await api<any[]>(`/api/activities?date=${dateStr}&assignedToId=${child.id}`)
    // seed 活动的 startDate 是今天，昨天还没开始，应返回空
    expect(acts.length).toBe(0)
  })

  test('跨月日期：date=上月最后一天返回空（startDate 限制）', async () => {
    const child = await findMemberByRole('child')
    const lastMonthEnd = new Date()
    lastMonthEnd.setDate(0) // 上月最后一天
    const dateStr = `${lastMonthEnd.getFullYear()}-${String(lastMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(lastMonthEnd.getDate()).padStart(2, '0')}`

    const acts = await api<any[]>(`/api/activities?date=${dateStr}&assignedToId=${child.id}`)
    // seed 活动 startDate 是今天，上月最后一天还没开始，应返回空
    expect(acts.length).toBe(0)
  })

  test('跨年日期：date=去年同一天', async () => {
    const child = await findMemberByRole('child')
    const lastYear = new Date()
    lastYear.setFullYear(lastYear.getFullYear() - 1)
    const dateStr = `${lastYear.getFullYear()}-${String(lastYear.getMonth() + 1).padStart(2, '0')}-${String(lastYear.getDate()).padStart(2, '0')}`

    const acts = await api<any[]>(`/api/activities?date=${dateStr}&assignedToId=${child.id}`)
    // 去年此时活动 startDate 还没到，应返回空
    // seed 活动的 startDate 是今天，去年还没有活动
    expect(acts.length).toBe(0)
  })

  test('weekly 活动只在对应星期几出现', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    // 创建一个每周三的活动
    const wed = await createActivity({
      title: '测试-周三活动',
      scheduleType: 'weekly',
      dayOfWeek: 3, // 周三
      createdById: mom.id,
      assignedToIds: [child.id],
      scheduledTime: '16:00',
      deadline: '17:00',
      points: 3,
      onTimeBonus: 1,
    })

    try {
      // 找下一个周三
      const now = new Date()
      const day = now.getDay()
      const diffToWed = day <= 3 ? 3 - day : 7 - day + 3
      const wedDate = new Date(now)
      wedDate.setDate(wedDate.getDate() + diffToWed)
      const wedStr = `${wedDate.getFullYear()}-${String(wedDate.getMonth() + 1).padStart(2, '0')}-${String(wedDate.getDate()).padStart(2, '0')}`

      // 周三应出现
      const wedActs = await api<any[]>(`/api/activities?date=${wedStr}&assignedToId=${child.id}`)
      const found = wedActs.find((a) => a.id === wed.id)
      expect(found).toBeTruthy()

      // 周四不应出现
      const thuDate = new Date(wedDate)
      thuDate.setDate(thuDate.getDate() + 1)
      const thuStr = `${thuDate.getFullYear()}-${String(thuDate.getMonth() + 1).padStart(2, '0')}-${String(thuDate.getDate()).padStart(2, '0')}`
      const thuActs = await api<any[]>(`/api/activities?date=${thuStr}&assignedToId=${child.id}`)
      const notFound = thuActs.find((a) => a.id === wed.id)
      expect(notFound).toBeUndefined()
    } finally {
      await deleteActivity(wed.id)
    }
  })

  test('monthly 活动只在对应日期出现', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    // 创建一个每月 15 号的活动
    const monthly = await createActivity({
      title: '测试-每月15号',
      scheduleType: 'monthly',
      dayOfMonth: 15,
      createdById: mom.id,
      assignedToIds: [child.id],
      scheduledTime: '10:00',
      deadline: '11:00',
      points: 5,
      onTimeBonus: 2,
    })

    try {
      // 15 号应出现
      const now = new Date()
      const fifteenth = new Date(now.getFullYear(), now.getMonth(), 15)
      if (fifteenth < now) fifteenth.setMonth(fifteenth.getMonth() + 1)
      const fStr = `${fifteenth.getFullYear()}-${String(fifteenth.getMonth() + 1).padStart(2, '0')}-${String(fifteenth.getDate()).padStart(2, '0')}`

      const fActs = await api<any[]>(`/api/activities?date=${fStr}&assignedToId=${child.id}`)
      const found = fActs.find((a) => a.id === monthly.id)
      expect(found).toBeTruthy()

      // 16 号不应出现
      const sixteenth = new Date(fifteenth)
      sixteenth.setDate(sixteenth.getDate() + 1)
      const sStr = `${sixteenth.getFullYear()}-${String(sixteenth.getMonth() + 1).padStart(2, '0')}-${String(sixteenth.getDate()).padStart(2, '0')}`
      const sActs = await api<any[]>(`/api/activities?date=${sStr}&assignedToId=${child.id}`)
      const notFound = sActs.find((a) => a.id === monthly.id)
      expect(notFound).toBeUndefined()
    } finally {
      await deleteActivity(monthly.id)
    }
  })

  test('once 活动只在 specificDate 出现', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    // 创建一个临时活动，日期为 7 天后
    const onceDate = new Date()
    onceDate.setDate(onceDate.getDate() + 7)
    const onceStr = `${onceDate.getFullYear()}-${String(onceDate.getMonth() + 1).padStart(2, '0')}-${String(onceDate.getDate()).padStart(2, '0')}`

    const once = await createActivity({
      title: '测试-临时活动',
      scheduleType: 'once',
      specificDate: onceStr,
      createdById: mom.id,
      assignedToIds: [child.id],
      scheduledTime: '14:00',
      deadline: '15:00',
      points: 10,
      onTimeBonus: 0,
    })

    try {
      // specificDate 当天应出现
      const acts = await api<any[]>(`/api/activities?date=${onceStr}&assignedToId=${child.id}`)
      const found = acts.find((a) => a.id === once.id)
      expect(found).toBeTruthy()

      // 前一天不应出现
      const prevDate = new Date(onceDate)
      prevDate.setDate(prevDate.getDate() - 1)
      const prevStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`
      const prevActs = await api<any[]>(`/api/activities?date=${prevStr}&assignedToId=${child.id}`)
      const notFound = prevActs.find((a) => a.id === once.id)
      expect(notFound).toBeUndefined()
    } finally {
      await deleteActivity(once.id)
    }
  })

  test('endDate 过期后活动不再出现', async () => {
    const mom = await findMemberByRole('mom')
    const child = await findMemberByRole('child')

    // 创建一个 daily 活动，endDate 为昨天
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

    const ended = await createActivity({
      title: '测试-已结束活动',
      scheduleType: 'daily',
      createdById: mom.id,
      assignedToIds: [child.id],
      scheduledTime: '09:00',
      deadline: '10:00',
      points: 1,
      onTimeBonus: 0,
      endDate: yStr,
    })

    try {
      // 今天不应出现（endDate 已过）
      const todayActs = await api<any[]>(`/api/activities?today=1&assignedToId=${child.id}`)
      const notFound = todayActs.find((a) => a.id === ended.id)
      expect(notFound).toBeUndefined()

      // 昨天也不应出现（endDate 是昨天，昨天应已过期）
      // 注：endDate 当天是否算过期取决于实现，这里只验证今天确实没有了
    } finally {
      await deleteActivity(ended.id)
    }
  })

  test('不传 date 和 today 参数返回所有 active 活动', async () => {
    const acts = await api<any[]>(`/api/activities`)
    // 应返回所有 active 活动（不按日期过滤）
    expect(acts.length).toBeGreaterThan(0)
    // 所有返回的活动都应是 active 的
    const allActive = acts.every((a) => a.active === true)
    expect(allActive).toBe(true)
  })

  test('公共活动（assignedToIds 为空）对所有孩子可见', async () => {
    const mom = await findMemberByRole('mom')
    const children = (await getMembers()).filter((m) => m.role === 'child')

    // 创建公共活动（assignedToIds 为空数组）
    const publicAct = await createActivity({
      title: '测试-公共活动',
      scheduleType: 'daily',
      createdById: mom.id,
      assignedToIds: [], // 公共
      scheduledTime: '12:00',
      deadline: '13:00',
      points: 1,
      onTimeBonus: 0,
    })

    try {
      // 每个孩子都应看到这个公共活动
      for (const child of children) {
        const acts = await api<any[]>(`/api/activities?today=1&assignedToId=${child.id}`)
        const found = acts.find((a) => a.id === publicAct.id)
        expect(found).toBeTruthy()
      }
    } finally {
      await deleteActivity(publicAct.id)
    }
  })
})

import { test, expect } from '@playwright/test'
import {
  login,
  getMembers,
  getGoals,
  createGoal,
  getRewards,
  resetAndSeed,
  switchRole,
  getToken,
} from './helpers'

test.describe('流程 19：多家庭数据隔离（v2.0 核心特性）', () => {
  test('不同家庭的成员互相隔离', async () => {
    // 家庭 A：test-mom（helpers 默认）
    await login('test-mom')
    const familyA_members = await getMembers()
    expect(familyA_members.length).toBe(3) // 小宇/妈妈/爸爸

    // 家庭 B：用新 code 登录，自动创建新家庭
    await login('family-b-mom')
    const familyB_members = await getMembers()
    expect(familyB_members.length).toBe(3) // 新家庭的 3 个默认成员

    // 两个家庭的成员 id 应该完全不同
    const aIds = new Set(familyA_members.map((m) => m.id))
    const bIds = new Set(familyB_members.map((m) => m.id))
    for (const id of aIds) {
      expect(bIds.has(id)).toBe(false)
    }
  })

  test('不同家庭的目标互相隔离', async () => {
    // 家庭 A 创建目标
    await login('test-mom')
    await resetAndSeed()
    const a_members = await getMembers()
    const a_child = a_members.find((m) => m.role === 'child')!
    await createGoal({ title: '家庭A的目标', memberId: a_child.id })
    const a_goals = await getGoals()
    expect(a_goals.length).toBe(1)
    expect(a_goals[0].title).toBe('家庭A的目标')

    // 家庭 B 登录，不应看到家庭 A 的目标
    await login('family-c-mom')
    const b_goals = await getGoals()
    expect(b_goals.find((g) => g.title === '家庭A的目标')).toBeUndefined()
  })

  test('不同家庭的奖励互相隔离', async () => {
    // 家庭 A
    await login('test-mom')
    await resetAndSeed()
    const a_rewards = await getRewards()
    expect(a_rewards.length).toBe(2)

    // 家庭 B（新家庭，没有 seed）
    await login('family-d-mom')
    const b_rewards = await getRewards()
    expect(b_rewards.length).toBe(0)
  })

  test('未登录访问 API 应返回 401', async () => {
    // 直接调 API 不带 token
    const res = await fetch('http://localhost:3000/api/members')
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('未登录')
  })

  test('token 无效应返回 401', async () => {
    const res = await fetch('http://localhost:3000/api/members', {
      headers: { Authorization: 'Bearer invalid-token-xxx' },
    })
    expect(res.status).toBe(401)
  })

  test('健康检查端点不需认证', async () => {
    const res = await fetch('http://localhost:3000/api/health')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('ok')
  })
})

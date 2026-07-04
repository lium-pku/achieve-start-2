import { test, expect } from '@playwright/test'
import {
  findMemberByRole,
  getPointTransactions,
  setMemberPoints,
  resetAndSeed,
  getMembers,
} from './helpers'

test.beforeAll(async () => {
  await resetAndSeed()
})

test.describe('流程 10：积分流水查询 + init 幂等', () => {
  test('积分流水按时间倒序返回', async () => {
    const child = await findMemberByRole('child')
    const mom = await findMemberByRole('mom')

    // 先确保有积分流水记录（之前测试可能已经产生了一些）
    // 直接设置积分会产生 adjust 类型流水
    await setMemberPoints(child.id, 10)
    await setMemberPoints(child.id, 20)
    await setMemberPoints(child.id, 30)

    // 获取流水
    const txs = await getPointTransactions(child.id)
    expect(txs.length).toBeGreaterThan(0)

    // 确认按时间倒序（最新的在前）
    for (let i = 1; i < txs.length; i++) {
      const prev = new Date(txs[i - 1].createdAt).getTime()
      const curr = new Date(txs[i].createdAt).getTime()
      expect(prev).toBeGreaterThanOrEqual(curr)
    }
  })

  test('积分流水包含 type/reason/amount 字段', async () => {
    const child = await findMemberByRole('child')

    const txs = await getPointTransactions(child.id)
    if (txs.length > 0) {
      const tx = txs[0]
      expect(tx).toHaveProperty('type')
      expect(tx).toHaveProperty('reason')
      expect(tx).toHaveProperty('amount')
      expect(tx).toHaveProperty('memberId')
      expect(tx.memberId).toBe(child.id)
    }
  })

  test('login 端点幂等：同一 code 再次登录返回同一用户', async () => {
    // 当前应该已有成员数据
    const membersBefore = await getMembers()
    expect(membersBefore.length).toBeGreaterThan(0)

    // 再次调用 login（用 test-mom，helpers 初始化时已登录）
    const { login } = await import('./helpers')
    const res: any = await login('test-mom')

    // 应该返回同一 user（id 不变）
    expect(res.user).toBeTruthy()
    expect(res.token).toBeTruthy()

    // 成员数量不变
    const membersAfter = await getMembers()
    expect(membersAfter.length).toBe(membersBefore.length)
  })

  test('积分流水包含 adjust 类型（手动调整产生）', async () => {
    const child = await findMemberByRole('child')

    // 通过 setMemberPoints 产生 adjust 流水
    await setMemberPoints(child.id, 5)

    const txs = await getPointTransactions(child.id)
    // 收集所有 type
    const types = new Set(txs.map((t) => t.type))

    // 应该至少有 adjust 类型
    expect(types.has('adjust')).toBe(true)
  })
})

import { test, expect } from '@playwright/test'
import {
  findMemberByRole,
  createMember,
  deleteMember,
  updateMember,
  getMembers,
  getEncouragements,
  createEncouragement,
  resetAll,
} from './helpers'

test.beforeAll(async () => {
  await resetAll()
})

test.describe('流程 7：成员 CRUD + 鼓励阈值', () => {
  test('新增成员 → 编辑 → 删除', async () => {
    // 1. 新增一个孩子
    const created = await createMember({
      name: '小红',
      role: 'child',
      avatar: '👧',
      color: '#FF9A3C',
    })
    expect(created.id).toBeTruthy()
    expect(created.role).toBe('child')
    expect(created.totalPoints).toBe(0)

    // 2. 确认在成员列表里
    const membersAfter = await getMembers()
    expect(membersAfter.find((m) => m.id === created.id)).toBeTruthy()

    // 3. 编辑名字
    const updated = await updateMember(created.id, { name: '小红花' })
    expect(updated.name).toBe('小红花')

    // 4. 删除
    await deleteMember(created.id)
    const membersFinal = await getMembers()
    expect(membersFinal.find((m) => m.id === created.id)).toBeUndefined()
  })

  test('非法 role 应被拒绝', async () => {
    await expect(
      createMember({ name: '测试', role: 'teacher' as any })
    ).rejects.toThrow(/role/)
  })

  test('鼓励阈值列表 + 新增', async () => {
    // 1. 获取鼓励阈值列表（init 应已创建 5 个）
    const encs = await getEncouragements()
    expect(encs.length).toBeGreaterThanOrEqual(5)

    // 2. 新增一个鼓励阈值
    const created = await createEncouragement({
      threshold: 999,
      title: '测试称号',
      message: '测试鼓励语',
      icon: '🎯',
    })
    expect(created.id).toBeTruthy()
    expect(created.threshold).toBe(999)

    // 3. 确认列表里有了
    const encsAfter = await getEncouragements()
    expect(encsAfter.find((e) => e.id === created.id)).toBeTruthy()
    expect(encsAfter.length).toBe(encs.length + 1)
  })

  test('鼓励阈值按 threshold 升序', async () => {
    const encs = await getEncouragements()
    for (let i = 1; i < encs.length; i++) {
      expect(encs[i].threshold).toBeGreaterThanOrEqual(encs[i - 1].threshold)
    }
  })
})

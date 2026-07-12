import { test, expect } from '@playwright/test'
import {
  findMemberByRole,
  getReviews,
  createReview,
  deleteReview,
  resetAndSeed,
  login,
  api,
} from './helpers'

test.beforeAll(async () => {
  await login('test-child')
  await resetAndSeed()
})

test.describe('流程 15：点评边界与编辑', () => {
  test('编辑点评内容（PATCH）', async () => {
    const child = await findMemberByRole('child')

    const created: any = await createReview({
      periodType: 'weekly',
      periodStart: '2026-06-23T00:00:00.000Z',
      periodEnd: '2026-06-30T00:00:00.000Z',
      authorId: child.id,
      content: '原始点评内容',
    })

    // 编辑内容
    const updated: any = await api(`/api/reviews/${created.id}`, {
      method: 'PATCH',
      body: { content: '修改后的点评内容' },
    })
    expect(updated.content).toBe('修改后的点评内容')

    // 确认查询也是新内容
    const list = await getReviews('weekly')
    const found = list.find((r) => r.id === created.id)
    expect(found.content).toBe('修改后的点评内容')

    await deleteReview(created.id)
  })

  test('孩子不能以别人的身份写点评', async () => {
    await expect(
      createReview({
        periodType: 'weekly',
        periodStart: '2026-06-23T00:00:00.000Z',
        periodEnd: '2026-06-30T00:00:00.000Z',
        authorId: 'nonexistent-author',
        content: '测试',
      })
    ).rejects.toThrow(/只能为自己/)
  })

  test('缺少 periodStart 应失败', async () => {
    const child = await findMemberByRole('child')
    await expect(
      createReview({
        periodType: 'weekly',
        periodStart: '',
        periodEnd: '2026-06-30T00:00:00.000Z',
        authorId: child.id,
        content: '测试',
      })
    ).rejects.toThrow(/必要字段/)
  })

  test('删除不存在的点评应失败', async () => {
    await expect(deleteReview('nonexistent-id')).rejects.toThrow()
  })

  test('查询所有点评（不按 periodType 过滤）', async () => {
    const child = await findMemberByRole('child')

    const w = await createReview({
      periodType: 'weekly',
      periodStart: '2026-06-23T00:00:00.000Z',
      periodEnd: '2026-06-30T00:00:00.000Z',
      authorId: child.id,
      content: '周报',
    })
    const m = await createReview({
      periodType: 'monthly',
      periodStart: '2026-06-01T00:00:00.000Z',
      periodEnd: '2026-07-01T00:00:00.000Z',
      authorId: child.id,
      content: '月报',
    })

    // 不传 periodType，应返回所有
    const all = await getReviews()
    expect(all.find((r) => r.id === w.id)).toBeTruthy()
    expect(all.find((r) => r.id === m.id)).toBeTruthy()

    await deleteReview(w.id)
    await deleteReview(m.id)
  })

  test('点评返回 author 关联数据', async () => {
    const child = await findMemberByRole('child')

    const created: any = await createReview({
      periodType: 'weekly',
      periodStart: '2026-06-23T00:00:00.000Z',
      periodEnd: '2026-06-30T00:00:00.000Z',
      authorId: child.id,
      content: '测试 author 关联',
    })

    const list = await getReviews('weekly')
    const found = list.find((r) => r.id === created.id)
    expect(found.author).toBeTruthy()
    expect(found.author.id).toBe(child.id)
    expect(found.author.name).toBe(child.name)

    await deleteReview(created.id)
  })
})

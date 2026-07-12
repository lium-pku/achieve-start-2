import { test, expect } from '@playwright/test'
import {
  findMemberByRole,
  getReviews,
  createReview,
  deleteReview,
  resetAndSeed,
  login,
} from './helpers'

test.beforeAll(async () => {
  await login('test-child')
  await resetAndSeed()
})

test.describe('流程 12：复盘点评 CRUD', () => {
  test('写周报点评 → 查询 → 删除', async () => {
    const child = await findMemberByRole('child')

    // 1. 写点评
    const created: any = await createReview({
      periodType: 'weekly',
      periodStart: '2026-06-23T00:00:00.000Z',
      periodEnd: '2026-06-30T00:00:00.000Z',
      authorId: child.id,
      content: '本周表现不错，按时率提升了，继续保持！',
    })
    expect(created.id).toBeTruthy()
    expect(created.content).toContain('本周表现不错')

    // 2. 查询本周点评
    const reviews = await getReviews('weekly')
    expect(reviews.find((r) => r.id === created.id)).toBeTruthy()

    // 3. 删除
    await deleteReview(created.id)
    const reviewsAfter = await getReviews('weekly')
    expect(reviewsAfter.find((r) => r.id === created.id)).toBeUndefined()
  })

  test('只有孩子能写点评，家长不能', async () => {
    const child = await findMemberByRole('child')
    const dad = await findMemberByRole('dad')

    // 孩子能写（当前已登录为孩子）
    const r1 = await createReview({
      periodType: 'weekly',
      periodStart: '2026-06-23T00:00:00.000Z',
      periodEnd: '2026-06-30T00:00:00.000Z',
      authorId: child.id,
      content: '孩子自评：这周我有进步',
    })
    expect(r1.author.id).toBe(child.id)

    // 妈妈不能写
    await login('test-mom')
    await expect(
      createReview({
        periodType: 'weekly',
        periodStart: '2026-06-23T00:00:00.000Z',
        periodEnd: '2026-06-30T00:00:00.000Z',
        authorId: child.id,
        content: '妈妈点评：不错',
      })
    ).rejects.toThrow(/只有孩子/)

    // 爸爸不能写
    await login('test-dad')
    await expect(
      createReview({
        periodType: 'weekly',
        periodStart: '2026-06-23T00:00:00.000Z',
        periodEnd: '2026-06-30T00:00:00.000Z',
        authorId: dad.id,
        content: '爸爸点评：继续努力',
      })
    ).rejects.toThrow(/只有孩子/)

    // 切回孩子
    await login('test-child')
  })

  test('月报点评与周报点评分离', async () => {
    const child = await findMemberByRole('child')

    await createReview({
      periodType: 'weekly',
      periodStart: '2026-06-23T00:00:00.000Z',
      periodEnd: '2026-06-30T00:00:00.000Z',
      authorId: child.id,
      content: '周报点评',
    })
    await createReview({
      periodType: 'monthly',
      periodStart: '2026-06-01T00:00:00.000Z',
      periodEnd: '2026-07-01T00:00:00.000Z',
      authorId: child.id,
      content: '月报点评',
    })

    const weekly = await getReviews('weekly')
    const monthly = await getReviews('monthly')

    expect(weekly.find((r) => r.content === '周报点评')).toBeTruthy()
    expect(weekly.find((r) => r.content === '月报点评')).toBeUndefined()
    expect(monthly.find((r) => r.content === '月报点评')).toBeTruthy()
    expect(monthly.find((r) => r.content === '周报点评')).toBeUndefined()
  })

  test('缺少 content 应失败', async () => {
    const child = await findMemberByRole('child')
    await expect(
      createReview({
        periodType: 'weekly',
        periodStart: '2026-06-23T00:00:00.000Z',
        periodEnd: '2026-06-30T00:00:00.000Z',
        authorId: child.id,
        content: '',
      })
    ).rejects.toThrow(/content|必要字段/)
  })

  test('非法 periodType 应失败', async () => {
    const child = await findMemberByRole('child')
    await expect(
      createReview({
        periodType: 'daily' as any,
        periodStart: '2026-06-23T00:00:00.000Z',
        periodEnd: '2026-06-30T00:00:00.000Z',
        authorId: child.id,
        content: '测试',
      })
    ).rejects.toThrow(/periodType/)
  })
})

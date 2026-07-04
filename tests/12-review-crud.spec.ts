import { test, expect } from '@playwright/test'
import {
  findMemberByRole,
  getReviews,
  createReview,
  deleteReview,
  resetAll,
} from './helpers'

test.beforeAll(async () => {
  await resetAll()
})

test.describe('流程 12：复盘点评 CRUD', () => {
  test('写周报点评 → 查询 → 删除', async () => {
    const mom = await findMemberByRole('mom')

    // 1. 写点评
    const created: any = await createReview({
      periodType: 'weekly',
      periodStart: '2026-06-23T00:00:00.000Z',
      periodEnd: '2026-06-30T00:00:00.000Z',
      authorId: mom.id,
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

  test('所有成员都能写点评', async () => {
    const child = await findMemberByRole('child')
    const mom = await findMemberByRole('mom')
    const dad = await findMemberByRole('dad')

    // 三个角色都写一条
    const r1 = await createReview({
      periodType: 'weekly',
      periodStart: '2026-06-23T00:00:00.000Z',
      periodEnd: '2026-06-30T00:00:00.000Z',
      authorId: child.id,
      content: '孩子自评：这周我有进步',
    })
    const r2 = await createReview({
      periodType: 'weekly',
      periodStart: '2026-06-23T00:00:00.000Z',
      periodEnd: '2026-06-30T00:00:00.000Z',
      authorId: mom.id,
      content: '妈妈点评：不错',
    })
    const r3 = await createReview({
      periodType: 'weekly',
      periodStart: '2026-06-23T00:00:00.000Z',
      periodEnd: '2026-06-30T00:00:00.000Z',
      authorId: dad.id,
      content: '爸爸点评：继续努力',
    })

    expect(r1.author.id).toBe(child.id)
    expect(r2.author.id).toBe(mom.id)
    expect(r3.author.id).toBe(dad.id)
  })

  test('月报点评与周报点评分离', async () => {
    const mom = await findMemberByRole('mom')

    await createReview({
      periodType: 'weekly',
      periodStart: '2026-06-23T00:00:00.000Z',
      periodEnd: '2026-06-30T00:00:00.000Z',
      authorId: mom.id,
      content: '周报点评',
    })
    await createReview({
      periodType: 'monthly',
      periodStart: '2026-06-01T00:00:00.000Z',
      periodEnd: '2026-07-01T00:00:00.000Z',
      authorId: mom.id,
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
    const mom = await findMemberByRole('mom')
    await expect(
      createReview({
        periodType: 'weekly',
        periodStart: '2026-06-23T00:00:00.000Z',
        periodEnd: '2026-06-30T00:00:00.000Z',
        authorId: mom.id,
        content: '',
      })
    ).rejects.toThrow(/content|必要字段/)
  })

  test('非法 periodType 应失败', async () => {
    const mom = await findMemberByRole('mom')
    await expect(
      createReview({
        periodType: 'daily' as any,
        periodStart: '2026-06-23T00:00:00.000Z',
        periodEnd: '2026-06-30T00:00:00.000Z',
        authorId: mom.id,
        content: '测试',
      })
    ).rejects.toThrow(/periodType/)
  })
})

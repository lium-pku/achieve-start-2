import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'

// 获取点评列表
// GET /api/reviews?periodType=weekly&memberId=xxx
// 不传 memberId 则返回所有点评
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const periodType = searchParams.get('periodType')

  const reviews = await db.review.findMany({
    where: {
      ...(periodType && { periodType }),
    },
    include: { author: true },
    orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
  })
  return ok(reviews)
}

// 新建点评
export async function POST(req: Request) {
  const body = await req.json()
  const { periodType, periodStart, periodEnd, authorId, content } = body

  if (!periodType || !periodStart || !periodEnd || !authorId || !content) {
    return fail('缺少必要字段')
  }
  if (!['weekly', 'monthly'].includes(periodType)) {
    return fail('periodType 必须为 weekly / monthly')
  }

  const author = await db.member.findUnique({ where: { id: authorId } })
  if (!author) return fail('作者不存在')

  const review = await db.review.create({
    data: {
      periodType,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      authorId,
      content,
    },
    include: { author: true },
  })
  return NextResponse.json(review, { status: 201 })
}

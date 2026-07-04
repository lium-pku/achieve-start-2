import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'
import { getContext } from '@/lib/auth'

// 获取点评列表
export async function GET(req: Request) {
  const ctx = getContext(req)
  const { searchParams } = new URL(req.url)
  const periodType = searchParams.get('periodType')

  const reviews = await db.review.findMany({
    where: {
      familyId: ctx.familyId,
      ...(periodType && { periodType }),
    },
    include: { author: true },
    orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
  })
  return ok(reviews)
}

// 新建点评（所有成员都能写）
export async function POST(req: Request) {
  const ctx = getContext(req)
  const body = await req.json()
  const { periodType, periodStart, periodEnd, authorId, content } = body

  if (!periodType || !periodStart || !periodEnd || !authorId || !content) {
    return fail('缺少必要字段')
  }
  if (!['weekly', 'monthly'].includes(periodType)) {
    return fail('periodType 必须为 weekly / monthly')
  }

  // 校验 authorId 属于当前 family
  const author = await db.member.findFirst({
    where: { id: authorId, familyId: ctx.familyId },
  })
  if (!author) return fail('作者不存在或无权访问')

  const review = await db.review.create({
    data: {
      familyId: ctx.familyId,
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

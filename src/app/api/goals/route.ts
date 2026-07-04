import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'

// 获取目标列表（可按 memberId 过滤）
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')

  const goals = await db.goal.findMany({
    where: memberId ? { memberId } : undefined,
    include: { member: true },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })
  return ok(goals)
}

// 新建目标
export async function POST(req: Request) {
  const body = await req.json()
  const { title, description, deadline, memberId } = body
  if (!title || !memberId) return fail('缺少 title / memberId')

  const member = await db.member.findUnique({ where: { id: memberId } })
  if (!member) return fail('成员不存在')

  const goal = await db.goal.create({
    data: {
      title,
      description: description || null,
      deadline: deadline ? new Date(deadline) : null,
      memberId,
    },
  })
  return NextResponse.json(goal, { status: 201 })
}

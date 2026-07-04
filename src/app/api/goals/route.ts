import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'
import { getContext } from '@/lib/auth'

// 获取目标列表
export async function GET(req: Request) {
  const ctx = getContext(req)
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')

  const goals = await db.goal.findMany({
    where: {
      familyId: ctx.familyId,
      ...(memberId && { memberId }),
    },
    include: { member: true },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })
  return ok(goals)
}

// 新建目标
export async function POST(req: Request) {
  const ctx = getContext(req)
  const body = await req.json()
  const { title, description, deadline, memberId } = body
  if (!title || !memberId) return fail('缺少 title / memberId')

  // 校验 memberId 属于当前 family
  const member = await db.member.findFirst({
    where: { id: memberId, familyId: ctx.familyId },
  })
  if (!member) return fail('成员不存在或无权访问')

  const goal = await db.goal.create({
    data: {
      familyId: ctx.familyId,
      title,
      description: description || null,
      deadline: deadline ? new Date(deadline) : null,
      memberId,
    },
  })
  return NextResponse.json(goal, { status: 201 })
}

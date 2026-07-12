import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'
import { getContext } from '@/lib/auth'

// 角色限制：只有孩子能编辑/删除点评
function requireChild(ctx: any): Response | null {
  if (ctx.role !== 'child') {
    return Response.json({ error: '只有孩子才能管理点评' }, { status: 403 })
  }
  return null
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = getContext(req)
  const err = requireChild(ctx)
  if (err) return err

  const existing = await db.review.findFirst({
    where: { id, familyId: ctx.familyId },
  })
  if (!existing) return fail('点评不存在或无权访问', 404)

  const body = await req.json()
  const review = await db.review.update({
    where: { id },
    data: {
      ...(body.content !== undefined && { content: body.content }),
    },
    include: { author: true },
  })
  return ok(review)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = getContext(_req)
  const err = requireChild(ctx)
  if (err) return err

  const existing = await db.review.findFirst({
    where: { id, familyId: ctx.familyId },
  })
  if (!existing) return fail('点评不存在或无权访问', 404)

  await db.review.delete({ where: { id } })
  return ok({ deleted: true })
}

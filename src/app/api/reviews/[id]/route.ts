import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'
import { getContext } from '@/lib/auth'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = getContext(req)

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

  const existing = await db.review.findFirst({
    where: { id, familyId: ctx.familyId },
  })
  if (!existing) return fail('点评不存在或无权访问', 404)

  await db.review.delete({ where: { id } })
  return ok({ deleted: true })
}

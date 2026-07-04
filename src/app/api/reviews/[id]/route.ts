import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
  await db.review.delete({ where: { id } })
  return ok({ deleted: true })
}

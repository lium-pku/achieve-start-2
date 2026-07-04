import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'
import { getContext } from '@/lib/auth'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = getContext(req)

  const existing = await db.goal.findFirst({
    where: { id, familyId: ctx.familyId },
  })
  if (!existing) return fail('目标不存在或无权访问', 404)

  const body = await req.json()
  const goal = await db.goal.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.deadline !== undefined && {
        deadline: body.deadline ? new Date(body.deadline) : null,
      }),
    },
  })
  return ok(goal)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = getContext(_req)

  const existing = await db.goal.findFirst({
    where: { id, familyId: ctx.familyId },
  })
  if (!existing) return fail('目标不存在或无权访问', 404)

  await db.goal.delete({ where: { id } })
  return ok({ deleted: true })
}

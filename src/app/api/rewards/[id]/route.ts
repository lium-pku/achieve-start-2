import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'
import { getContext, requireParent } from '@/lib/auth'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = getContext(req)
  const err = requireParent(ctx)
  if (err) return err

  const existing = await db.reward.findFirst({
    where: { id, familyId: ctx.familyId },
  })
  if (!existing) return fail('奖励不存在或无权访问', 404)

  const body = await req.json()
  const reward = await db.reward.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.icon !== undefined && { icon: body.icon }),
      ...(body.pointsCost !== undefined && { pointsCost: Number(body.pointsCost) }),
      ...(body.active !== undefined && { active: body.active }),
    },
  })
  return ok(reward)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = getContext(_req)
  const err = requireParent(ctx)
  if (err) return err

  const existing = await db.reward.findFirst({
    where: { id, familyId: ctx.familyId },
  })
  if (!existing) return fail('奖励不存在或无权访问', 404)

  await db.reward.update({ where: { id }, data: { active: false } })
  return ok({ deleted: true })
}

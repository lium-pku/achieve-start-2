import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
  await db.reward.update({ where: { id }, data: { active: false } })
  return ok({ deleted: true })
}

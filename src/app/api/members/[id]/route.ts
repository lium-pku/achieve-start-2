import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const member = await db.member.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.avatar !== undefined && { avatar: body.avatar }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.totalPoints !== undefined && { totalPoints: body.totalPoints }),
    },
  })
  return ok(member)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.member.delete({ where: { id } })
  return ok({ deleted: true })
}

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'
import { getContext, requireParent } from '@/lib/auth'

export async function GET(req: Request) {
  const ctx = getContext(req)
  const list = await db.reward.findMany({
    where: { familyId: ctx.familyId, active: true },
    include: { createdBy: true },
    orderBy: { pointsCost: 'asc' },
  })
  return ok(list)
}

export async function POST(req: Request) {
  const ctx = getContext(req)
  const err = requireParent(ctx)
  if (err) return err

  const body = await req.json()
  const { title, description, icon, pointsCost } = body
  if (!title || !pointsCost) return fail('缺少 title / pointsCost')

  const reward = await db.reward.create({
    data: {
      familyId: ctx.familyId,
      title,
      description: description || null,
      icon: icon || '🎁',
      pointsCost: Number(pointsCost),
      createdById: ctx.memberId || '',
    },
  })
  return NextResponse.json(reward, { status: 201 })
}

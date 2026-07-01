import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'

export async function GET() {
  const list = await db.reward.findMany({
    where: { active: true },
    include: { createdBy: true },
    orderBy: { pointsCost: 'asc' },
  })
  return ok(list)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { title, description, icon, pointsCost, createdById } = body
  if (!title || !pointsCost || !createdById) return fail('缺少 title / pointsCost / createdById')
  const reward = await db.reward.create({
    data: {
      title,
      description: description || null,
      icon: icon || '🎁',
      pointsCost: Number(pointsCost),
      createdById,
    },
  })
  return NextResponse.json(reward, { status: 201 })
}

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'
import { getContext, requireParent } from '@/lib/auth'

export async function GET(req: Request) {
  const ctx = getContext(req)
  const list = await db.encouragement.findMany({
    where: { familyId: ctx.familyId },
    orderBy: { threshold: 'asc' },
  })
  return ok(list)
}

export async function POST(req: Request) {
  const ctx = getContext(req)
  const err = requireParent(ctx)
  if (err) return err

  const body = await req.json()
  const { threshold, title, message, icon } = body
  if (!threshold || !title || !message) return fail('缺少 threshold / title / message')

  const enc = await db.encouragement.create({
    data: {
      familyId: ctx.familyId,
      threshold: Number(threshold),
      title,
      message,
      icon: icon || '🌟',
    },
  })
  return NextResponse.json(enc, { status: 201 })
}

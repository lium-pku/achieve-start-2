import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'

export async function GET() {
  const list = await db.encouragement.findMany({
    orderBy: { threshold: 'asc' },
  })
  return ok(list)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { threshold, title, message, icon } = body
  if (!threshold || !title || !message) return fail('缺少 threshold / title / message')
  const enc = await db.encouragement.create({
    data: {
      threshold: Number(threshold),
      title,
      message,
      icon: icon || '🌟',
    },
  })
  return NextResponse.json(enc, { status: 201 })
}

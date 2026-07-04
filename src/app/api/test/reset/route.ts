import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 测试专用：彻底重置数据库（仅开发环境）
// 清空所有业务数据表，保留空数据库
// 调用后再调 /api/test/seed 写入固定初始数据
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: '生产环境禁用' }, { status: 403 })
  }

  // 按依赖顺序删除（子表先删）
  await db.review.deleteMany()
  await db.goal.deleteMany()
  await db.rewardRedemption.deleteMany()
  await db.pointTransaction.deleteMany()
  await db.activityLog.deleteMany()
  await db.encouragement.deleteMany()
  await db.reward.deleteMany()
  await db.activity.deleteMany()
  await db.member.deleteMany()

  return NextResponse.json({
    message: '已彻底重置',
    cleared: [
      'review',
      'goal',
      'rewardRedemption',
      'pointTransaction',
      'activityLog',
      'encouragement',
      'reward',
      'activity',
      'member',
    ],
  })
}

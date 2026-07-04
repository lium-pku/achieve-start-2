import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 测试专用：重置数据（仅开发环境）
// 清空所有 ActivityLog / PointTransaction / RewardRedemption，重置积分
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: '生产环境禁用' }, { status: 403 })
  }

  await db.rewardRedemption.deleteMany()
  await db.activityLog.deleteMany()
  await db.pointTransaction.deleteMany()
  await db.member.updateMany({ data: { totalPoints: 0 } })

  return NextResponse.json({
    message: '已重置',
    cleared: ['rewardRedemption', 'activityLog', 'pointTransaction'],
    membersReset: true,
  })
}

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 测试专用：写入固定的初始测试数据（仅开发环境）
// 确保每次测试从完全相同的状态开始
// 数据特征：
//   - 3 个成员（小宇/妈妈/爸爸），积分均为 0
//   - 3 个日度活动（截止时间设为 23:59，确保测试时不会超时）
//   - 1 个周度活动（每周六）
//   - 1 个月度活动（每月 1 号）
//   - 3 个鼓励阈值（20/50/100）
//   - 2 个奖励（30 分 / 80 分）
//   - 无任何打卡记录、积分流水、目标、点评
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: '生产环境禁用' }, { status: 403 })
  }

  // 如果已有数据，先清空（保证幂等）
  await db.review.deleteMany()
  await db.goal.deleteMany()
  await db.rewardRedemption.deleteMany()
  await db.pointTransaction.deleteMany()
  await db.activityLog.deleteMany()
  await db.encouragement.deleteMany()
  await db.reward.deleteMany()
  await db.activity.deleteMany()
  await db.member.deleteMany()

  // 1. 创建 3 个成员
  const child = await db.member.create({
    data: { name: '小宇', role: 'child', avatar: '🧒', color: '#FF9A3C', totalPoints: 0 },
  })
  const mom = await db.member.create({
    data: { name: '妈妈', role: 'mom', avatar: '👩', color: '#EC4899', totalPoints: 0 },
  })
  const dad = await db.member.create({
    data: { name: '爸爸', role: 'dad', avatar: '👨', color: '#10B981', totalPoints: 0 },
  })

  // 2. 创建 5 个活动（截止时间都设为 23:59，避免测试时超时）
  const activities = [
    {
      title: '起床洗漱',
      scheduleType: 'daily',
      scheduledTime: '07:00',
      deadline: '23:59',
      points: 2,
      onTimeBonus: 1,
      createdById: mom.id,
      assignedToId: child.id,
    },
    {
      title: '吃早餐',
      scheduleType: 'daily',
      scheduledTime: '07:30',
      deadline: '23:59',
      points: 2,
      onTimeBonus: 1,
      createdById: mom.id,
      assignedToId: child.id,
    },
    {
      title: '完成作业',
      scheduleType: 'daily',
      scheduledTime: '17:00',
      deadline: '23:59',
      points: 4,
      onTimeBonus: 2,
      createdById: mom.id,
      assignedToId: child.id,
    },
    {
      title: '整理房间',
      scheduleType: 'weekly',
      dayOfWeek: 6,
      scheduledTime: '10:00',
      deadline: '23:59',
      points: 5,
      onTimeBonus: 3,
      createdById: mom.id,
      assignedToId: child.id,
    },
    {
      title: '月度总结',
      scheduleType: 'monthly',
      dayOfMonth: 1,
      scheduledTime: '19:00',
      deadline: '23:59',
      points: 10,
      onTimeBonus: 5,
      createdById: dad.id,
      assignedToId: child.id,
    },
  ]
  for (const a of activities) {
    await db.activity.create({ data: a })
  }

  // 3. 创建 3 个鼓励阈值
  const encouragements = [
    { threshold: 20, title: '初露锋芒', message: '你已经攒了 20 分啦！', icon: '🌱' },
    { threshold: 50, title: '进步小达人', message: '50 分达成，你真棒！', icon: '⭐' },
    { threshold: 100, title: '勤奋小标兵', message: '100 分！你是时间管理小能手！', icon: '🏆' },
  ]
  for (const e of encouragements) {
    await db.encouragement.create({ data: e })
  }

  // 4. 创建 2 个奖励
  const rewards = [
    { title: '看 30 分钟动画片', icon: '📺', pointsCost: 30, createdById: mom.id },
    { title: '去公园玩 2 小时', icon: '🎠', pointsCost: 80, createdById: dad.id },
  ]
  for (const r of rewards) {
    await db.reward.create({ data: r })
  }

  return NextResponse.json({
    message: '固定测试数据已写入',
    members: { child: child.id, mom: mom.id, dad: dad.id },
    counts: {
      activities: activities.length,
      encouragements: encouragements.length,
      rewards: rewards.length,
    },
  })
}

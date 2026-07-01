import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 种子数据：调用一次即可初始化演示家庭
export async function POST() {
  const existing = await db.member.count()
  if (existing > 0) {
    return NextResponse.json({ message: '数据已存在，跳过初始化', skipped: true })
  }

  // 1. 创建家庭成员
  const child = await db.member.create({
    data: {
      name: '小宇',
      role: 'child',
      avatar: '🧒',
      color: '#FF9A3C',
      totalPoints: 0,
    },
  })
  const mom = await db.member.create({
    data: {
      name: '妈妈',
      role: 'mom',
      avatar: '👩',
      color: '#EC4899',
      totalPoints: 0,
    },
  })
  const dad = await db.member.create({
    data: {
      name: '爸爸',
      role: 'dad',
      avatar: '👨',
      color: '#10B981',
      totalPoints: 0,
    },
  })

  // 2. 创建一些示例活动（日度/周度/月度）
  const activities = [
    { title: '起床洗漱', scheduleType: 'daily', scheduledTime: '07:00', deadline: '07:30', points: 2, onTimeBonus: 1, createdById: mom.id, assignedToId: child.id },
    { title: '吃早餐', scheduleType: 'daily', scheduledTime: '07:30', deadline: '08:00', points: 2, onTimeBonus: 1, createdById: mom.id, assignedToId: child.id },
    { title: '认真听课', scheduleType: 'daily', scheduledTime: '08:30', deadline: '16:00', points: 3, onTimeBonus: 2, createdById: dad.id, assignedToId: child.id },
    { title: '完成作业', scheduleType: 'daily', scheduledTime: '17:00', deadline: '19:30', points: 4, onTimeBonus: 2, createdById: mom.id, assignedToId: child.id },
    { title: '阅读 20 分钟', scheduleType: 'daily', scheduledTime: '20:00', deadline: '21:00', points: 2, onTimeBonus: 1, createdById: mom.id, assignedToId: child.id },
    { title: '按时睡觉', scheduleType: 'daily', scheduledTime: '21:00', deadline: '21:30', points: 2, onTimeBonus: 1, createdById: dad.id, assignedToId: child.id },
    { title: '整理房间', scheduleType: 'weekly', dayOfWeek: 6, scheduledTime: '10:00', deadline: '12:00', points: 5, onTimeBonus: 3, createdById: mom.id, assignedToId: child.id },
    { title: '帮妈妈做家务', scheduleType: 'weekly', dayOfWeek: 7, scheduledTime: '10:00', deadline: '12:00', points: 4, onTimeBonus: 2, createdById: mom.id, assignedToId: child.id },
    { title: '体育锻炼', scheduleType: 'weekly', dayOfWeek: 3, scheduledTime: '17:30', deadline: '19:00', points: 3, onTimeBonus: 2, createdById: dad.id, assignedToId: child.id },
    { title: '月度总结复盘', scheduleType: 'monthly', dayOfMonth: 1, scheduledTime: '19:00', deadline: '21:00', points: 10, onTimeBonus: 5, createdById: dad.id, assignedToId: child.id },
  ]
  for (const a of activities) {
    await db.activity.create({ data: a })
  }

  // 3. 鼓励阈值
  const encouragements = [
    { threshold: 20, title: '初露锋芒', message: '你已经攒了 20 分啦！继续保持！', icon: '🌱' },
    { threshold: 50, title: '进步小达人', message: '50 分达成，你真棒！', icon: '⭐' },
    { threshold: 100, title: '勤奋小标兵', message: '100 分！你是时间管理小能手！', icon: '🏆' },
    { threshold: 200, title: '自律之星', message: '200 分！自律让你更优秀！', icon: '🌟' },
    { threshold: 500, title: '时间大师', message: '500 分！你就是时间的主人！', icon: '👑' },
  ]
  for (const e of encouragements) {
    await db.encouragement.create({ data: e })
  }

  // 4. 兑换奖励
  const rewards = [
    { title: '看 30 分钟动画片', icon: '📺', pointsCost: 30, createdById: mom.id },
    { title: '吃一次冰淇淋', icon: '🍦', pointsCost: 50, createdById: mom.id },
    { title: '去公园玩 2 小时', icon: '🎠', pointsCost: 80, createdById: dad.id },
    { title: '挑一本新书', icon: '📚', pointsCost: 120, createdById: mom.id },
    { title: '周末游戏时间 1 小时', icon: '🎮', pointsCost: 150, createdById: dad.id },
    { title: '家庭电影夜', icon: '🎬', pointsCost: 200, createdById: mom.id },
  ]
  for (const r of rewards) {
    await db.reward.create({ data: r })
  }

  return NextResponse.json({
    message: '初始化完成',
    members: { child: child.id, mom: mom.id, dad: dad.id },
    counts: {
      activities: activities.length,
      encouragements: encouragements.length,
      rewards: rewards.length,
    },
  })
}

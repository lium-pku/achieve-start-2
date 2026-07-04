import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getContext } from '@/lib/auth'
import { ok, fail } from '@/lib/time-utils'

// 测试专用：按 familyId 清空 + 重写固定种子数据
// 调用前需带 token（middleware 放行但需要 ctx）
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return fail('生产环境禁用')
  }

  let ctx
  try {
    ctx = getContext(req)
  } catch {
    return fail('未授权', 401)
  }
  const familyId = ctx.familyId

  // ① 清空当前 familyId 下所有业务数据（保留 Member，因为 User.memberId 依赖它）
  await db.review.deleteMany({ where: { familyId } })
  await db.goal.deleteMany({ where: { familyId } })
  await db.rewardRedemption.deleteMany({ where: { familyId } })
  await db.pointTransaction.deleteMany({ where: { familyId } })
  await db.activityLog.deleteMany({ where: { familyId } })
  await db.encouragement.deleteMany({ where: { familyId } })
  await db.reward.deleteMany({ where: { familyId } })
  await db.activity.deleteMany({ where: { familyId } })

  // ② 重置 Member 积分为 0（Member 不删，复用）
  await db.member.updateMany({ where: { familyId }, data: { totalPoints: 0 } })

  // ③ 查找或创建 3 个成员（按角色）
  let child = await db.member.findFirst({ where: { familyId, role: 'child' } })
  if (!child) {
    child = await db.member.create({
      data: { familyId, name: '小宇', role: 'child', avatar: '🧒', color: '#FF9A3C' },
    })
  }
  let mom = await db.member.findFirst({ where: { familyId, role: 'mom' } })
  if (!mom) {
    mom = await db.member.create({
      data: { familyId, name: '妈妈', role: 'mom', avatar: '👩', color: '#EC4899' },
    })
  }
  let dad = await db.member.findFirst({ where: { familyId, role: 'dad' } })
  if (!dad) {
    dad = await db.member.create({
      data: { familyId, name: '爸爸', role: 'dad', avatar: '👨', color: '#10B981' },
    })
  }

  // ④ 写 5 个活动（截止时间统一 23:59，避免测试超时）
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
    {
      title: '临时活动-看牙医',
      scheduleType: 'once',
      specificDate: new Date(), // 今天
      scheduledTime: '14:00',
      deadline: '18:00',
      points: 3,
      onTimeBonus: 1,
      createdById: mom.id,
      assignedToId: child.id,
    },
  ]
  for (const a of activities) {
    await db.activity.create({ data: { familyId, ...a } })
  }

  // ⑤ 3 个鼓励阈值
  const encouragements = [
    { threshold: 20, title: '初露锋芒', message: '你已经攒了 20 分啦！', icon: '🌱' },
    { threshold: 50, title: '进步小达人', message: '50 分达成，你真棒！', icon: '⭐' },
    { threshold: 100, title: '勤奋小标兵', message: '100 分！你是时间管理小能手！', icon: '🏆' },
  ]
  for (const e of encouragements) {
    await db.encouragement.create({ data: { familyId, ...e } })
  }

  // ⑥ 2 个奖励
  const rewards = [
    { title: '看 30 分钟动画片', icon: '📺', pointsCost: 30, createdById: mom.id },
    { title: '去公园玩 2 小时', icon: '🎠', pointsCost: 80, createdById: dad.id },
  ]
  for (const r of rewards) {
    await db.reward.create({ data: { familyId, ...r } })
  }

  return ok({
    message: '测试数据已重置',
    members: { child: child.id, mom: mom.id, dad: dad.id },
    counts: {
      activities: activities.length,
      encouragements: encouragements.length,
      rewards: rewards.length,
    },
  })
}

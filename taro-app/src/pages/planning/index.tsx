import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, Input, Textarea, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import {
  getToken, getUser, getMembers, getGoals, createGoal, updateGoal, deleteGoal,
  getStats, getReviews, createReview
} from '@/services/api'
import './index.scss'

const STATUS_LABELS: Record<string, string> = {
  not_started: '未开始', in_progress: '进行中', achieved: '已达成'
}
const STATUS_COLORS: Record<string, string> = {
  not_started: 'not-started', in_progress: 'in-progress', achieved: 'achieved'
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

export default function Planning() {
  const [members, setMembers] = useState<any[]>([])
  const [children, setChildren] = useState<any[]>([])
  const [subTab, setSubTab] = useState<'goals' | 'review' | 'comments'>('goals')
  const [goals, setGoals] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly')
  const [reviewContent, setReviewContent] = useState('')

  const user = getUser()
  const isChild = user?.role === 'child'

  useEffect(() => {
    if (!getToken()) {
      Taro.reLaunch({ url: '/pages/login/index' })
      return
    }
    getMembers().then((list) => {
      setMembers(list)
      setChildren(list.filter((m) => m.role === 'child'))
    }).catch(() => {})
  }, [])

  const childMember = children[0]

  const loadGoals = useCallback(async () => {
    try {
      const list = await getGoals()
      setGoals(list)
    } catch (e) { console.error(e) }
  }, [])

  const loadStats = useCallback(async () => {
    if (!childMember) return
    try {
      const s = await getStats(childMember.id, period, 0)
      setStats(s)
    } catch (e) { console.error(e) }
  }, [childMember, period])

  const loadReviews = useCallback(async () => {
    try {
      const list = await getReviews('weekly')
      setReviews(list)
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => {
    if (subTab === 'goals') loadGoals()
    else if (subTab === 'review') loadStats()
    else loadReviews()
    setLoading(false)
  }, [subTab, loadGoals, loadStats, loadReviews])

  // 目标操作
  const handleCreateGoal = async () => {
    if (!isChild) {
      Taro.showToast({ title: '只有孩子才能创建目标', icon: 'none' })
      return
    }
    if (!user?.memberId) return
    try {
      await createGoal({ title: '新目标', memberId: user.memberId })
      Taro.showToast({ title: '已创建', icon: 'success' })
      loadGoals()
    } catch (e: any) {
      Taro.showToast({ title: e.message, icon: 'none' })
    }
  }

  const handleStatusChange = async (goal: any, status: string) => {
    try {
      await updateGoal(goal.id, { status })
      Taro.showToast({ title: `状态已更新`, icon: 'success' })
      loadGoals()
    } catch (e: any) {
      Taro.showToast({ title: e.message, icon: 'none' })
    }
  }

  const handleDeleteGoal = (goalId: string) => {
    Taro.showModal({
      title: '删除目标', content: '确认删除？',
      success: async (res) => {
        if (res.confirm) {
          await deleteGoal(goalId)
          Taro.showToast({ title: '已删除', icon: 'success' })
          loadGoals()
        }
      },
    })
  }

  // 点评
  const handlePublishReview = async () => {
    if (!reviewContent.trim() || !user?.memberId) return
    try {
      const ws = getWeekStart(new Date())
      const we = new Date(ws)
      we.setDate(we.getDate() + 7)
      await createReview({
        periodType: 'weekly',
        periodStart: ws.toISOString(),
        periodEnd: we.toISOString(),
        authorId: user.memberId,
        content: reviewContent.trim(),
      })
      Taro.showToast({ title: '点评已发布', icon: 'success' })
      setReviewContent('')
      loadReviews()
    } catch (e: any) {
      Taro.showToast({ title: e.message, icon: 'none' })
    }
  }

  if (loading) {
    return <View className='loading'><Text>加载中...</Text></View>
  }

  return (
    <ScrollView scrollY className='planning-page'>
      {/* 子 Tab */}
      <View className='sub-tabs'>
        <Text className={`sub-tab ${subTab === 'goals' ? 'active' : ''}`} onClick={() => setSubTab('goals')}>🎯 目标</Text>
        <Text className={`sub-tab ${subTab === 'review' ? 'active' : ''}`} onClick={() => setSubTab('review')}>📊 复盘</Text>
        <Text className={`sub-tab ${subTab === 'comments' ? 'active' : ''}`} onClick={() => setSubTab('comments')}>💬 点评</Text>
      </View>

      {/* 目标 */}
      {subTab === 'goals' && (
        <View className='goals-section'>
          {isChild && (
            <Text className='add-btn' onClick={handleCreateGoal}>+ 新建目标</Text>
          )}
          {goals.length === 0 ? (
            <View className='empty'><Text>🎯 还没有目标</Text></View>
          ) : (
            goals.map((g) => (
              <View key={g.id} className={`goal-card ${STATUS_COLORS[g.status]}`}>
                <View className='goal-header'>
                  <Text className='goal-title'>{g.title}</Text>
                  <Text className={`goal-status ${STATUS_COLORS[g.status]}`}>{STATUS_LABELS[g.status]}</Text>
                </View>
                {g.description && <Text className='goal-desc'>{g.description}</Text>}
                {g.deadline && <Text className='goal-deadline'>截止: {g.deadline.split('T')[0]}</Text>}
                {g.member && <Text className='goal-member'>{g.member.avatar} {g.member.name}</Text>}
                {/* 状态切换 */}
                <View className='goal-actions'>
                  {['not_started', 'in_progress', 'achieved'].map((s) => (
                    <Text
                      key={s}
                      className={`status-btn ${g.status === s ? 'active' : ''} ${STATUS_COLORS[s]}`}
                      onClick={() => handleStatusChange(g, s)}
                    >{STATUS_LABELS[s]}</Text>
                  ))}
                  {isChild && (
                    <Text className='delete-btn' onClick={() => handleDeleteGoal(g.id)}>删除</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* 复盘 */}
      {subTab === 'review' && (
        <View className='review-section'>
          <View className='period-toggle'>
            <Text className={`period-btn ${period === 'weekly' ? 'active' : ''}`} onClick={() => setPeriod('weekly')}>周报</Text>
            <Text className={`period-btn ${period === 'monthly' ? 'active' : ''}`} onClick={() => setPeriod('monthly')}>月报</Text>
          </View>
          {stats ? (
            <View>
              <View className='stats-grid'>
                <View className='stat-card'>
                  <Text className='stat-num'>{stats.completionRate}%</Text>
                  <Text className='stat-label'>完成率</Text>
                  <Text className='stat-sub'>{stats.completedTasks}/{stats.totalTasks}</Text>
                </View>
                <View className='stat-card'>
                  <Text className='stat-num'>{stats.onTimeRate}%</Text>
                  <Text className='stat-label'>按时率</Text>
                  <Text className='stat-sub'>{stats.onTimeTasks}个</Text>
                </View>
                <View className='stat-card'>
                  <Text className={`stat-num ${stats.pointsNet >= 0 ? 'positive' : 'negative'}`}>
                    {stats.pointsNet >= 0 ? '+' : ''}{stats.pointsNet}
                  </Text>
                  <Text className='stat-label'>净积分</Text>
                  <Text className='stat-sub'>+{stats.pointsEarned}/-{stats.pointsPenalty}</Text>
                </View>
                <View className='stat-card'>
                  <Text className='stat-num'>{stats.missedTasks}</Text>
                  <Text className='stat-label'>未完成</Text>
                </View>
              </View>

              {/* 趋势 */}
              {stats.trend && stats.trend.length > 0 && (
                <View className='trend-section'>
                  <Text className='trend-title'>最近 4 个{period === 'weekly' ? '周' : '月'}趋势</Text>
                  {stats.trend.map((t: any, i: number) => (
                    <View key={i} className='trend-row'>
                      <Text className='trend-label'>{t.label}</Text>
                      <Text className='trend-val'>完成{t.completionRate}% · 按时{t.onTimeRate}% · 净{t.pointsNet}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View className='empty'><Text>暂无数据</Text></View>
          )}
        </View>
      )}

      {/* 点评 */}
      {subTab === 'comments' && (
        <View className='comments-section'>
          {isChild && (
            <View className='write-comment'>
              <Text className='section-title'>写点评</Text>
              <Textarea
                className='comment-input'
                value={reviewContent}
                onInput={(e) => setReviewContent(e.detail.value)}
                placeholder='写下本周表现的点评、鼓励或建议...'
                maxlength={500}
              />
              <Text className='publish-btn' onClick={handlePublishReview}>发布点评</Text>
            </View>
          )}
          <View className='comment-list'>
            <Text className='section-title'>往期点评 · {reviews.length} 条</Text>
            {reviews.length === 0 ? (
              <View className='empty'><Text>📝 还没有点评记录</Text></View>
            ) : (
              reviews.map((r) => (
                <View key={r.id} className='comment-card'>
                  <View className='comment-header'>
                    <Text className='comment-author'>{r.author?.avatar} {r.author?.name}</Text>
                    <Text className='comment-date'>
                      {r.author?.role === 'child' ? '孩子' : r.author?.role === 'mom' ? '妈妈' : '爸爸'} · {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                    </Text>
                  </View>
                  <Text className='comment-content'>{r.content}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      )}
    </ScrollView>
  )
}

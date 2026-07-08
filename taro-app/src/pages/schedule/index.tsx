import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getToken, getUser, getMembers, getActivities, getActivityLogs, createActivity, deleteActivity } from '@/services/api'
import './index.scss'

const SCHEDULE_LABELS: Record<string, string> = {
  daily: '日度', weekly: '周度', monthly: '月度', once: '临时'
}

const WEEKDAYS = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDateLabel(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function getWeekdayLabel(date: Date): string {
  return WEEKDAYS[date.getDay() === 0 ? 7 : date.getDay()]
}

// 判断活动是否在指定日期活跃
function isActiveOnDate(a: any, date: Date): boolean {
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  if (a.scheduleType === 'daily') return true
  if (a.scheduleType === 'weekly') {
    const d = target.getDay()
    const td = d === 0 ? 7 : d
    return a.dayOfWeek === td
  }
  if (a.scheduleType === 'monthly') return a.dayOfMonth === target.getDate()
  if (a.scheduleType === 'once' && a.specificDate) {
    const spec = new Date(a.specificDate)
    spec.setHours(0, 0, 0, 0)
    return spec.getTime() === target.getTime()
  }
  return false
}

export default function Schedule() {
  const [members, setMembers] = useState<any[]>([])
  const [children, setChildren] = useState<any[]>([])
  const [selectedChildId, setSelectedChildId] = useState('')
  const [activities, setActivities] = useState<any[]>([])
  const [logs, setLogs] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedDate, setSelectedDate] = useState(new Date())

  const user = getUser()
  const isParent = user?.role === 'mom' || user?.role === 'dad'
  const childMember = children.find((m) => m.id === selectedChildId) || children[0]

  useEffect(() => {
    if (!getToken()) {
      Taro.reLaunch({ url: '/pages/login/index' })
      return
    }
    getMembers().then((list) => {
      setMembers(list)
      const kids = list.filter((m) => m.role === 'child')
      setChildren(kids)
    }).catch(() => {})
  }, [])

  const loadData = useCallback(async () => {
    if (!childMember) {
      setLoading(false)
      return
    }
    try {
      const dateStr = formatDate(selectedDate)
      const [acts, actLogs] = await Promise.all([
        getActivities({ assignedToId: childMember.id, date: dateStr }),
        getActivityLogs(childMember.id, 7),
      ])
      setActivities(acts)

      // 构建日志 map
      const dateStr2 = formatDate(selectedDate)
      const logMap: Record<string, any> = {}
      for (const log of actLogs) {
        if (log.occurrenceDate?.startsWith(dateStr2)) {
          logMap[log.activityId] = log
        }
      }
      setLogs(logMap)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [childMember, selectedDate])

  useEffect(() => {
    if (childMember) {
      setLoading(true)
      loadData()
    }
  }, [loadData])

  const goPrevDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    setSelectedDate(d)
  }
  const goNextDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    setSelectedDate(d)
  }
  const goToday = () => setSelectedDate(new Date())

  const handleAddActivity = () => {
    if (!isParent) {
      Taro.showToast({ title: '只有家长才能创建活动', icon: 'none' })
      return
    }
    Taro.navigateTo({
      url: `/pages/schedule/edit?childId=${childMember?.id || ''}`,
    })
  }

  const handleDeleteActivity = (activityId: string) => {
    Taro.showModal({
      title: '删除活动',
      content: '确认删除该活动？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await deleteActivity(activityId)
            Taro.showToast({ title: '已删除', icon: 'success' })
            loadData()
          } catch (e: any) {
            Taro.showToast({ title: e.message, icon: 'none' })
          }
        }
      },
    })
  }

  if (loading) {
    return <View className='loading'><Text>加载中...</Text></View>
  }

  const timedActivities = activities.filter((a) => a.scheduledTime)
  const untimedActivities = activities.filter((a) => !a.scheduledTime)
  const isToday = formatDate(selectedDate) === formatDate(new Date())

  return (
    <ScrollView scrollY className='schedule-page'>
      {/* 视图切换 + 成员选择 */}
      <View className='top-bar'>
        <View className='view-toggle'>
          <Text
            className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >网格</Text>
          <Text
            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >列表</Text>
        </View>

        {isParent && children.length > 0 && (
          <ScrollView scrollX className='member-picker'>
            {children.map((c) => (
              <Text
                key={c.id}
                className={`member-btn ${childMember?.id === c.id ? 'active' : ''}`}
                onClick={() => setSelectedChildId(c.id)}
              >{c.avatar} {c.name}</Text>
            ))}
          </ScrollView>
        )}
      </View>

      {isParent && (
        <View className='action-bar'>
          <Text className='add-btn' onClick={handleAddActivity}>+ 新建活动</Text>
        </View>
      )}

      {/* 日期导航 */}
      <View className='date-nav'>
        <Text className='nav-arrow' onClick={goPrevDay}>‹</Text>
        <View className='date-info'>
          <Text className='date-label'>{formatDateLabel(selectedDate)} · {getWeekdayLabel(selectedDate)}</Text>
          {!isToday && <Text className='today-link' onClick={goToday}>回到今天</Text>}
        </View>
        <Text className='nav-arrow' onClick={goNextDay}>›</Text>
      </View>

      {/* 活动统计 */}
      <View className='stats-bar'>
        <Text className='stats-text'>📅 {formatDateLabel(selectedDate)} · 共 {activities.length} 项</Text>
      </View>

      {/* 活动列表 */}
      {activities.length === 0 ? (
        <View className='empty'>
          <Text className='empty-icon'>📭</Text>
          <Text className='empty-text'>当天没有安排活动</Text>
        </View>
      ) : (
        <View className='activity-list'>
          {/* 有时间的活动 */}
          {timedActivities.map((a) => {
            const log = logs[a.id]
            const status = log?.status || 'pending'
            const statusText = status === 'completed' ? '已审核' : status === 'pending_verification' ? '待审核' : status === 'rejected' ? '已拒绝' : '待打卡'
            const statusClass = status === 'completed' ? 'done' : status === 'pending_verification' ? 'pending' : status === 'rejected' ? 'rejected' : ''
            return (
              <View key={a.id} className={`activity-card ${statusClass}`}>
                <View className='activity-time'>
                  <Text className='time-text'>{a.scheduledTime}</Text>
                  {a.deadline && <Text className='deadline-text'>→{a.deadline}</Text>}
                </View>
                <View className='activity-info'>
                  <Text className='activity-title'>{a.title}</Text>
                  <Text className='activity-meta'>
                    {a.points}分{a.onTimeBonus > 0 && ` · 按时+${a.onTimeBonus}`} · {SCHEDULE_LABELS[a.scheduleType] || a.scheduleType}
                  </Text>
                </View>
                <Text className={`status-tag ${statusClass}`}>{statusText}</Text>
              </View>
            )
          })}

          {/* 无时间的活动 */}
          {untimedActivities.length > 0 && (
            <View className='untimed-section'>
              <Text className='untimed-title'>⏰ 未设定时间（{untimedActivities.length} 项）</Text>
              {untimedActivities.map((a) => {
                const log = logs[a.id]
                const status = log?.status || 'pending'
                const statusText = status === 'completed' ? '已审核' : status === 'pending_verification' ? '待审核' : status === 'rejected' ? '已拒绝' : '待打卡'
                return (
                  <View key={a.id} className='activity-card untimed'>
                    <View className='activity-info'>
                      <Text className='activity-title'>{a.title}</Text>
                      <Text className='activity-meta'>
                        {a.points}分 · {SCHEDULE_LABELS[a.scheduleType] || a.scheduleType}
                      </Text>
                    </View>
                    <Text className='status-tag'>{statusText}</Text>
                  </View>
                )
              })}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  )
}

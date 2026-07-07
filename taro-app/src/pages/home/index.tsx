import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getToken, getUser, getMembers, getTodayActivities, checkIn, getPending } from '@/services/api'
import './index.scss'

export default function Home() {
  const [members, setMembers] = useState<any[]>([])
  const [children, setChildren] = useState<any[]>([])
  const [selectedChildId, setSelectedChildId] = useState('')
  const [activities, setActivities] = useState<any[]>([])
  const [pending, setPending] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)

  const user = getUser()
  const isChild = user?.role === 'child'
  const isParent = user?.role === 'mom' || user?.role === 'dad'

  const childMember = isChild
    ? members.find((m) => m.id === user?.memberId)
    : children.find((m) => m.id === selectedChildId) || children[0]

  const loadAll = useCallback(async () => {
    if (!childMember) {
      setLoading(false)
      return
    }
    try {
      const [todayActs, pendingList] = await Promise.all([
        getTodayActivities(childMember.id),
        getPending(),
      ])
      setActivities(todayActs)
      setPending(pendingList)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [childMember])

  useEffect(() => {
    if (!getToken()) {
      Taro.reLaunch({ url: '/pages/login/index' })
      return
    }
    getMembers().then((list) => {
      setMembers(list)
      const kids = list.filter((m) => m.role === 'child')
      setChildren(kids)
      if (isChild && user?.memberId) {
        setSelectedChildId(user.memberId)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (childMember) {
      setLoading(true)
      loadAll()
    }
  }, [loadAll])

  const handleCheckIn = async (activityId: string) => {
    if (!childMember || !user) return
    setCompleting(activityId)
    try {
      const body: any = { activityId, memberId: childMember.id }
      if (isParent) body.operatorId = user.memberId
      await checkIn(activityId, childMember.id, isParent ? user.memberId : undefined)
      Taro.showToast({ title: '打卡成功，等待审核', icon: 'success' })
      await loadAll()
    } catch (e: any) {
      Taro.showToast({ title: e.message || '失败', icon: 'none' })
    } finally {
      setCompleting(null)
    }
  }

  if (loading) {
    return (
      <View className='loading'>
        <Text>加载中...</Text>
      </View>
    )
  }

  return (
    <ScrollView scrollY className='home-page'>
      {/* 欢迎卡片 */}
      <View className='welcome-card'>
        <View className='welcome-info'>
          <Text className='date'>{new Date().toLocaleDateString('zh-CN')}</Text>
          <Text className='name'>
            {childMember ? `${childMember.avatar} ${childMember.name}` : '未选择孩子'}
          </Text>
        </View>
        <View className='points'>
          <Text className='points-num'>{childMember?.totalPoints || 0}</Text>
          <Text className='points-label'>已审核积分</Text>
        </View>
      </View>

      {/* 孩子切换栏 */}
      {isParent && children.length > 1 && (
        <ScrollView scrollX className='child-switcher'>
          {children.map((c) => (
            <View
              key={c.id}
              className={`child-btn ${childMember?.id === c.id ? 'active' : ''}`}
              onClick={() => setSelectedChildId(c.id)}
            >
              <Text>{c.avatar} {c.name}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* 待审核面板 */}
      {isParent && pending.length > 0 && (
        <View className='pending-panel'>
          <Text className='panel-title'>待审核打卡 · {pending.length} 项</Text>
          {pending.map((p) => (
            <View key={p.id} className='pending-item'>
              <Text>{p.activity.title}</Text>
              <Text className='pending-name'>{p.member.avatar} {p.member.name}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 今日待办 */}
      <View className='todo-section'>
        <Text className='section-title'>
          今日待办 {isParent && '可代打卡'}
        </Text>
        {activities.length === 0 ? (
          <Text className='empty'>今天没有任务 🎉</Text>
        ) : (
          activities.map((a) => {
            const log = pending.find((p) => p.activityId === a.id)
            const isDone = !!log
            return (
              <View key={a.id} className={`todo-item ${isDone ? 'done' : ''}`}>
                <View className='todo-info'>
                  <Text className='todo-title'>{a.title}</Text>
                  <Text className='todo-meta'>
                    {a.scheduledTime} · {a.points}分
                    {a.onTimeBonus > 0 && ` · 按时+${a.onTimeBonus}`}
                  </Text>
                </View>
                {isDone ? (
                  <Text className='status-badge pending'>待审核</Text>
                ) : (
                  <Text
                    className={`checkin-btn ${completing === a.id ? 'loading' : ''}`}
                    onClick={() => handleCheckIn(a.id)}
                  >
                    {completing === a.id ? '...' : isParent ? '代打卡' : '打卡'}
                  </Text>
                )}
              </View>
            )
          })
        )}
      </View>
    </ScrollView>
  )
}

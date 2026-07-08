import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getToken, getUser, getMembers, getRewards, redeem, getRedemptions, resolveRedemption } from '@/services/api'
import './index.scss'

export default function Rewards() {
  const [members, setMembers] = useState<any[]>([])
  const [children, setChildren] = useState<any[]>([])
  const [selectedChildId, setSelectedChildId] = useState('')
  const [rewards, setRewards] = useState<any[]>([])
  const [redemptions, setRedemptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'shop' | 'records'>('shop')
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [resolving, setResolving] = useState<string | null>(null)

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
    try {
      const [r, red] = await Promise.all([getRewards(), getRedemptions()])
      setRewards(r)
      setRedemptions(red)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleRedeem = async (rewardId: string) => {
    if (!childMember) return
    setRedeeming(rewardId)
    try {
      await redeem(rewardId, childMember.id)
      Taro.showToast({ title: '兑换申请已提交', icon: 'success' })
      await loadData()
    } catch (e: any) {
      Taro.showToast({ title: e.message, icon: 'none' })
    } finally {
      setRedeeming(null)
    }
  }

  const handleResolve = async (redemptionId: string, status: 'approved' | 'rejected' | 'fulfilled') => {
    if (!user?.memberId) return
    setResolving(redemptionId)
    try {
      await resolveRedemption(redemptionId, status, user.memberId)
      Taro.showToast({ title: status === 'approved' ? '已通过' : status === 'rejected' ? '已拒绝' : '已兑现', icon: 'success' })
      await loadData()
    } catch (e: any) {
      Taro.showToast({ title: e.message, icon: 'none' })
    } finally {
      setResolving(null)
    }
  }

  if (loading) {
    return <View className='loading'><Text>加载中...</Text></View>
  }

  const STATUS_LABELS: Record<string, string> = {
    pending: '待审核', approved: '已通过', rejected: '已拒绝', fulfilled: '已兑现'
  }

  return (
    <ScrollView scrollY className='rewards-page'>
      {/* 积分卡片 */}
      <View className='points-card'>
        <View>
          <Text className='points-label'>{childMember?.name || ''} 的可兑换积分</Text>
          <Text className='points-num'>{childMember?.totalPoints || 0}</Text>
        </View>
        <Text className='gift-icon'>🎁</Text>
      </View>

      {/* 孩子切换 */}
      {isParent && children.length > 0 && (
        <ScrollView scrollX className='child-switcher'>
          {children.map((c) => (
            <Text
              key={c.id}
              className={`child-btn ${childMember?.id === c.id ? 'active' : ''}`}
              onClick={() => setSelectedChildId(c.id)}
            >{c.avatar} {c.name}</Text>
          ))}
        </ScrollView>
      )}

      {/* Tab 切换 */}
      <View className='tab-bar'>
        <Text className={`tab-btn ${tab === 'shop' ? 'active' : ''}`} onClick={() => setTab('shop')}>兑换商店</Text>
        <Text className={`tab-btn ${tab === 'records' ? 'active' : ''}`} onClick={() => setTab('records')}>
          审核记录{redemptions.filter((r) => r.status === 'pending').length > 0 && ` (${redemptions.filter((r) => r.status === 'pending').length})`}
        </Text>
      </View>

      {tab === 'shop' ? (
        <View className='reward-grid'>
          {rewards.length === 0 ? (
            <View className='empty'><Text>📭 还没有奖励</Text></View>
          ) : (
            rewards.map((r) => {
              const canAfford = (childMember?.totalPoints || 0) >= r.pointsCost
              return (
                <View key={r.id} className='reward-card'>
                  <Text className='reward-icon'>{r.icon}</Text>
                  <Text className='reward-title'>{r.title}</Text>
                  <Text className='reward-cost'>{r.pointsCost} 分</Text>
                  {!isParent && (
                    <Text
                      className={`redeem-btn ${!canAfford || redeeming === r.id ? 'disabled' : ''}`}
                      onClick={() => canAfford && handleRedeem(r.id)}
                    >
                      {redeeming === r.id ? '...' : canAfford ? '立即兑换' : '积分不足'}
                    </Text>
                  )}
                </View>
              )
            })
          )}
        </View>
      ) : (
        <View className='records-list'>
          {redemptions.length === 0 ? (
            <View className='empty'><Text>📭 还没有兑换记录</Text></View>
          ) : (
            redemptions.map((r) => (
              <View key={r.id} className='record-card'>
                <Text className='record-icon'>{r.reward.icon}</Text>
                <View className='record-info'>
                  <Text className='record-title'>{r.reward.title}</Text>
                  <Text className='record-meta'>
                    {r.member.avatar} {r.member.name} · {r.pointsSpent}分 · {STATUS_LABELS[r.status]}
                  </Text>
                </View>
                {isParent && r.status === 'pending' && (
                  <View className='record-actions'>
                    <Text className='action-btn approve' onClick={() => handleResolve(r.id, 'approved')}>通过</Text>
                    <Text className='action-btn reject' onClick={() => handleResolve(r.id, 'rejected')}>拒绝</Text>
                  </View>
                )}
                {isParent && r.status === 'approved' && (
                  <Text className='action-btn fulfill' onClick={() => handleResolve(r.id, 'fulfilled')}>标记已兑现</Text>
                )}
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  )
}

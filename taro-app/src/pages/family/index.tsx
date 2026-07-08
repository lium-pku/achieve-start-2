import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, Input, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import {
  getToken, getUser, getMembers, getPointTransactions, api
} from '@/services/api'
import './index.scss'

const ROLE_LABELS: Record<string, string> = {
  child: '孩子', mom: '妈妈', dad: '爸爸'
}

const TX_TYPE_LABELS: Record<string, string> = {
  earn: '完成', bonus: '奖励', penalty: '扣分', redeem: '兑换', adjust: '调整'
}

export default function Family() {
  const [members, setMembers] = useState<any[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('child')
  const [newAvatar, setNewAvatar] = useState('🧒')

  const user = getUser()
  const isParent = user?.role === 'mom' || user?.role === 'dad'

  useEffect(() => {
    if (!getToken()) {
      Taro.reLaunch({ url: '/pages/login/index' })
      return
    }
    loadMembers()
  }, [])

  const loadMembers = useCallback(async () => {
    try {
      const list = await getMembers()
      setMembers(list)
      if (!selectedMemberId && list.length > 0) {
        const child = list.find((m) => m.role === 'child') || list[0]
        setSelectedMemberId(child.id)
      }
    } catch (e) { console.error(e) }
  }, [selectedMemberId])

  const loadTransactions = useCallback(async () => {
    if (!selectedMemberId) return
    try {
      const txs = await getPointTransactions(selectedMemberId)
      setTransactions(txs)
    } catch (e) { console.error(e) }
  }, [selectedMemberId])

  useEffect(() => {
    if (selectedMemberId) {
      setLoading(true)
      loadTransactions()
    }
  }, [loadTransactions])

  useEffect(() => { setLoading(false) }, [transactions])

  const handleSwitchMember = async (m: any) => {
    setSelectedMemberId(m.id)
    if (user) {
      Taro.setStorageSync('currentMemberId', m.id)
    }
  }

  const handleAddMember = async () => {
    if (!isParent) {
      Taro.showToast({ title: '只有家长才能添加成员', icon: 'none' })
      return
    }
    if (!newName.trim()) {
      Taro.showToast({ title: '请填写姓名', icon: 'none' })
      return
    }
    try {
      const avatar = newRole === 'child' ? '🧒' : newRole === 'mom' ? '👩' : '👨'
      await api('/api/members', {
        method: 'POST',
        body: { name: newName.trim(), role: newRole, avatar },
      })
      Taro.showToast({ title: '已添加', icon: 'success' })
      setNewName('')
      setShowAddDialog(false)
      loadMembers()
    } catch (e: any) {
      Taro.showToast({ title: e.message, icon: 'none' })
    }
  }

  const selectedMember = members.find((m) => m.id === selectedMemberId)

  if (loading) {
    return <View className='loading'><Text>加载中...</Text></View>
  }

  return (
    <ScrollView scrollY className='family-page'>
      <View className='family-header'>
        <Text className='page-title'>家庭</Text>
        {isParent && (
          <Text className='add-member-btn' onClick={() => setShowAddDialog(true)}>+ 添加成员</Text>
        )}
      </View>

      {/* 成员列表 */}
      <View className='member-list'>
        {members.map((m) => (
          <View
            key={m.id}
            className={`member-card ${m.id === selectedMemberId ? 'active' : ''}`}
            onClick={() => handleSwitchMember(m)}
          >
            <Text className='member-avatar'>{m.avatar}</Text>
            <View className='member-info'>
              <Text className='member-name'>{m.name}</Text>
              <Text className='member-role'>{ROLE_LABELS[m.role]}</Text>
            </View>
            <Text className='member-points'>{m.totalPoints} 分</Text>
          </View>
        ))}
      </View>

      {/* 积分流水 */}
      <View className='transactions-section'>
        <Text className='section-title'>
          {selectedMember?.name} 的积分流水
        </Text>
        {transactions.length === 0 ? (
          <View className='empty'><Text>📊 还没有积分记录</Text></View>
        ) : (
          <View className='transaction-list'>
            {transactions.map((tx) => {
              const positive = tx.amount >= 0
              return (
                <View key={tx.id} className='transaction-item'>
                  <View className={`tx-icon ${positive ? 'positive' : 'negative'}`}>
                    <Text>{positive ? '📈' : '📉'}</Text>
                  </View>
                  <View className='tx-info'>
                    <Text className='tx-reason'>{tx.reason}</Text>
                    <Text className='tx-meta'>
                      {TX_TYPE_LABELS[tx.type] || tx.type} · {new Date(tx.createdAt).toLocaleDateString('zh-CN')}
                    </Text>
                  </View>
                  <Text className={`tx-amount ${positive ? 'positive' : 'negative'}`}>
                    {positive ? '+' : ''}{tx.amount}
                  </Text>
                </View>
              )
            })}
          </View>
        )}
      </View>

      {/* 使用说明 */}
      <View className='usage-info'>
        <Text className='info-title'>💡 使用说明</Text>
        <Text className='info-text'>· 爸爸妈妈可以新建/编辑/删除活动与奖励</Text>
        <Text className='info-text'>· 孩子可以打卡完成任务、兑换奖励</Text>
        <Text className='info-text'>· 按时完成可获得额外奖励积分</Text>
        <Text className='info-text'>· 兑换奖励需家长审核通过后才生效</Text>
      </View>

      {/* 添加成员弹窗 */}
      {showAddDialog && (
        <View className='dialog-mask' onClick={() => setShowAddDialog(false)}>
          <View className='dialog-content' onClick={(e) => e.stopPropagation()}>
            <Text className='dialog-title'>添加家庭成员</Text>
            <View className='dialog-field'>
              <Text className='field-label'>姓名</Text>
              <Input
                className='field-input'
                value={newName}
                onInput={(e) => setNewName(e.detail.value)}
                placeholder='例如：小明'
              />
            </View>
            <View className='dialog-field'>
              <Text className='field-label'>角色</Text>
              <Picker
                mode='selector'
                range={['孩子', '妈妈', '爸爸']}
                value={['child', 'mom', 'dad'].indexOf(newRole)}
                onChange={(e) => setNewRole(['child', 'mom', 'dad'][e.detail.value])}
              >
                <Text className='picker-value'>{ROLE_LABELS[newRole]}</Text>
              </Picker>
            </View>
            <View className='dialog-actions'>
              <Text className='dialog-btn cancel' onClick={() => setShowAddDialog(false)}>取消</Text>
              <Text className='dialog-btn confirm' onClick={handleAddMember}>保存</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  )
}

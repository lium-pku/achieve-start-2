import { useState } from 'react'
import { View, Text, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { login } from '@/services/api'
import './index.scss'

const QUICK_CODES = [
  { code: 'test-mom', label: '妈妈', avatar: '👩' },
  { code: 'test-dad', label: '爸爸', avatar: '👨' },
  { code: 'test-child', label: '孩子', avatar: '🧒' },
]

export default function Login() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (loginCode?: string) => {
    const finalCode = loginCode || code
    if (!finalCode.trim()) {
      Taro.showToast({ title: '请输入登录码', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      await login(finalCode)
      Taro.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/home/index' })
      }, 500)
    } catch (e: any) {
      Taro.showToast({ title: e.message || '登录失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='login-page'>
      <View className='logo-section'>
        <Text className='logo'>⏰</Text>
        <Text className='title'>时间小达人</Text>
        <Text className='subtitle'>小学生时间管理</Text>
      </View>

      <View className='quick-login'>
        <Text className='section-label'>快速登录（测试）</Text>
        <View className='quick-buttons'>
          {QUICK_CODES.map((c) => (
            <Button
              key={c.code}
              disabled={loading}
              onClick={() => handleLogin(c.code)}
              className='quick-btn'
            >
              <Text className='quick-avatar'>{c.avatar}</Text>
              <Text className='quick-label'>{c.label}</Text>
            </Button>
          ))}
        </View>
      </View>

      <View className='manual-login'>
        <Text className='section-label'>或输入登录码</Text>
        <Input
          className='code-input'
          value={code}
          onInput={(e) => setCode(e.detail.value)}
          placeholder='例如：test-mom'
          onConfirm={() => handleLogin()}
        />
        <Button
          className='login-btn'
          disabled={loading || !code.trim()}
          onClick={() => handleLogin()}
        >
          {loading ? '登录中...' : '登录'}
        </Button>
      </View>

      <Text className='hint'>首次登录会自动创建一个家庭</Text>
    </View>
  )
}

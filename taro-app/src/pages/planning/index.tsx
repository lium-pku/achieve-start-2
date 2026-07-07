import { View, Text } from '@tarojs/components'
import { getToken } from '@/services/api'
import Taro from '@tarojs/taro'
import { useEffect } from 'react'

export default function Page() {
  useEffect(() => {
    if (!getToken()) {
      Taro.reLaunch({ url: '/pages/login/index' })
    }
  }, [])
  return (
    <View style={{ padding: '20px', textAlign: 'center' }}>
      <Text>页面开发中...</Text>
    </View>
  )
}

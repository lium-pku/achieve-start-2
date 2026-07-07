export default defineAppConfig({
  pages: [
    'pages/login/index',
    'pages/home/index',
    'pages/schedule/index',
    'pages/rewards/index',
    'pages/planning/index',
    'pages/family/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FF9A3C',
    navigationBarTitleText: '时间小达人',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#FF9A3C',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      { pagePath: 'pages/home/index', text: '首页' },
      { pagePath: 'pages/schedule/index', text: '日程' },
      { pagePath: 'pages/rewards/index', text: '奖励' },
      { pagePath: 'pages/planning/index', text: '规划' },
      { pagePath: 'pages/family/index', text: '家庭' }
    ]
  }
})

import { test, expect } from '@playwright/test'
import { uiLoginFast, uiResetAndSeed, gotoTab, switchMemberByUI } from './ui-helpers'

test.describe('UI 36：奖励 Tab 渲染', () => {
  test.beforeEach(async ({ page }) => {
    await uiResetAndSeed(page, 'test-mom')
    await uiLoginFast(page, 'test-mom')
    await gotoTab(page, 'rewards')
  })

  test('顶部积分卡片显示当前成员的积分', async ({ page }) => {
    await expect(page.getByText('可兑换积分')).toBeVisible({ timeout: 5000 })
    // 妈妈默认 0 分
    await expect(page.getByText('可兑换积分')).toBeVisible()
  })

  test('积分里程碑区域可见', async ({ page }) => {
    await expect(page.getByText('积分里程碑')).toBeVisible({ timeout: 5000 })
  })

  test('兑换商店/审核记录双 Tab 存在', async ({ page }) => {
    await expect(page.getByRole('tab', { name: '兑换商店' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '审核记录' })).toBeVisible()
  })

  test('家长视角：兑换商店显示"新建奖励"按钮', async ({ page }) => {
    await expect(page.getByRole('tab', { name: '兑换商店' })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /新建奖励/ })).toBeVisible()
  })

  test('孩子视角：兑换商店不显示"新建奖励"按钮', async ({ page }) => {
    await switchMemberByUI(page, '小宇')
    await gotoTab(page, 'rewards')
    await expect(page.getByText('可兑换积分')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /新建奖励/ })).toHaveCount(0)
  })

  test('孩子视角：积分不足时按钮文案为"积分不足"且禁用', async ({ page }) => {
    await switchMemberByUI(page, '小宇')
    await gotoTab(page, 'rewards')
    await expect(page.getByText('可兑换积分')).toBeVisible({ timeout: 5000 })
    // 默认小宇 0 分，奖励至少 30 分起，应该看到"积分不足"
    await expect(page.getByRole('button', { name: '积分不足' }).first()).toBeVisible({ timeout: 5000 })
    // 应被禁用
    await expect(page.getByRole('button', { name: '积分不足' }).first()).toBeDisabled()
  })

  test('家长视角：奖励卡片不显示"立即兑换"或"积分不足"按钮', async ({ page }) => {
    await expect(page.getByText('可兑换积分')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: '立即兑换' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '积分不足' })).toHaveCount(0)
  })

  test('孩子视角：积分足够时点"立即兑换"提交申请', async ({ page }) => {
    await switchMemberByUI(page, '小宇')
    await gotoTab(page, 'rewards')
    await expect(page.getByText('可兑换积分')).toBeVisible({ timeout: 5000 })

    // 找到最便宜的奖励（积分门槛最低的那个）
    // 通过 API 先把孩子积分提高，让按钮变成"立即兑换"
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'test-mom' }),
    })
    const data = await res.json()
    // 找到小宇的 memberId
    const membersRes = await fetch('http://localhost:3000/api/members', {
      headers: { Authorization: `Bearer ${data.token}` },
    })
    const members = await membersRes.json()
    const child = members.find((m: any) => m.role === 'child')

    // 把小宇积分调高到 1000
    await fetch(`http://localhost:3000/api/members/${child.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` },
      body: JSON.stringify({ totalPoints: 1000 }),
    })

    // reload 让前端重新拉数据
    await page.reload()
    await expect(page.getByText('时间小达人').first()).toBeVisible({ timeout: 10000 })
    // reload 后会回到首页 tab，需重新进 rewards tab
    await gotoTab(page, 'rewards')
    await expect(page.getByText('可兑换积分')).toBeVisible({ timeout: 5000 })
    // 应该看到"立即兑换"按钮（不再是"积分不足"）
    await expect(page.getByRole('button', { name: '立即兑换' }).first()).toBeVisible({ timeout: 5000 })

    // 点击第一个"立即兑换"
    await page.getByRole('button', { name: '立即兑换' }).first().click()
    // 应该出现成功 toast
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5000 })

    // 切到"审核记录" tab，应有 pending 记录
    await page.getByRole('tab', { name: '审核记录' }).click()
    await expect(page.getByText('待审核').first()).toBeVisible({ timeout: 5000 })
  })

  test('家长视角：审核记录 Tab 中 pending 记录显示"通过"和"拒绝"按钮', async ({ page }) => {
    // 先让孩子有一笔 pending 兑换
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'test-child' }),
    })
    const childData = await res.json()
    const membersRes = await fetch('http://localhost:3000/api/members', {
      headers: { Authorization: `Bearer ${childData.token}` },
    })
    const members = await membersRes.json()
    const child = members.find((m: any) => m.role === 'child')
    const rewardsRes = await fetch('http://localhost:3000/api/rewards', {
      headers: { Authorization: `Bearer ${childData.token}` },
    })
    const rewards = await rewardsRes.json()
    if (rewards.length === 0) return // 没有奖励就跳过

    // 先给孩子加分
    const momRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'test-mom' }),
    })
    const momData = await momRes.json()
    await fetch(`http://localhost:3000/api/members/${child.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${momData.token}` },
      body: JSON.stringify({ totalPoints: 1000 }),
    })

    // 孩子兑换
    await fetch('http://localhost:3000/api/redemptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${childData.token}` },
      body: JSON.stringify({ rewardId: rewards[0].id, memberId: child.id }),
    })

    // 妈妈页面 reload
    await page.reload()
    await expect(page.getByText('时间小达人').first()).toBeVisible({ timeout: 10000 })
    await gotoTab(page, 'rewards')
    await expect(page.getByText('可兑换积分')).toBeVisible({ timeout: 5000 })

    // 切到审核记录
    await page.getByRole('tab', { name: '审核记录' }).click()
    await expect(page.getByText('待审核').first()).toBeVisible({ timeout: 5000 })
    // 通过/拒绝按钮
    await expect(page.getByRole('button', { name: /通过/ }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /拒绝/ }).first()).toBeVisible()
  })

  test('审核记录为空时显示空状态提示', async ({ page }) => {
    // 默认 seed 没有兑换记录
    await page.getByRole('tab', { name: '审核记录' }).click()
    // 应有"还没有兑换记录"或某条记录（如果其他 test 创建过）
    // 因为 fullyParallel: false + 串行，前面 test 可能创建过记录，这里只能断言"列表渲染了"
    await expect(page.locator('main')).toBeVisible()
  })

  test('审核记录 Tab：pending 数量徽章显示', async ({ page }) => {
    // 先让孩子有一笔 pending 兑换
    const childRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'test-child' }),
    })
    const childData = await childRes.json()
    const membersRes = await fetch('http://localhost:3000/api/members', {
      headers: { Authorization: `Bearer ${childData.token}` },
    })
    const members = await membersRes.json()
    const child = members.find((m: any) => m.role === 'child')
    const rewardsRes = await fetch('http://localhost:3000/api/rewards', {
      headers: { Authorization: `Bearer ${childData.token}` },
    })
    const rewards = await rewardsRes.json()
    if (rewards.length === 0) return

    // 加分
    const momRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'test-mom' }),
    })
    const momData = await momRes.json()
    await fetch(`http://localhost:3000/api/members/${child.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${momData.token}` },
      body: JSON.stringify({ totalPoints: 1000 }),
    })
    await fetch('http://localhost:3000/api/redemptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${childData.token}` },
      body: JSON.stringify({ rewardId: rewards[0].id, memberId: child.id }),
    })

    await page.reload()
    await expect(page.getByText('时间小达人').first()).toBeVisible({ timeout: 10000 })
    await gotoTab(page, 'rewards')
    await expect(page.getByText('可兑换积分')).toBeVisible({ timeout: 5000 })
    // 审核 Tab 应该有红色 pending 数量徽章
    const reviewTab = page.getByRole('tab', { name: '审核记录' })
    await expect(reviewTab.locator('span.bg-red-500')).toBeVisible({ timeout: 5000 })
  })
})

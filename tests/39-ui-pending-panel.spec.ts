import { test, expect } from '@playwright/test'
import { uiLoginFast, uiResetAndSeed, gotoTab, switchMemberByUI } from './ui-helpers'

test.describe('UI 39：待审核面板（PendingVerificationPanel）', () => {
  test.beforeEach(async ({ page }) => {
    await uiResetAndSeed(page, 'test-mom')
    await uiLoginFast(page, 'test-mom')
  })

  test('空状态：显示"暂无待审核记录"提示', async ({ page }) => {
    // 默认 seed 后无 pending 记录
    await expect(page.getByText('待审核打卡')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('暂无待审核记录')).toBeVisible()
    await expect(page.getByText(/孩子打卡后，会在这里等待你的审核/)).toBeVisible()
  })

  test('孩子视角：完全看不到待审核面板', async ({ page }) => {
    await switchMemberByUI(page, '小宇')
    await expect(page.getByText('今日待办')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('待审核打卡')).toHaveCount(0)
    await expect(page.getByText('暂无待审核记录')).toHaveCount(0)
  })

  test('孩子打卡后，家长面板出现 1 条 pending 记录', async ({ page }) => {
    // 用孩子身份打卡一次（走 API）
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

    // 找今日活动
    const actsRes = await fetch(`http://localhost:3000/api/activities?today=1&assignedToId=${child.id}`, {
      headers: { Authorization: `Bearer ${childData.token}` },
    })
    const acts = await actsRes.json()
    expect(acts.length).toBeGreaterThan(0)

    // 打卡
    await fetch('http://localhost:3000/api/activities/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${childData.token}` },
      body: JSON.stringify({ activityId: acts[0].id, memberId: child.id }),
    })

    // 切回家长页面 reload
    await page.reload()
    await expect(page.getByText('今日待办')).toBeVisible({ timeout: 8000 })

    // 待审核面板应显示 "1 项"
    await expect(page.getByText(/待审核打卡 · 1 项/)).toBeVisible({ timeout: 5000 })
    // 应有"全部通过"按钮
    await expect(page.getByRole('button', { name: /全部通过/ })).toBeVisible()
    // 应有"拒绝选中"按钮（默认禁用，因为没选）
    await expect(page.getByRole('button', { name: /拒绝选中/ })).toBeVisible()
  })

  test('家长点"全部通过"，pending 列表清空', async ({ page }) => {
    // 先让孩子打卡
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
    const actsRes = await fetch(`http://localhost:3000/api/activities?today=1&assignedToId=${child.id}`, {
      headers: { Authorization: `Bearer ${childData.token}` },
    })
    const acts = await actsRes.json()
    await fetch('http://localhost:3000/api/activities/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${childData.token}` },
      body: JSON.stringify({ activityId: acts[0].id, memberId: child.id }),
    })

    await page.reload()
    await expect(page.getByText(/待审核打卡 · 1 项/)).toBeVisible({ timeout: 8000 })

    // 点"全部通过"
    await page.getByRole('button', { name: /全部通过/ }).click()
    // 应出现成功 toast
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5000 })

    // pending 列表应清空回到"暂无待审核记录"
    await expect(page.getByText('暂无待审核记录')).toBeVisible({ timeout: 5000 })
  })

  test('家长勾选单条记录后，"通过选中(N)"和"拒绝选中(N)"按钮显示数字', async ({ page }) => {
    // 让孩子打卡一次
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
    const actsRes = await fetch(`http://localhost:3000/api/activities?today=1&assignedToId=${child.id}`, {
      headers: { Authorization: `Bearer ${childData.token}` },
    })
    const acts = await actsRes.json()
    await fetch('http://localhost:3000/api/activities/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${childData.token}` },
      body: JSON.stringify({ activityId: acts[0].id, memberId: child.id }),
    })

    await page.reload()
    await expect(page.getByText(/待审核打卡 · 1 项/)).toBeVisible({ timeout: 8000 })

    // 找到列表中第一个 checkbox 并勾选（不要点"全选"）
    // checkbox 是 [role="checkbox"]
    const itemCheckboxes = page.locator('[role="checkbox"]').filter({ hasNot: page.getByText('全选') })
    // 第二个开始（第一个是"全选"），取第一个 item checkbox
    const itemCheckbox = itemCheckboxes.nth(1)
    await itemCheckbox.click()

    // 按钮文案应变成"通过选中(1)"和"拒绝选中(1)"
    await expect(page.getByRole('button', { name: /通过选中\(1\)/ })).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('button', { name: /拒绝选中\(1\)/ })).toBeVisible({ timeout: 3000 })
  })
})

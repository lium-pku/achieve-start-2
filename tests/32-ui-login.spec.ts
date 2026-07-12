import { test, expect } from '@playwright/test'
import { uiLoginByClick, uiResetAndSeed } from './ui-helpers'

test.describe('UI 32：登录页交互', () => {
  test.beforeAll(async ({ browser }) => {
    // seed 一次保证账号存在（首次访问会自动创建，但提前 seed 保证数据干净）
    const page = await browser.newPage()
    await uiResetAndSeed(page, 'test-mom')
    await page.close()
  })

  test('未登录时显示登录页，含 3 个快速登录按钮', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await expect(page.getByText('时间小达人').first()).toBeVisible()
    await expect(page.getByText('小学生时间管理').first()).toBeVisible()
    // 3 个快速登录按钮：妈妈 / 爸爸 / 孩子
    await expect(page.getByRole('button', { name: '妈妈' })).toBeVisible()
    await expect(page.getByRole('button', { name: '爸爸' })).toBeVisible()
    await expect(page.getByRole('button', { name: '孩子' })).toBeVisible()
  })

  test('点击"妈妈"快速登录按钮，进入主页', async ({ page }) => {
    await uiLoginByClick(page, 'test-mom')
    // 进入主页：底部导航 5 个 Tab 可见
    await expect(page.locator('nav button', { hasText: '首页' })).toBeVisible()
    await expect(page.locator('nav button', { hasText: '日程' })).toBeVisible()
    await expect(page.locator('nav button', { hasText: '奖励' })).toBeVisible()
    await expect(page.locator('nav button', { hasText: '规划' })).toBeVisible()
    await expect(page.locator('nav button', { hasText: '家庭' })).toBeVisible()
  })

  test('点击"孩子"快速登录按钮，进入主页（孩子视角）', async ({ page }) => {
    await uiLoginByClick(page, 'test-child')
    // 顶部应显示孩子相关内容（home tab 默认展示）
    // 验证加载成功：能看到"今日待办"标题
    await expect(page.getByText('今日待办')).toBeVisible({ timeout: 8000 })
  })

  test('输入登录码后回车也能登录', async ({ page }) => {
    await page.goto('http://localhost:3000')
    const input = page.locator('input[placeholder="例如：test-mom"]')
    await input.fill('test-dad')
    await input.press('Enter')
    // 应进入主页
    await expect(page.locator('nav button', { hasText: '首页' })).toBeVisible({ timeout: 8000 })
  })

  test('输入不存在的登录码，提示错误', async ({ page }) => {
    await page.goto('http://localhost:3000')
    const input = page.locator('input[placeholder="例如：test-mom"]')
    await input.fill('nonexistent-user-xyz')
    await input.press('Enter')
    // sonner toast 错误提示出现
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5000 })
  })

  test('空登录码点登录，提示"请输入登录码"', async ({ page }) => {
    await page.goto('http://localhost:3000')
    // 登录按钮应禁用（!code.trim() 时 disabled）
    const loginBtn = page.getByRole('button', { name: '登录', exact: true })
    await expect(loginBtn).toBeDisabled()
  })
})

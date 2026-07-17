import { test, expect } from '@playwright/test'
import { uiLoginFast, uiResetAndSeed, gotoTab, switchMemberByUI } from './ui-helpers'

test.describe('UI 41：Dialog 表单交互', () => {
  test.beforeEach(async ({ page }) => {
    await uiResetAndSeed(page, 'test-mom')
    await uiLoginFast(page, 'test-mom')
  })

  // === 活动对话框 ===
  test.describe('活动对话框', () => {
    test.beforeEach(async ({ page }) => {
      await gotoTab(page, 'schedule')
      await page.getByRole('button', { name: /新建/ }).click()
      await expect(page.getByText('新建活动')).toBeVisible({ timeout: 3000 })
    })

    test('打开后默认有"活动名称"输入框和"保存"按钮', async ({ page }) => {
      await expect(page.getByText('活动名称 *')).toBeVisible()
      await expect(page.getByPlaceholder('例如：阅读 20 分钟')).toBeVisible()
      await expect(page.getByRole('button', { name: '保存' })).toBeVisible()
      await expect(page.getByRole('button', { name: '取消' })).toBeVisible()
    })

    test('未填名称点保存，提示"请填写活动名称"', async ({ page }) => {
      await page.getByRole('button', { name: '保存' }).click()
      await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 })
      // 对话框不应关闭
      await expect(page.getByText('新建活动')).toBeVisible()
    })

    test('填写完整信息点保存，创建成功并关闭对话框', async ({ page }) => {
      await page.getByPlaceholder('例如：阅读 20 分钟').fill('测试活动-自动化')
      await page.getByRole('button', { name: '保存' }).click()
      // 应出现成功 toast
      await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 })
      // 对话框应关闭
      await expect(page.getByText('新建活动')).toHaveCount(0)
    })

    test('点取消按钮关闭对话框，不创建活动', async ({ page }) => {
      await page.getByPlaceholder('例如：阅读 20 分钟').fill('不应该被创建的活动')
      await page.getByRole('button', { name: '取消' }).click()
      await expect(page.getByText('新建活动')).toHaveCount(0)
    })

    test('切换活动类型为 weekly，应显示周几选择器', async ({ page }) => {
      // 点击 scheduleType select（用 select trigger）
      await page.locator('button[role="combobox"]').first().click()
      await page.getByText('周度').click()
      // 应出现"星期几"选择
      await expect(page.getByText('星期几')).toBeVisible()
    })

    test('切换活动类型为 monthly，应显示日期选择器', async ({ page }) => {
      await page.locator('button[role="combobox"]').first().click()
      await page.getByText('月度').click()
      await expect(page.getByText('每月几号')).toBeVisible()
    })

    test('切换活动类型为 once，应显示具体日期选择器', async ({ page }) => {
      await page.locator('button[role="combobox"]').first().click()
      await page.getByText('临时').click()
      await expect(page.getByText('具体日期')).toBeVisible()
    })

    test('可修改积分和按时加分', async ({ page }) => {
      await page.getByPlaceholder('例如：阅读 20 分钟').fill('积分测试活动')
      // 积分输入框（type=number）
      const pointsInput = page.locator('input[type="number"]').first()
      await pointsInput.fill('5')
      // 按时加分输入框
      const bonusInput = page.locator('input[type="number"]').nth(1)
      await bonusInput.fill('3')
      await page.getByRole('button', { name: '保存' }).click()
      await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 })
    })
  })

  test.describe('活动编辑对话框', () => {
    test('编辑时表单预填已有数据', async ({ page }) => {
      await gotoTab(page, 'schedule')
      // 切换到列表视图
      await page.getByText('列表', { exact: true }).click()
      await expect(page.getByText('起床洗漱').first()).toBeVisible({ timeout: 5000 })
      // 点击第一个编辑按钮
      await page.locator('button:has(svg.lucide-pencil)').first().click()
      // 对话框标题应为"编辑活动"
      await expect(page.getByText('编辑活动')).toBeVisible({ timeout: 3000 })
      // 名称输入框应预填活动名称
      const nameInput = page.getByPlaceholder('例如：阅读 20 分钟')
      await expect(nameInput).not.toHaveValue('')
    })
  })

  // === 奖励对话框 ===
  test.describe('奖励对话框', () => {
    test.beforeEach(async ({ page }) => {
      await gotoTab(page, 'rewards')
      await page.getByRole('button', { name: /新建奖励/ }).click()
      await expect(page.getByText('新建奖励')).toBeVisible({ timeout: 3000 })
    })

    test('打开后显示奖励名称、图标、积分输入', async ({ page }) => {
      await expect(page.getByText('奖励名称 *')).toBeVisible()
      await expect(page.getByPlaceholder('例如：看 30 分钟动画片')).toBeVisible()
      await expect(page.getByText('图标')).toBeVisible()
      await expect(page.getByText('所需积分')).toBeVisible()
    })

    test('未填名称点保存，提示错误', async ({ page }) => {
      await page.getByRole('button', { name: '保存' }).click()
      await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 })
      await expect(page.getByText('新建奖励')).toBeVisible()
    })

    test('选择图标，填写名称和积分，保存成功', async ({ page }) => {
      await page.getByPlaceholder('例如：看 30 分钟动画片').fill('测试奖励-自动化')
      // 选择第二个图标
      await page.locator('button:has-text("📺")').click()
      // 修改积分
      await page.locator('input[type="number"]').fill('50')
      await page.getByRole('button', { name: '保存' }).click()
      await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 })
      await expect(page.getByText('新建奖励')).toHaveCount(0)
    })

    test('图标选择有视觉反馈（选中边框）', async ({ page }) => {
      const firstIcon = page.locator('button.aspect-square').first()
      await firstIcon.click()
      // 选中后应有 border-primary class
      await expect(firstIcon).toHaveClass(/border-primary/)
    })

    test('点取消关闭对话框', async ({ page }) => {
      await page.getByRole('button', { name: '取消' }).click()
      await expect(page.getByText('新建奖励')).toHaveCount(0)
    })
  })

  // === 成员对话框 ===
  test.describe('成员对话框', () => {
    test.beforeEach(async ({ page }) => {
      await gotoTab(page, 'family')
      await page.getByRole('button', { name: /添加成员/ }).click()
      await expect(page.getByText('添加家庭成员')).toBeVisible({ timeout: 3000 })
    })

    test('打开后显示姓名、角色、头像、主题色', async ({ page }) => {
      await expect(page.getByText('姓名 *')).toBeVisible()
      await expect(page.getByText('角色')).toBeVisible()
      await expect(page.getByText('头像')).toBeVisible()
      await expect(page.getByText('主题色')).toBeVisible()
    })

    test('未填姓名点保存，提示错误', async ({ page }) => {
      await page.getByRole('button', { name: '保存' }).click()
      await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 })
    })

    test('填写姓名并选头像/颜色，保存成功', async ({ page }) => {
      await page.getByPlaceholder('例如：小明').fill('测试成员-自动化')
      // 选第二个头像
      await page.locator('button.aspect-square').nth(1).click()
      // 选第二个颜色
      await page.locator('button.rounded-full').nth(1).click()
      await page.getByRole('button', { name: '保存' }).click()
      await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 })
      await expect(page.getByText('添加家庭成员')).toHaveCount(0)
    })

    test('实时预览：填写姓名后预览区显示该名字', async ({ page }) => {
      await page.getByPlaceholder('例如：小明').fill('预览测试名')
      // 预览区应显示该名字
      await expect(page.getByText('预览测试名')).toBeVisible()
    })

    test('编辑模式下角色选择器不显示（角色不可改）', async ({ page }) => {
      // 先关闭添加对话框
      await page.getByRole('button', { name: '取消' }).click()
      // 点编辑按钮
      await page.locator('button:has(svg.lucide-pencil)').first().click()
      await expect(page.getByText('编辑成员')).toBeVisible({ timeout: 3000 })
      // 编辑模式下不应有角色选择
      await expect(page.getByText('角色', { exact: true })).toHaveCount(0)
    })
  })

  // === 目标对话框 ===
  test.describe('目标对话框', () => {
    test.beforeEach(async ({ page }) => {
      await gotoTab(page, 'planning')
      // 默认在目标子页，点新建目标按钮
      // 按钮可能叫"新建目标"或带 + 图标
      const newBtn = page.getByRole('button', { name: /新建目标|新建/ }).first()
      await newBtn.click()
      await expect(page.getByText('新建目标')).toBeVisible({ timeout: 3000 })
    })

    test('打开后显示标题、描述、状态、截止日期、归属成员', async ({ page }) => {
      await expect(page.getByText('目标标题 *')).toBeVisible()
      await expect(page.getByText('目标描述（可选）')).toBeVisible()
      await expect(page.getByText('完成状态')).toBeVisible()
      await expect(page.getByText('截止日期（可选）')).toBeVisible()
      await expect(page.getByText('归属成员 *')).toBeVisible()
    })

    test('未填标题点保存，提示错误', async ({ page }) => {
      await page.getByRole('button', { name: '保存' }).click()
      await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 })
    })

    test('填写标题并选成员，保存成功', async ({ page }) => {
      await page.getByPlaceholder('例如：本学期数学成绩进入班级前 5').fill('测试目标-自动化')
      await page.getByRole('button', { name: '保存' }).click()
      await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 })
      await expect(page.getByText('新建目标')).toHaveCount(0)
    })

    test('可切换完成状态（未开始/进行中/已达成）', async ({ page }) => {
      // 点击状态 select
      const statusSelect = page.locator('button[role="combobox"]').first()
      await statusSelect.click()
      // 应显示三个选项
      await expect(page.getByText('进行中')).toBeVisible()
      await expect(page.getByText('已达成')).toBeVisible()
    })
  })

  // === 鼓励里程碑对话框 ===
  test.describe('鼓励里程碑对话框', () => {
    test.beforeEach(async ({ page }) => {
      await gotoTab(page, 'rewards')
      // 在积分里程碑区域点"添加"按钮
      await page.getByRole('button', { name: /添加/ }).first().click()
      await expect(page.getByText('新建鼓励里程碑')).toBeVisible({ timeout: 3000 })
    })

    test('打开后显示阈值、标题、鼓励语、图标', async ({ page }) => {
      await expect(page.getByText('阈值（积分）')).toBeVisible()
      await expect(page.getByText('标题')).toBeVisible()
      await expect(page.getByText('鼓励语')).toBeVisible()
      await expect(page.getByText('图标')).toBeVisible()
    })

    test('未填标题/鼓励语点保存，提示错误', async ({ page }) => {
      await page.getByRole('button', { name: '保存' }).click()
      await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 })
    })

    test('填写完整保存成功', async ({ page }) => {
      // 阈值默认 20，标题和鼓励语需填
      await page.getByPlaceholder('例如：小达人').fill('测试里程碑-自动化')
      await page.getByPlaceholder('例如：继续保持，加油！').fill('测试鼓励语')
      await page.getByRole('button', { name: '保存' }).click()
      await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 })
      await expect(page.getByText('新建鼓励里程碑')).toHaveCount(0)
    })

    test('阈值为 0 或负数点保存，提示错误', async ({ page }) => {
      await page.getByPlaceholder('例如：小达人').fill('阈值测试')
      await page.getByPlaceholder('例如：继续保持，加油！').fill('鼓励语')
      // 阈值输入框（第一个 number input）
      await page.locator('input[type="number"]').fill('0')
      await page.getByRole('button', { name: '保存' }).click()
      await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 })
      await expect(page.getByText('新建鼓励里程碑')).toBeVisible()
    })
  })
})

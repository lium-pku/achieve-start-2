---
Task ID: UI-TESTS-1
Agent: main
Task: 加入 Playwright UI 测试，并基于"测试疏漏"教训补充 agent 开发规则

Work Log:
- 探索 tests/ 目录：发现 31 个 spec 全部是 API 测试（fetch 调用），0 个 UI 测试
- 探索 src/components/ 下所有组件（app-shell、5 个 tab、5 个 dialog、member-switcher、pending-verification-panel），梳理每个组件需要 UI 覆盖的渲染分支
- 创建 tests/ui-helpers.ts：提供 uiLoginFast / uiLoginByClick / gotoTab / switchMemberByUI / uiResetAndSeed 等 UI 层 helper
- 关键决策：不用 page.addInitScript（会污染后续 goto，导致"未登录"测试无法回到登录页），改用 goto + evaluate + reload 模式
- 创建 8 个 UI 测试 spec：
  - 32-ui-login.spec.ts（6 tests）：登录页交互、3 个快速按钮、回车登录、错误码、空码禁用
  - 33-ui-shell-nav.spec.ts（10 tests）：5 个 Tab 切换、MemberSwitcher、家长/孩子角色 UI 差异
  - 34-ui-home-tab.spec.ts（15 tests）：欢迎卡、统计数字、活动状态 Badge、打卡/代打卡流程、孩子切换胶囊、可代打卡徽章、积分里程碑
  - 35-ui-schedule-tab.spec.ts（11 tests）：网格/列表切换、daily/weekly/monthly 子 Tab、编辑/删除按钮角色权限、新建对话框、删除确认
  - 36-ui-rewards-tab.spec.ts（11 tests）：积分卡片、兑换商店/审核记录 Tab、积分不足/立即兑换按钮、pending 数量徽章、家长审核按钮
  - 37-ui-family-tab.spec.ts（11 tests）：4 个成员卡片、当前徽章、积分流水、使用说明、添加/编辑成员对话框
  - 38-ui-planning-tab.spec.ts（8 tests）：3 个子 Tab 切换、目标列表、状态徽章、孩子角色不能新建目标
  - 39-ui-pending-panel.spec.ts（5 tests）：空状态、孩子不可见、家长通过/拒绝流程、勾选计数
- 修复迭代中发现的 locator 问题：
  - "已审核"既出现在"已审核积分"也出现在统计卡片 → 用 { exact: true }
  - "点评"父 Tab 匹配到"周报点评"子 Tab → 用 { exact: true }
  - div filter 命中嵌套元素 → 改用 .card-pressable 类
  - ToggleGroupItem 不是标准 button role → 改用 getByText 定位
  - reload 后会回到首页 Tab → 测试中 reload 后需重新 gotoTab
- 重写 CLAUDE.md：新增"测试覆盖检查清单"、"新增前端组件时"、"测试疏漏排查"、"UI 测试编写规范"四个章节
- 全部 77 个 UI 测试 sequential 运行通过（4.6 min）

Stage Summary:
- 新增 8 个 UI 测试 spec，共 77 个测试用例，覆盖所有用户可见行为
- 新增 tests/ui-helpers.ts 作为 UI 测试通用入口
- CLAUDE.md 升级为强制双层覆盖规范：API 测试 + UI 测试必须同时存在
- 关键教训写入 CLAUDE.md：API 返回正确 ≠ UI 渲染正确，必须用 Playwright page 测试前端

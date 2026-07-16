# 开发规则

## Git Hooks 强制执行（自动安装）

本项目通过 git hooks 自动强制执行以下规则，无需人工记忆：

### 安装方式
```bash
bash scripts/setup-hooks.sh   # 首次 clone 或更新 hooks 后执行
```

### 钩子行为

| 钩子 | 触发时机 | 检查内容 | 失败后果 |
|------|----------|----------|----------|
| **pre-commit** | `git commit` | ① `tsc --noEmit` 类型检查 ② `eslint` 代码规范 ③ 改 src/ 是否同步更新 docs/ ④ 改 src/ 是否同步更新 tests/ | 阻止提交（①②强制，③④警告） |
| **commit-msg** | `git commit` | ① 禁止 UUID 格式 message ② 至少 10 字符 ③ 推荐 Conventional Commits 格式 | 阻止提交 |
| **pre-push** | `git push` | 全量 `npx playwright test`（~5-8 分钟） | 阻止推送 |

### 紧急跳过方式（不推荐）
```bash
git commit --no-verify        # 跳过 pre-commit + commit-msg
git push --no-verify          # 跳过 pre-push
SKIP_TESTS=1 git push         # 跳过 pre-push 测试（仍跑 pre-commit）
```

> ⚠️ 跳过钩子后请尽快补跑测试并修复问题，否则可能引入线上 bug。

---

## Bug 修复流程（强制）

1. **修复前**：检查测试是否完整覆盖该功能点
   - 如果没有覆盖，先补测试（复现 bug 的测试）
   - 确保测试能复现 bug（红灯）
   - **同时检查 API 测试和 UI 测试**（参见下方"测试覆盖检查清单"）
2. **修复 bug**
3. **修复后**：跑通所有测试（绿灯）
   - `npx playwright test` 全部通过才能提交
   - **pre-push 钩子会自动跑全量测试，确保不会漏跑**

## 代码修改流程（强制）

1. **改代码前**：检查相关功能的测试是否完整
2. **改代码后**：跑通所有测试
   - `npx playwright test` 全部通过才能提交
   - **pre-commit 钩子会自动跑 tsc + eslint，防止编译错误漏网**
3. **如果有测试失败**：先修测试或修代码，不允许跳过失败的测试

## 测试命令

```bash
# 跑全部测试（API + UI，47 个文件，~370 cases）
npx playwright test

# 跑单个测试文件
npx playwright test tests/01-checkin-verify.spec.ts

# 跑指定流程
npx playwright test -g "流程 1"

# 只跑 UI 测试（32-46 号文件）
npx playwright test tests/3[2-9]-ui- tests/4[0-6]-ui-

# 只跑 API 测试（排除 UI 测试）
npx playwright test --grep-invert "UI "

# 跑滑动相关测试
npx playwright test tests/40-ui-day-swipe.spec.ts

# 跑 dialog 表单测试
npx playwright test tests/41-ui-dialogs.spec.ts
```

## 测试覆盖检查清单（强制）

> 教训：曾经发生过"API 测试全绿，但 UI 渲染逻辑漏测导致线上 bug"的疏漏。
> 例如：API 返回 `pending_verification`，但前端没测 Badge 是否真的显示"待审核"。
> 因此每个功能点必须**同时**覆盖以下两层：

### 1. API 层测试（`tests/01-31-*.spec.ts` + `tests/47-api-*.spec.ts`）
- 用 `fetch` 直接调 API，验证返回值、状态变更、积分流水
- 用 `tests/helpers.ts` 的 `api()`、`login()`、`resetAndSeed()` 等 helper
- 验证后端业务逻辑（数据库状态、积分计算、权限、日期过滤边界）

### 2. UI 层测试（`tests/32-46-ui-*.spec.ts`）
- 用 Playwright `page` 操作浏览器，验证用户**看到什么、能点什么**
- 用 `tests/ui-helpers.ts` 的 `uiLoginFast()`、`gotoTab()`、`switchMemberByUI()` 等 helper
- 必须覆盖的 UI 行为：
  - **角色权限 UI**：家长专属按钮（新建/编辑/删除/扣分检查/添加成员）只对家长可见，孩子看不到
  - **状态条件渲染**：活动状态 Badge（待审核/已审核/已拒绝/已打卡）、奖励按钮文案（立即兑换/积分不足/兑换中）
  - **空状态/列表渲染**：无数据时的空状态提示（如"暂无待审核记录"）、列表项数量
  - **Tab/视图切换**：底部 5 个 Tab 切换、列表/网格视图切换、子 Tab 切换
  - **弹窗交互**：对话框打开/关闭、确认弹窗、表单填写、编辑预填
  - **成员切换**：MemberSwitcher 下拉、家庭 Tab 卡片点击切换
  - **Toast 反馈**：成功/失败提示出现
  - **数据联动**：打卡后状态 Badge 即时变化、兑换后 pending 数量徽章变化
  - **滑动交互**（v2.2.0）：日视图左右滑动切换日期、轮播 3-panel 结构、预加载验证
  - **边缘场景**（v2.2.0）：token 失效回登录页、空数据不崩溃、多家庭隔离、网络错误

### 3. 双层覆盖判定
**任何"用户可见的行为"都必须有 UI 测试，不能只靠 API 测试。**

举例：
- ❌ 只测 API `/api/activities/complete` 返回 `status: pending_verification` → 不够
- ✅ 还要测 UI：点"打卡"按钮后，活动卡片上出现"待审核" Badge，"打卡"按钮消失

- ❌ 只测 API `/api/redemptions` 创建成功 → 不够
- ✅ 还要测 UI：孩子点"立即兑换"后，"审核记录" Tab 出现 pending 数量徽章

## 新增前端组件时（强制）

1. **新增 / 修改 `src/components/` 下任何组件 → 必须新增 / 更新对应 UI 测试**
2. UI 测试文件命名：`tests/NN-ui-<feature>.spec.ts`（NN 是下一个可用编号）
3. UI 测试必须覆盖：
   - 组件挂载后渲染的内容（标题、按钮、列表）
   - 不同角色下渲染差异（家长 vs 孩子）
   - 不同数据状态下渲染差异（空列表 vs 有数据）
   - 主要交互（点击、输入、提交）

## 数据库变更后

1. `bunx prisma db push`（或 `--force-reset` 如果有破坏性变更）
2. `bunx prisma generate`
3. **重启 dev server**（pkill + 重新启动）
4. 跑测试确认

## 提交前检查

- [ ] `bun run lint` 通过
- [ ] `npx playwright test` 全部通过（API + UI 测试都要绿）
- [ ] **新增/修改的组件有对应 UI 测试**
- [ ] **每个功能点同时有 API 和 UI 两层测试**
- [ ] 需求文档 docs/REQUIREMENTS.md 已更新（如有需求变更）

## 测试疏漏排查（提交前自查）

提交前问自己：
1. 这次改了哪个组件？该组件的所有 UI 行为分支都有测试吗？
2. 这次改了哪些 API？API 测试覆盖了，但调用它的 UI 也测了吗？
3. 加了新的"if 角色是 X 则显示 Y"逻辑吗？两种角色都测了吗？
4. 加了新的状态 Badge 或文案吗？每种状态都有 UI 测试吗？
5. 加了空状态吗？空状态有 UI 测试吗？

如果有任何一项答"没有"，**先补测试再提交**。

## UI 测试编写规范

### 登录态
- **测试登录流程本身**：用 `uiLoginByClick(page, 'test-mom')`（点击快速登录按钮）
- **测试其他 UI 行为**：用 `uiLoginFast(page, 'test-mom')`（直接注入 localStorage，更快）
- **切换成员**：用 `switchMemberByUI(page, '小宇')`（通过顶部 MemberSwitcher 下拉切换）
- **不要用 `page.addInitScript` 注入登录态**：会污染后续 goto，导致"未登录"测试无法回到登录页

### 数据准备
- 用 `uiResetAndSeed(page, 'test-mom')` 重置数据（走 API seed，与 API 测试共用同一份数据集）
- 需要特殊数据状态时（如孩子积分调高），先用 `fetch` 调 API 改数据，再 `page.reload()`
- **reload 后会回到首页 Tab**，需要重新 `gotoTab(page, 'xxx')` 回到目标 Tab

### 定位器
- 优先用 `getByRole` / `getByText`（更稳定）
- 文字可能不唯一时（如"已审核"既在"已审核积分"里也在统计卡片里），用 `{ exact: true }`
- 用 `.card-pressable` 类定位活动卡片，避免 `div` filter 命中嵌套元素
- 列表内多个相同按钮时，先定位父容器再 `.getByRole(...)`
- **ToggleGroupItem 文字有空白**（如"日视图"、"周视图"）：用 `page.locator('button:has-text("周视图")')` 代替 `getByText('周视图', { exact: true })`
- **Radix Select 下拉项在 portal 中渲染**：用 `page.locator('[role="option"]', { hasText: '进行中' })` 而非 `getByText('进行中')`
- **`.or()` 链匹配多元素**：加 `.first()`，如 `getByText('空状态A').or(getByText('空状态B')).first()`
- **对话框判定**：用 `getByRole('dialog')` 而非 `getByText('新建活动')`（标题文字可能因编辑/新建模式变化）
- **滑动测试**：用 `element.evaluate()` dispatch `PointerEvent`（`pointerdown` / `pointermove` / `pointerup`），比 `page.mouse` 更可靠；分多步移动（10 步）确保 `pointermove` 触发
- **轮播结构定位**：`.schedule-day-view` > `.schedule-day-carousel-track` > `.schedule-day-panel`（3 个面板）
- **reload 后回到首页 Tab**：需重新 `gotoTab(page, 'xxx')` 回到目标 Tab

# ⏰ 时间小达人 · 小学生时间管理

面向小学生的家庭时间管理应用，移动端 PWA 风格，支持 **孩子 / 妈妈 / 爸爸** 三种角色协同。

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Prisma](https://img.shields.io/badge/Prisma-6-2D3748) ![Tailwind](https://img.shields.io/badge/Tailwind-4-38BDF8)

## ✨ 功能特性

- **四周期日程**：日度 / 周度 / 月度 / 临时独立管理，每项活动可设置计划时间、截止时间、基础积分、按时奖励
- **日程网格视图**（v2.2.0 增强）：
  - 纵向时间轴 + 重叠活动并排分栏 + 当前时刻指示线
  - 家长可拖动条目调整时间（5 分钟对齐）
  - **日视图 3-panel 轮播 + 预加载**：左右滑动切换日期，滑动过程可见相邻日期内容，无闪烁
  - 周视图：7 行紧凑俯览，点击某天切日视图
- **积分体系**：
  - 孩子打卡完成 → 发放基础积分
  - 截止时间前完成 → 额外发放"按时奖励"积分
  - 未完成活动由家长触发"扣分检查" → 自动扣分（扣到 0 为止）
- **鼓励里程碑**：达到累计积分阈值（20/50/100/200/500）自动解锁称号与鼓励语
- **积分兑换**：孩子用积分兑换现实奖励，家长审核（通过 / 拒绝 / 标记已兑现），拒绝自动退还积分
- **规划功能**：长期目标（状态切换）+ 复盘统计（完成率/按时率/趋势图）+ 周报/月报点评
- **多孩支持**：活动可分配给多个孩子，公共活动所有孩子可见，家长可切换看不同孩子
- **家庭角色**：
  - 👧 **孩子**：打卡完成任务、提交兑换申请、写点评、创建自己的目标
  - 👩 **妈妈 / 👨 爸爸**：增删活动 / 奖励 / 成员、代打卡、审核兑换、触发扣分检查

## 🛠 技术栈

- **框架**：Next.js 16 (App Router) + TypeScript 5
- **样式**：Tailwind CSS 4 + shadcn/ui (New York)
- **数据库**：Prisma ORM + SQLite
- **状态**：Zustand (持久化当前角色) + TanStack Query
- **UI 设计**：橙绿暖色调，移动端 max-w-md 居中、底部 Tab 导航

## 📁 项目结构

```
prisma/
  schema.prisma              # 7 张数据表定义
src/
  app/
    api/                     # 8 个 REST API 模块
      init/                  # 种子数据初始化
      members/               # 家庭成员 CRUD
      activities/            # 活动 CRUD + 打卡 + 扣分检查
      points/                # 积分流水查询
      encouragements/        # 鼓励里程碑
      rewards/               # 奖励项目
      redemptions/           # 兑换记录与审核
    page.tsx                 # 应用入口
    layout.tsx
  components/
    app-shell.tsx            # 顶部头部 + 底部 Tab 导航
    tabs/                    # 首页 / 日程 / 奖励 / 规划 / 家庭 5 个 Tab
    dialogs/                 # 活动 / 奖励 / 鼓励 / 成员 / 目标 5 个对话框
    schedule/                # 时间网格视图 + 活动详情对话框
    planning/                # 目标 / 复盘 / 点评 3 个子 Tab
    shared/                  # 角色切换器 + 待审核面板
  lib/
    time-utils.ts            # 时间/积分核心逻辑
    store.ts                 # Zustand 全局状态
    types.ts                 # 前端类型定义
    db.ts                    # Prisma Client
```

## 🚀 快速开始

### 1. 安装依赖

```bash
bun install
# 或 npm install / pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

### 3. 初始化数据库

```bash
bun run db:push    # 创建 SQLite 数据库与表结构
```

### 4. 启动开发服务器

```bash
bun run dev
```

打开 http://localhost:3000 即可使用。首次访问会自动写入演示数据：
- 3 个家庭成员（小宇 / 妈妈 / 爸爸）
- 10 个示例活动（日度 6 个 + 周度 3 个 + 月度 1 个）
- 5 个鼓励里程碑
- 6 个可兑换奖励

## 📜 NPM 脚本

| 命令 | 说明 |
|------|------|
| `bun run dev` | 启动开发服务器 (端口 3000) |
| `bun run build` | 构建生产版本 |
| `bun run start` | 运行生产服务器 |
| `bun run lint` | 运行 ESLint 代码检查 |
| `bun run db:push` | 同步 Prisma schema 到数据库 |
| `bun run db:generate` | 生成 Prisma Client |
| `bun run db:migrate` | 创建数据库迁移 |
| `bun run db:reset` | 重置数据库（⚠️ 清空数据） |

## 🎯 使用流程

1. **首次使用**：以妈妈或爸爸身份进入，点击「日程」→「新建」添加日常活动
2. **孩子打卡**：切换为孩子角色，在「首页」点击「打卡」按钮完成任务获得积分
3. **扣分检查**：日末由家长在「日程」页点击「扣分检查」，自动对未完成活动扣分
4. **兑换奖励**：孩子积攒足够积分后，在「奖励」页兑换，家长审核通过后即可兑现

## 📦 版本

- **v1.0.0** (2026-06-29)：首发版本，包含日程管理、积分体系、鼓励里程碑、积分兑换、家庭角色协同
- **v1.1.0**：时间网格视图（纵向 + 拖拽）
- **v1.2.0**：家长代打卡 + 积分审核 + 批量审核
- **v1.3.0**：规划功能（目标 + 复盘 + 点评）
- **v2.0.0**：多用户后端改造（Family / JWT / familyId 隔离）
- **v2.0.1**：网格视图日/周切换 + 临时日程 + 截止日期
- **v2.0.2**：多孩功能（多孩子分配 + 公共活动 + 首页孩子切换）
- **v2.1.0**：多孩功能完善 + 规划权限调整（目标/点评仅孩子可编辑）
- **v2.2.0** (2026-07-16)：日程日视图 3-panel 轮播 + 前后天预加载 + UI 测试体系完善（47 个测试文件，~370 cases）

## 🧪 测试

```bash
# 跑全部测试（API + UI）
npx playwright test

# 只跑 UI 测试
npx playwright test tests/3[2-9]-ui- tests/4[0-6]-ui-
```

测试覆盖：
- **API 层**（~120 cases）：打卡/审核/积分/兑换/目标/点评/统计/多家庭隔离/权限/日期过滤
- **UI 层**（~250 cases）：登录/导航/各 Tab 渲染/dialog 表单/活动详情/角色权限/滑动交互/边缘场景

详见 `docs/REQUIREMENTS.md` 和 `CLAUDE.md`。

## 📄 License

MIT

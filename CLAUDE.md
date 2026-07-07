# 开发规则

## Bug 修复流程（强制）

1. **修复前**：检查测试是否完整覆盖该功能点
   - 如果没有覆盖，先补测试（复现 bug 的测试）
   - 确保测试能复现 bug（红灯）
2. **修复 bug**
3. **修复后**：跑通所有测试（绿灯）
   - `npx playwright test` 全部通过才能提交

## 代码修改流程（强制）

1. **改代码前**：检查相关功能的测试是否完整
2. **改代码后**：跑通所有测试
   - `npx playwright test` 全部通过才能提交
3. **如果有测试失败**：先修测试或修代码，不允许跳过失败的测试

## 测试命令

```bash
# 跑全部测试
npx playwright test

# 跑单个测试文件
npx playwright test tests/01-checkin-verify.spec.ts

# 跑指定流程
npx playwright test -g "流程 1"
```

## 数据库变更后

1. `bunx prisma db push`（或 `--force-reset` 如果有破坏性变更）
2. `bunx prisma generate`
3. **重启 dev server**（pkill + 重新启动）
4. 跑测试确认

## 提交前检查

- [ ] `bun run lint` 通过
- [ ] `npx playwright test` 全部通过
- [ ] 需求文档 docs/REQUIREMENTS.md 已更新（如有需求变更）

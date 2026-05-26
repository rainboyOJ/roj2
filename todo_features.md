# 后续功能优化记录

## 用户题目进度表

当前 `/problems` 题目列表页面为了显示“已通过 / 已尝试”的状态，会在用户打开页面时查询该用户的提交记录，并在应用层按 `pid` 汇总。

这个实现简单、容易阅读，适合当前阶段使用。但如果后续用户提交量变大，例如单个用户有几万次甚至更多提交，每次打开题目列表都扫描该用户全部提交记录就不够理想。

后续可以增加一个独立集合，例如 `user_problem_progress`，专门保存用户在每道题上的当前进度：

```ts
{
  userId: string;
  pid: string;
  status: 'accepted' | 'attempted';
  updatedAt: Date;
}
```

更新策略：

- 新提交创建后，如果该题还没有记录，则写入 `attempted`。
- 评测结果写回时，如果 verdict 是 `AC`，则把状态更新为 `accepted`。
- 如果已经是 `accepted`，后续错误提交不应该降级为 `attempted`。

查询策略：

- `/problems` 页面只需要按 `userId` 查询 `user_problem_progress`。
- 返回的数据量最多等于该用户做过的题目数量，而不是提交次数。

建议索引：

```ts
db.user_problem_progress.createIndex({ userId: 1, pid: 1 }, { unique: true })
db.user_problem_progress.createIndex({ userId: 1, status: 1 })
```

这个优化适合在提交量明显增长、题目列表打开变慢，或者需要统计用户做题进度时再实现。

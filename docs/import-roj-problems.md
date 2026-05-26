# 导入 ROJ 题目

这个脚本用于把 `/home/rainboy/mycode/problems/roj` 里的题目批量导入到当前 OJ。

## 用法

```bash
npm run import:roj
```

脚本会依次询问：

1. OJ URL
2. admin 账号
3. admin 密码
4. ROJ 题目目录
5. 题号，支持单个编号或范围，例如 `1000`、`1000-1009`

## 行为

- 如果 OJ 中已存在同一个 `pid`，脚本会更新题目元数据。
- 如果 OJ 中不存在，脚本会创建题目。
- 题目题面优先读取 `content.md`，其次读取 `readme.md` 或 `statement.md`。
- 测试数据会同步到 `ROJ_JUDGE_TESTDATA_ROOT`，默认是：

```text
/home/rainboy/roj_test_dir/judge_server_testData
```

- 如果题目目录下存在 `data/`，脚本会复制整个目录。
- 如果只有 `data.zip`，脚本会先解压，再复制其中的 `data/`。

## 限制

- 这个脚本只负责题目元数据和 judge 测试数据目录的同步。
- 当前 OJ 后台没有单独的“上传测试数据”HTTP 接口，所以测试数据是直接落到 judge 机器本地目录。

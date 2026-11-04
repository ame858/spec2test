# 本地代理：流式碎片问题与归一化

## 现象

一段回复在客户端被渲染成**很多个短块**，每行只有几个 token，读起来支离破碎。

实测（2026-11-03，deepseek-v4.1-flash，一次约 109 字的回复）：

```
content_block_start/stop 共 97 对 —— 48 个 text 块 + 49 个 thinking 块，交替出现
```

## 原因

不是「每个分片都开一个新块」这么笼统。实测（`claude-haiku-4-5`，deepseek-v4.1-flash）事件流如下：

```
[index= 0 思考 delta=52] '我们需要回答中文，用户要求"用三句话介绍杭州"……'   ← 完整推理，一个块
[index= 1 正文 delta= 1] '杭州'
[index= 2 思考 delta= 1] ''      ← 空思考块
[index= 3 正文 delta= 1] '是'
[index= 4 思考 delta= 1] ''      ← 空思考块
[index= 5 正文 delta= 1] '浙江省省会、'
...
```

规律：**每来一个正文分片，前面都先插一个内容为空的 thinking 块，正文块则恰好只装 1 个 delta。**
于是 109 字的回复被切成 13 个正文块（每块 1–12 字）+ 13 个空思考块，共 27 个块交替出现。
客户端按块渲染，每个块单独成段 —— 这就是「一行只有几个 token」。

上游是在每个 `delta` 里带了空的 `reasoning_content` 标记，还是转换层在推理结束后补了空块，
从客户端这一侧无法区分（cc-switch 是编译好的二进制）。但无论归谁，现象与修法一致。

**对照实验**：同一代理、同一客户端，把模型换成 `claude-fable-5`（gemini-4-argon，不产出思考），
结果是 **1 个 text 块、5 个 delta、零 fragmentation**。所以问题只出现在「会思考的模型」这条路径上，
与代理本身的转发能力无关。

实测数据（同一条 prompt、max_tokens=400）：

| 客户端模型 | 上游 | 块总数 | text 块 | thinking 块 | 每个 text 块的 delta |
|---|---|---|---|---|---|
| claude-haiku-4-5 | deepseek-v4.1-flash | 41 | 20 | 21 | 恒为 1 |
| claude-sonnet-4-6 | deepseek-v4.1-flash | 63 | 31 | 32 | 恒为 1 |
| claude-opus-4-8 | deepseek-v4.1-flash | 23 | 11 | 12 | 恒为 1 |
| claude-fable-5 | gemini-4-argon | **1** | 1 | 0 | 5 |

结论：只要是 `deepseek-v4.1-flash` 就一定会碎；`gemini-4-argon` 天生不碎。


## 方案

在客户端与代理之间加一层归一化（`scripts/normalize_proxy.py`）：

```
claude → 127.0.0.1:15722（本脚本） → 127.0.0.1:15721（cc-switch） → 上游
```

只改写 `text/event-stream` 响应：

- 连续 text block 合并成一个（沿用第一段的 index，后续 start/stop 丢弃）；
- 碎片化 thinking block 整块丢弃，且**不打断**文本连续性；
- `tool_use` 等非文本块原样保留，并在其之前正确闭合文本块。

非流式请求与其它路径原样透传。合并规则与 `webapp/lib/anthropic-sse.ts` 一致。

## 替代方案（更省事，不用跑代理）

把默认模型换成一个**不产出思考**的即可，因为碎片只发生在带 reasoning 的路径上：

- `claude-fable-5`（映射到 gemini-4-argon）实测零碎片：1 个块、5 个 delta。
- 在 cc-switch 里把该 provider 的 FABLE 槽位设为主用，或在 Claude Code 里 `/model` 切过去。

代价是换掉 deepseek-v4.1-flash 这个更擅长代码的模型。想要「deepseek 的能力 + 不碎片」，
还是得用下面的归一化代理。

## 启用

1. 启动归一化代理（保持窗口开着；脚本带崩溃自动重启）：

   ```bat
   scripts\start_normalizer.bat
   ```

2. 把 Claude Code 指到 15722：

   ```bat
   py -3.12 scripts\point_claude_normalizer.py
   ```

   会先备份为 `settings.json.bak-normalizer`，只改 `env.ANTHROPIC_BASE_URL`。

3. 重启 Claude Code 生效（`settings.json` 的 env 只在进程启动时读取）。

> cc-switch 切换供应商时可能重写 `ANTHROPIC_BASE_URL`，回到 15721 后重跑第 2 步即可。

## 回退

```bat
py -3.12 scripts\point_claude_normalizer.py --revert
```

或直接把 `ANTHROPIC_BASE_URL` 改回 `http://127.0.0.1:15721`（备份文件同目录）。

**注意**：指向 15722 时，归一化代理必须处于运行状态。否则 Claude Code 会立刻报
`ECONNREFUSED`——这正是 2026-11-03 那次故障的原因：配置已指向 15722，但
`normalize_proxy.py` 当时根本没被创建出来。

## 验证

```bat
:: 1) 看块数：应为 1
curl -s -N -X POST http://127.0.0.1:15722/v1/messages ^
  -H "content-type: application/json" -H "anthropic-version: 2023-06-01" ^
  -H "x-opencode-session: any-value" ^
  -d "{\"model\":\"claude-haiku-4-5\",\"max_tokens\":400,\"stream\":true,\"messages\":[{\"role\":\"user\",\"content\":\"用三句话介绍杭州\"}]}"
```

已实测结果：97 块 → 1 块，正文 109 字**逐字完全一致**（含按 37 字节强制跨帧切割的复放验证）。

## 已知边界

- 上游的 thinking 片段会被丢弃（不显示思考过程）；若以后代理开始返回完整思考内容，
  应改为「合并 thinking」而不是丢弃。
- 非流式响应不合并（目前非流式返回的是单个 text block，不受影响）。
- 每个请求多一跳本地转发，延迟增量可忽略（同机 loopback）。
- 上游要求 `x-opencode-session` 头，缺失时返回 `MissingSessionID`；真实客户端会自带，
  手工 curl 调试需要自己加。

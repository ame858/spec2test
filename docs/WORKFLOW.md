# 产品开发工作流

> 骨架严格来自 `mattpocock-skills@1.3.1`（grilling / to-spec / to-tickets / implement-spec / tdd / code-review / pr / retro）。
> 标注 **[补丁]** 的环节不是 pocock 原生流程，是为了让前端设计在这条链上不丢失而加的。

一句话版本：**先烤问清楚，再写成 spec，再切成垂直小票，每票测试先行，最后双轴评审。**

---

## 0. 先决条件（每个仓库只做一次）

### 0.1 启用插件

pocock 的所有工程技能都在插件里，`disable-model-invocation: true` 意味着它们**不会自动触发，必须你手打斜杠命令**。插件未启用时这些命令都不存在。

```
/plugin
```
确认 `mattpocock-skills@claude-plugins-official` 是 enabled。

> 已知问题：`~/.claude/settings.json` 的 `enabledPlugins` 会被外部进程（cc-switch）周期性刷成 `{}`，导致插件反复掉线。掉线时先把它加回去再重启，或改用项目级 `.claude/settings.json`。

### 0.2 配置仓库

```
/setup-matt-pocock-skills
```

它会探索仓库并分三节问你，每节都给了推荐答案，直接回"按推荐"即可：

| 节 | 内容 | 推荐 |
|---|---|---|
| A | issue tracker 放哪 | 有 GitHub remote 就 GitHub；**个人项目选 local markdown**（`.scratch/<feature>/issues/`） |
| B | triage 标签（仅在 triage skill 已装时问） | 保留默认五个：`needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix` |
| C | 领域文档布局 | single-context：根目录 `GLOSSARY.md` + `docs/adr/` |

**产出**：`docs/agents/issue-tracker.md`、`docs/agents/domain.md`、`docs/agents/triage-labels.md`，以及 `CLAUDE.md` 里一个 `## Agent skills` 块。

之后所有技能都从这里读"票放哪、术语怎么叫"。

---

## 1. 总览

| # | 阶段 | 命令 | 产出 | 你必须做的判断 |
|---|---|---|---|---|
| 1 | 拷问 | `/grill-with-docs` | 共识（无文件） | 每条决策都要你答 |
| 1.5 | 调研（可选） | `/research` | 一份带引用的 md | 无 |
| 2 | 定 spec | `/to-spec` | spec（进 tracker） | 确认测试接缝 |
| 2.5 | **[补丁] 定视觉世界** | 三问写 `DESIGN.md`（要看像素才加 `/prototype`） | `DESIGN.md` | 定模式 / 基线 / 禁令 |
| 3 | 切票 | `/to-tickets` | 垂直切片票 + 阻塞边 | 确认粒度 |
| 4 | 实现 | `/implement-spec` | 代码 + 测试 | 无（连续跑） |
| 5 | 评审 | `/code-review` | 两轴报告 | 决定修哪些 |
| 6 | 交付 | `/pr` | PR body | — |
| 7 | 复盘 | `/retro` | 环境改进清单 | 挑哪些落地 |

---

## 2. 阶段一：拷问（最重要的一段）

**什么时候用**：任何"我想做个 X"的模糊起点。跳过这一步的代价会在 spec 和实现阶段翻倍偿还。

**你输入**：

```
/grill-with-docs

目标：<一句话说清要做什么产品，给谁用>

约束：
- 只问产品、行为、范围、风险、取舍；配色/字体/版式不要问。
- 需要的事实（竞品、现有代码、数据格式、API 限制）你自己派子代理去查，不要问我。
- 每轮把整个 frontier 一次问完，每个问题给出你推荐的答案，让我说"是"就能接受。
```

**它会怎么做**（pocock 原文规矩）：

- 把待决策项组织成一棵**设计树**：每个决策分出它下游的决策。
- 只问 **frontier**——所有前置条件都已敲定的那些问题，一次问一整轮：

```
❓ **Q1** - **<标题>**：<问题正文，可含多选项>

➡️ <推荐答案>

---

❓ **Q2** - **<标题>**：...
```

- 措辞保证"是"= 接受推荐答案。
- 你答完，重新计算 frontier，问下一轮。依赖未决问题的问题**不能**放进同一轮。
- **事实是它的活**：要查文件就派子代理去查，不问你；查的时候不阻塞其余问题。
- **frontier 为空才算结束**，没有默默假设的项。

**产出**：没有文件，只有共识。**在你确认"达成共识"之前，它不会动手**。

**你必须做的**：认真答题。含糊过去的问题会在 to-spec 阶段以错误的 user story 形式回来。

**常见错误**：

- 让它在拷问阶段定美学 —— 错位，那属于阶段 2.5。
- 你自己不去查事实、反过来问它"X 是什么" —— 事实本该它查。
- 一轮没答完就催下一轮 —— 会得到基于假设的下游问题。

---

## 2.1 阶段一·五：调研（可选）

只在某个决策需要外部事实（某个 API 到底怎么工作、某竞品的实际流程、某个规范的细节）时用。

**你输入**：

```
/research <要查的具体问题>

要求：回到一手来源（官方文档、源码、规范、第一方 API），不要二手综述；
每个结论都标来源；结论写成仓库里的一份 md，放在已有的笔记约定位置，没有就放 docs/research/。
```

**它会**：起一个**后台子代理**去读，你继续干别的；产出单份 md，逐条标注来源。

---

## 3. 阶段二：写 spec

**你输入**：

```
/to-spec

把上面的共识合成 spec。本轮范围：<明确做什么>；不做：<明确不做什么>。

额外要求：
- User Stories 写长、写全，覆盖空态、错误态、权限、溢出、专家用法。
- Implementation Decisions 不要写文件路径和代码片段（会过期）。
- 先列出你打算测试的接缝（seams）和理由，等我确认后再写正文。
- **[补丁]** 多写一节「UI 归属」：每个 user story 对应哪个界面 / surface，是新建还是扩展既有界面。
```

**它会怎么做**：

1. **不访谈**，只合成已有上下文（访谈是阶段一的事）。
2. 探索仓库现状，用 `GLOSSARY.md` 的术语和既有 ADR。
3. **先和你确认测试接缝**：优先用已有接缝，选尽可能高的接缝，接缝越少越好（理想是 1 个）。每个接缝给一句"能抓到什么 / 漏掉什么"。
4. 按模板写，发到 tracker，打 `ready-for-agent` 标签。

**spec 模板**（pocock 原生）：

```markdown
## Problem Statement
从用户视角描述要解决的问题。

## Solution
从用户视角描述解决方案。

## User Stories
1. As a <actor>, I want a <feature>, so that <benefit>
（长列表，覆盖所有方面）

## Implementation Decisions
- 要建/改的模块及其接口
- 技术澄清、架构决策、schema 变更、API 契约、具体交互
（不写文件路径和代码片段；唯一例外：原型产出的状态机/类型形状可以内联）
```

**产出**：spec + 已确认的接缝清单。

**闸门**：接缝确认。接缝错了，后面所有测试都在测错的东西。

---

## 4. 阶段二·五：定视觉世界 **[补丁]**

> 非 pocock 原生。加这一步的原因：`to-tickets` 切的是**垂直切片**，UI 从第一张票就存在。视觉世界必须在此刻定下来，否则每张票各写各的样式。
>
> **精简版：只产出一个 `docs/DESIGN.md`（30 行）。不建 PRODUCT.md，不跑 `shape`/`new-work`/brief，不引入 impeccable 的流程词汇。**

### 4.1 三问定 DESIGN.md

```
按这三问给出一份 30 行的 docs/DESIGN.md，不要展开成设计文档：

1. 界面模式：Operate（完成任务）/ Read（读懂）/ Persuade（说服行动）/ Experience（内容即界面）。
   只选一个，写一句理由。
2. 视觉基线：色板（≤6 个）、字号阶梯（≤5 档）、间距尺度（≤6 档）、圆角与描边规则。
   给具体值，不要写"现代简洁"这种形容词。
3. 禁令：本界面绝不允许出现什么（例如：不用卡片网格、不用渐变、不新增字号）。

不确定的地方选最保守的方案，并把假设写进文件末尾的「待验证」。
```

### 4.2 需要看像素时才用 prototype

| 情况 | 做什么 |
|---|---|
| 方向说不清 / 要拿去说服别人 / Persuade 或 Experience | 走 `/prototype`，选完把结果写回 `DESIGN.md` |
| Operate / Read，或已有明确参考 | **跳过**，别做原型 |

```
/prototype

问题：<主界面> 应该长什么样？
约束：
- 做成 `?variant=` 切换的 3 套方案，必须在**结构**上不同（布局、信息层级、主要操作方式），不是换配色。
- 优先挂在已有路由上，保留真实的数据获取和密度。
- 用真实数据的三档看：0 条 / 典型量 / 极端量。
- 只读，不接真实写操作。
```

它建 `VariantA/B/C` + 底部浮条。你看完后说"我要 B 的头部 + C 的侧栏"——那句话才是真正的设计。胜出的折进真代码，落选变体和浮条进丢弃分支，**不要留在 main**。

### 4.3 impeccable 只做评审，不做流程

| 不采用 | 替代 |
|---|---|
| `init` / `document` / `shape` / `new-work` / `live` / `generate` / `doctor` / `pin` / hooks | 4.1 的三问 + 4.2 的 prototype |
| PRODUCT.md / surface brief / 四种 mode 的词汇 | 只留 `DESIGN.md` 里的一行「模式」 |
| 24 个命令的完整照会 | 收尾时只用 `critique` → `audit` → `polish`；写 UI 前读它的 `reference/craft-floor.md` |

项目里的词汇因此只有一套半：pocock 的 spec / ticket / GLOSSARY / ADR / seam，加上 `DESIGN.md` 的四段。agent 不需要知道 surface、brief、Persuade/Operate 这些词。

### 4.4 DESIGN.md 骨架

```markdown
# DESIGN

模式：Operate（用户来完成任务）
理由：一天用多次，扫读效率优先于表达

## 色板
- 背景 / 表面 / 描边 / 主文字 / 次文字 / 强调（6 个，给具体值）

## 字号阶梯
- 12 / 13 / 15 / 18 / 24（仅这 5 档）

## 间距尺度
- 4 / 8 / 12 / 16 / 24 / 40（仅这 6 档）

## 圆角与描边
- 圆角 6px；分隔用 1px 描边，不用阴影

## 禁令
- 不新增字号/间距尺度；不新增颜色
- 不用渐变、不用卡片网格堆叠

## 待验证
- <不确定的假设>
```

### 4.5 硬规则（写进每张票的验收项）

- **不得新增颜色/字号/间距尺度**——要加先改 `DESIGN.md`。
- `DESIGN.md` 必须提交进仓库。`implement-spec` 的 implementer 子代理拿不到对话上下文，只读得到仓库。
- 实现期间不跑设计检测 hook，免得打断红绿循环；收尾评审时再开。

---

## 5. 阶段三：切票

**你输入**：

```
/to-tickets

按 spec 切成 tracer bullet 垂直切片：
- 每片穿过 schema / API / UI / 测试，是完整的窄路径，不是某一层的横切；
- 每片能独立演示或验证；
- 每片控制在一个全新上下文窗口能装下的量；
- 先做能降低后续难度的 prefactor（"先让改动变容易，再做容易的改动"）。
每张票写清 blocking edges。
先按模板列给我看，等我确认粒度，再发到 tracker。
```

**它会怎么做**：

1. 读 spec 和现有代码，用 `GLOSSARY.md` 术语。
2. 切垂直切片；宽重构（一次机械改动打穿全仓）是唯一例外，按 **expand → migrate → contract** 排序。
3. **quiz 你**：粒度对不对（太粗/太细）、阻塞边对不对、要不要合并或拆开。
4. 发布到 tracker，打 `ready-for-agent`。

**票模板**（本地 markdown 版）：

```markdown
# <NN>: <标题>

**What to build:** 这张票让什么端到端行为跑通（用户视角，不是分层实现清单）。

**Blocked by:** 阻塞它的票，或 "None (can start immediately)"。

**Status:** ready-for-agent

- [ ] 验收项 1
- [ ] 验收项 2
**[补丁]** - [ ] UI 遵循 DESIGN.md，不新增颜色/字号/间距尺度
```

**闸门**：粒度。票太大 → 子代理上下文爆掉；太小 → 合并成本高于收益。

---

## 6. 阶段四：实现

**小改动（一张票）**：

```
/implement <ticket 引用>

按票实现。先确认测试接缝再接缝内做 TDD；经常跑类型检查和单测，最后跑全量；
完成后调 code-review 自审，再提交到当前分支。
```

**多票 / 整份 spec**：

```
/implement-spec

spec 和票都在 tracker 上。
约束：
- 每张票先确认测试接缝，再在接缝内做 TDD。
- 动 UI 前读 DESIGN.md 和 impeccable 的 craft-floor。
- 汇报完成前，把 integration 分支的最新改动合进自己的分支。
```

**它的机制**（pocock 原文）：

1. 读 spec 和票，理出任务图；票是**任务图**不是步骤清单，所以永远存在一个可开干的 frontier。
2. （可选）调研子代理，笔记存仓库外供后续复用。
3. 建 integration branch。
4. 每张就绪票起一个 **implementer 子代理**：独立 worktree + 独立分支 → 确认基于 integration → 调 `tdd` 实现 → 合并 integration 最新 tip。
5. **merger 子代理**把完成的票合进 integration。
6. frontier 变化 → 继续起子代理，并发推进。
7. 全部完成 → 在 integration 上跑 `code-review` → 一个 implementer 一次性修完。
8. 有 draft PR 就转 ready；按 tracker 关单。
9. 清理 worktree。

子代理之间只传指针（spec、票、笔记、commit），不传长文。

**TDD 的规矩**（`tdd` skill）：

- **先红后绿**：先写失败的测试，再写刚够通过的最小实现。不预判后续测试。
- **一次一片**：一个接缝、一个测试、一个最小实现。
- **重构不属于这个循环**：重构归 code-review。
- 测试只写在**预先确认过的接缝**上。
- 反模式：实现耦合（mock 内部协作者、测私有方法）、同义反复（期望值用和实现一样的方式算出来）、横向切片（先写完所有测试）。

---

## 7. 阶段五：双轴评审

**你输入**：

```
/code-review

固定点：<commit / main / merge-base>

按 Standards 和 Spec 两轴并行审，分开报两节，不要合并也不要重新排序。
最后每个轴各给一行总结：发现几条、最严重的是哪条。
```

**两轴**：

- **Standards**：代码是否符合本仓库文档化的规范？（`CODING_STANDARDS.md`、`CONTRIBUTING.md`，加上 Fowler 味道基线）
- **Spec**：代码是否忠实实现了 spec/票？（漏做、超范围、做错）

**为什么分两轴**：符合所有规范但做错事 → Standards 过 / Spec 挂；完全按票实现但破坏仓库惯例 → Spec 过 / Standards 挂。合并排序会让一个轴掩盖另一个。

**味道基线（12 条，永远算判断题，仓库规范优先）**：Mysterious Name、Duplicated Code、Feature Envy、Data Clumps、Primitive Obsession、Repeated Switches、Shotgun Surgery、Divergent Change、Speculative Generality、Message Chains、Middle Man、Refused Bequest。

**它不做的**：不选一个"总冠军问题"。跨轴排序正是这个设计要防的。

---

## 8. 阶段六：交付

```
/pr

按模板写 PR body：
- Summary 用最小视图说清要点（组件树 / 调用树 / pseudocode / diff / Mermaid，选最合适的一种）。
- Evidence 放 before/after（截图最好；其次是失败测试变通过的输出）。
- Merge Danger 写：单向门还是双向门 + 爆炸半径。
```

**模板**：

```markdown
## Summary
<图 / 树 / pseudocode / diff>

## Evidence
- **Before:** <截图或失败输出>
  **After:** <截图或通过输出>

## Merge Danger
**Door:** <one-way | two-way>
**Blast Radius:** <一个词>
```

单向门 = 回不去的改动（破坏性操作、难回滚决策）。爆炸半径写最坏影响面。

---

## 9. 阶段七：复盘

```
/retro

复盘这次 session，按严重度列出对**环境**的改进建议。
机械性的问题优先变成自动化检查，不要只写规则。
```

**七类候选**（pocock 原文）：

| 类别 | 触发信号 |
|---|---|
| Navigation | 找文件花了很久、文件间有隐藏依赖 → 加导航指针 |
| Automated checks | 犯了本可被 lint/类型/测试抓到的错，或仓库根本没有 guardrail |
| Coding standards | 评审子代理漏掉了某类错误；机械性问题应改判为确定性检查 |
| Global AGENTS.md | 该文件过大，混杂了该进 standards 或自动化的内容 |
| Tool economy | 有昂贵的工具调用可精简 |
| No-ops | 引导文件里有不改变行为的指令 |
| Information access | 关键信息拿不到（日志、只读第三方访问） |

**核心原则**：实现代理上下文压力最大，评审代理最小。所以**规范应该由评审代理来施加**，而不是塞进实现代理的上下文。

---

## 10. 旁路技能（按需，不在这条主链上）

| 场景 | 命令 | 要点 |
|---|---|---|
| 硬 bug / 性能回退 | `/diagnosing-bugs` | 第一优先是**造出反馈回路**（失败测试 > curl > CLI > 无头浏览器 > 回放 trace > 一次性 harness > 属性测试 > bisect > 差分 > HITL 脚本）。造不出回路就停下来说清楚，不要靠盯代码猜。回路要收紧：快、信号锐利、确定。 |
| 架构变浅、改动发散 | `/improve-codebase-architecture` | 先按 git log 找热点，扫"浅模块"（接口和实现一样复杂），用删除测试判断；输出 HTML 报告，选中后进入拷问。 |
| 大到一个 session 装不下 | `/wayfinder` | 目标先命名；在 tracker 上建一张 map（`wayfinder:map` 标签）+ 子决策票；每次解一张，直到路清晰。**只产出决策，不产出交付物**。 |
| 外部 issue / PR 涌入 | `/triage` | 一个 category（bug/enhancement）+ 一个 state（五个角色）；必要时先 grill 再写 agent-ready brief。 |
| 术语混乱 | `/domain-modeling` | 术语冲突立刻指出；写 `GLOSSARY.md` 和 `docs/adr/`；文件惰性创建。 |

---

## 11. 附录：失败模式对照

| 症状 | 根因 | 修法 |
|---|---|---|
| spec 写完发现漏了大半场景 | 拷问没答完就催 to-spec | 回到阶段一，把 frontier 清空 |
| 每张票的 UI 各长一样 | 没有视觉世界，或 DESIGN.md 没进仓库 | 补阶段 2.5，并把约束写进票的验收项 |
| 测试一重构就红 | 测试写在实现细节上 | 回到接缝确认；测试只走公开接口 |
| 评审报告看不出重点 | 两轴被合并排序了 | 明确要求分开报，不跨轴排序 |
| PR 描述没人看懂 | 只贴了代码 diff | 用组件树 / 调用树 / pseudocode 表达"改了什么形状" |
| 同一类错误反复犯 | retro 只写了规则没做检查 | 机械性规则 → lint / pre-commit / CI |

---
name: VeriSpec
description: 把 3GPP 测试条款编译成可校验测试意图的验证工作台
colors:
  canvas: "rgb(255 255 255)"
  surface: "rgb(247 248 250)"
  line: "rgb(232 232 236)"
  ink: "rgb(26 26 26)"
  muted: "rgb(107 114 128)"
  instrument-blue: "rgb(59 85 230)"
  instrument-blue-soft: "rgb(77 107 254)"
  instrument-blue-tint: "rgb(59 85 230 / 0.10)"
  pass-green: "rgb(15 157 88)"
  pass-green-tint: "rgb(15 157 88 / 0.10)"
  reject-red: "rgb(217 48 37)"
  reject-red-tint: "rgb(217 48 37 / 0.10)"
  warn-amber: "rgb(180 83 9)"
typography:
  display:
    fontFamily: "Inter Variable, system-ui, -apple-system, Segoe UI, Microsoft YaHei, sans-serif"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  display-sm:
    fontFamily: "Inter Variable, system-ui, -apple-system, Segoe UI, Microsoft YaHei, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.18
    letterSpacing: "-0.02em"
  wordmark:
    fontFamily: "Inter Variable, system-ui, -apple-system, Segoe UI, Microsoft YaHei, sans-serif"
    fontSize: "80px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.045em"
  wordmark-sm:
    fontFamily: "Inter Variable, system-ui, -apple-system, Segoe UI, Microsoft YaHei, sans-serif"
    fontSize: "56px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.045em"
  cover-display:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "104px"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  cover-display-sm:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "64px"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  cover-sub:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter Variable, system-ui, -apple-system, Segoe UI, Microsoft YaHei, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Inter Variable, system-ui, -apple-system, Segoe UI, Microsoft YaHei, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Inter Variable, system-ui, -apple-system, Segoe UI, Microsoft YaHei, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
  label:
    fontFamily: "Inter Variable, system-ui, -apple-system, Segoe UI, Microsoft YaHei, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0.01em"
  annotation:
    fontFamily: "Inter Variable, system-ui, -apple-system, Segoe UI, Microsoft YaHei, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0em"
  numeric:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.instrument-blue}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  button-ghost:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  chip-accent:
    backgroundColor: "{colors.instrument-blue-tint}"
    textColor: "{colors.instrument-blue}"
    rounded: "9999px"
    padding: "2px 8px"
    height: "22px"
  card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input-chat:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
---

# Design System: VeriSpec

## Overview

**Creative North Star: "验证工作台"**

界面像一张摊开的验证工作台：用例、候选消息、违规清单、判定与证据各就各位，任何人扫一眼都知道
「这一步查了什么、哪条没过、为什么」。它不装饰工作，而是让工作本身可读——模型在做什么、规则判了什么、
证据指向哪里，都摆在台面上。密度偏紧，留白只用来分组，不用来营造气氛。

视觉语言是精密仪器式的：细边框、克制的蓝、少量语义色，反馈轻但有回应。蓝色不是品牌表演，
而是操作与链接的指路色；绿 / 琥珀 / 红只承担判定语义，绝不拿来调味。

**Key Characteristics:**
- 冷白画布与仪表灰分层，表面平、浮层才有阴影
- 一个强调色（仪表蓝），只出现在操作与可点击处
- 状态色严格绑定语义：通过绿、注意琥珀、拒收红、弃权灰
- 数字用等宽 + 表格数字对齐，结论可称量

## Colors

冷色中性打底，单一蓝色承担交互，语义色只在状态出现。

### Primary
- **仪表蓝**（`rgb(59 85 230)`）：主操作按钮、链接、当前选中项、焦点环。占比小是刻意的——它出现在哪里，哪里就是“可以动”的地方。
- **仪表蓝·柔**（`rgb(77 107 254)`）：描边与浅底的强调，用于边框、环形焦点与选中态外圈。

### Neutral
- **冷白画布**（`rgb(255 255 255)`）：页面与卡片内容面。
- **仪表灰底**（`rgb(247 248 250)`）：次级表面——表头、代码块、输入框、悬浮项。
- **细线灰**（`rgb(232 232 236)`）：1px 分割线与卡片边框，永远细，不用深色粗线。
- **石墨墨色**（`rgb(26 26 26)`）：正文与标题。
- **次级文字灰**（`rgb(107 114 128)`）：说明、单位、辅助信息。

### Semantic
- **通过绿**（`rgb(15 157 88)`）、**注意琥珀**（`rgb(180 83 9)`）、**拒收红**（`rgb(217 48 37)`）、**弃权灰**（`{colors.muted}`）。

### Named Rules
**The One Voice Rule.** 仪表蓝在任意一屏的着色面积不超过 10%；它的稀有就是它的意义。

**The Semantic Color Rule.** 绿 / 琥珀 / 红只用于判定与风险提示，不做装饰；弃权永远是灰，不用红。

## Typography

**Display / Body Font:** Inter Variable（回退 system-ui、Segoe UI、Microsoft YaHei）
**Cover / Wordmark Font:** Archivo Variable（封面文档号与品牌字标）
**Numeric / Mono Font:** JetBrains Mono、ui-monospace、SFMono-Regular、Menlo、Consolas

**Character:** 一套无衬线承担全部层级，靠字号、字重与颜色拉开差距；数字单独走等宽，让判定与指标可以竖向对齐。
中文回退到雅黑，字距与行高按中英混排调过，不靠字重堆气势。

### Hierarchy
- **Display**（600，40px，行高 1.15）：只用于空状态与落地页的主标题，每屏最多一个。
- **Display-sm**（600，32px，行高 1.18）：窄屏（<640px）下的 Display 替代，避免中文单字孤行。
- **Wordmark**（600，80px / 窄屏 56px，字距 -0.045em）：首屏品牌字标，只用于空状态与落地页。
- **Cover-display**（Archivo 600，104px / 窄屏 64px，行高 0.95）：封面上的文档号，是封面的主视觉。
- **Cover-sub**（Archivo 500，26px）：封面主标题下方的产品主张。
- **Mono annotations**（JetBrains Mono 400，10–12px，宽字距）：封面元数据、版本号、示意图标注，只用于工程性标注，不用于正文。
- **Title**（600，20px，行高 1.3）：页面标题，每屏一个。
- **Headline**（600，16px，行高 1.4）：卡片标题、区块标题。
- **Body**（400，14px，行高 1.6）：正文；长文控制在 65–75ch。
- **Label**（500，12px，行高 1.5）：说明、参数名、表头。
- **Annotation**（400，11px，行高 1.45）：免责声明与极小标注，仅此一处用途。
- **Numeric**（400，12–13px，等宽，`tnum`）：用例号、L1/L3、违规数、耗时。

### Named Rules
**The Numbers Are Data Rule.** 数字一律等宽并右对齐；L1/L3 这类指标不居中、不左对齐。

## Layout

单页应用式布局：不设全宽顶栏，导航与工具以悬浮胶囊按钮出现（左上：侧栏开关/新建对话 + 可编辑标题；右上：图标导航与连接状态）；主体两栏——左侧会话列表（260px，可折叠），右侧内容区；对话区单栏居中、最大 46rem，
输入框悬浮在底部。数据页与关于页使用 860–1100px 的阅读宽度容器，页面内边距 24px。

密度偏紧：表行高约 36px，卡片内边距 12–16px，区块之间 16–24px。响应式以 640 / 768 / 1024 为断点；
浮层在窄屏收成 94vw，表格在自身容器内横向滚动，不让整页横滚。

## Elevation & Depth

分层不悬浮：表面靠底色区分（冷白 / 仪表灰），静止态一律平。阴影只出现在两处——卡片（极轻的环境影）与
右侧浮窗（有方向的结构影）。浮窗之外不使用大面积投影，也不用玻璃或发光制造层级。

### Shadow Vocabulary
- **卡片环境影**（`0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px rgb(0 0 0 / 0.06)`）：数据卡、运行卡。
- **浮窗结构影**（`-24px 0 60px -24px rgb(0 0 0 / 0.45)`）：右侧抽屉，只向左投。

### Named Rules
**The Flat-At-Rest Rule.** 静止表面不加影；阴影是状态与层级的回应，不是默认装饰。

## Shapes

圆角三档：控件 10px、卡片与输入 14px、小组件 6px；标签与状态点用全圆。边框永远 1px 细线，
颜色取细线灰；不使用彩色左边条、粗描边或硬投影。浮窗左侧圆角 16px 与页面边缘相接，其余直角。

## Components

### Buttons
- **Shape:** 10px 圆角，高 36px（sm 28 / lg 40），横向内边距 14px。
- **Primary:** 仪表蓝实底 + 白字；一屏的操作区只允许一个。
- **Ghost:** 冷白底 + 1px 细线灰 + 墨色字，用于次级操作。
- **Subtle / Icon:** 无边框，悬停用仪表灰底；图标按钮 32×32。
- **Hover / Focus:** 颜色 150ms 过渡；焦点用 2px 仪表蓝 40% 环，不用外发光。

### Chips
- **Style:** 全圆角，浅底深字（语义色 10% 底 + 深色字），1px 同色描边；文字 12px。
- **State:** 选中态加深底色；可移除 chip 带一个 × 且 × 有独立可点区域。

### Cards / Containers
- **Corner Style:** 14px。
- **Background:** 冷白；次级区块用仪表灰底。
- **Shadow Strategy:** 卡片环境影，见 Elevation。
- **Border:** 1px 细线灰。
- **Internal Padding:** 12–16px。

### Inputs / Fields
- **Style:** 冷白底 + 1px 细线灰（静止与聚焦同色，聚焦只加深阴影）+ 16px 圆角；对话输入最小高度 112px、宽度上限 46rem 居中，呈现为柔和浮起的整块面。
- **Focus:** 边框转为仪表蓝 40%，不加发光。
- **Disabled:** 50% 不透明度，保留布局。
- **对话输入底栏:** 左「+」打开参数/技能/MCP（后两者为次级菜单）；右侧麦克风（浏览器支持语音识别时才出现）与圆形发送按钮（仪表蓝底、白色上箭头）；框下居中 11px 免责声明「内容由 AI 生成，请仔细甄别」。

### Navigation
无全宽顶栏。导航是右上角一枚悬浮胶囊，四个图标（对话 / 数据与评测 / API / 关于），当前项仪表蓝浅底；
旁边一枚圆点按钮显示后端连接状态（悬停显示 provider · model）。左上角另一枚胶囊放侧栏开关与新建对话，
其右是标题胶囊（可点击改名）。所有悬浮件使用 `bg-canvas/85` + 轻影，不用毛玻璃装饰。

### Signature: 用例浮窗 (Case Drawer)
右侧 880px 抽屉，遮罩 25% 墨色 + 3px 背景模糊；280ms `cubic-bezier(0.16,1,0.3,1)` 滑入，
点遮罩、右上角 × 或 Esc 关闭；关闭后焦点归还触发元素。面板头是标题 + 用例号 + 一句说明，
正文复用用例页内容，不复制第二套样式。

## Do's and Don'ts

### Do:
- **Do** 让每个判定都能在同一屏找到依据：判定点 → 指标 → 违规 → 拆解入口。
- **Do** 用 1px 细线灰分组，用底色分层，而不是加深边框。
- **Do** 给浮层加方向正确的影（抽屉只向左），并保留 220–280ms 的位移过渡。
- **Do** 数字用等宽、右对齐、`tnum`。

### Don't:
- **Don't** 用彩色左边条、粗描边或零偏移光晕来表达状态。
- **Don't** 把状态色当装饰；弃权不得用红色。
- **Don't** 在卡片里再套卡片，或用超过 16px 的圆角做内容容器。
- **Don't** 用渐变文字、玻璃拟态或发光描边制造“科技感”。
- **Don't** 在一个操作区放两个实心主按钮。

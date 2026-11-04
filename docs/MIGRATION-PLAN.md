# 第二域迁移改造清单

目标：把「AI 与 6G 结合」从叙事变成可演示的能力——用 AI 生成针对 AI 网元的测试意图，并在产品里现场切换域。

决策基线：ADR-0007（受众只有评委）、ADR-0008（第二域只作迁移证明）、ADR-0009（判据来源降级）。术语见根目录 `GLOSSARY.md`。

成功判据：端到端无人工干预跑通 1 条条款，报告给出四项数字。不设分数阈值；跑不通照实写卡点。

---

## A. 口径与文档（先做，零风险）

- [ ] `webapp/PRODUCT.md:11-13` Users 段只保留评委，删除三个次要受众。
- [ ] `webapp/PRODUCT.md:24` Positioning 加入主构句：「用 AI 生成针对 AI 网元的测试意图」。
- [ ] `docs/NARRATIVE.md:49-52` 「谁会用」改为「能力可迁移的场景」，不点名角色。
- [ ] `docs/NARRATIVE.md:54-57` 「走到哪」把第二域从"下一步"改为"已做迁移实验"。
- [ ] `docs/6G-RELEVANCE.md` 迁移对象补上 TS 28.105 §6.2c.2 + §7，并注明判据降级。
- [ ] 网页端不新增任何受众说明；`webapp/views/AboutView.tsx:251` 原句保留。

## B. 第二域数据与符号表

- [ ] 新切分器：从 TS 28.105 §6.2c.2（消费者请求测试）+ §7 信息模型抽出 1 条条款，产出 `data/ctx/ml/<id>.json`。
- [ ] 符号表生产者（新增 `tools/build_symbols_ml.py`）：输出与现有 `messages/fields/paths` 同构的结构。
  - 必须补齐 `known_uncovered` / `all_definitions` / `all_defined_names` 三个键，否则 `tools/validate.py:90` 会把合法输出静默全判违规。
- [ ] 域 profile：`data/domains/rrc.json` 与 `data/domains/ml.json`，字段：域 id、符号表路径、case 正则、提示词、词表（SS/UE 之类）。

## C. 流水线与后端

- [ ] `tools/validate.py`：R1/R2 的 `known/fields` 改从域 profile 读；`MESSAGE_FIELD_EXTRA`（:23-30）、`NON_RRC`（:17-19）、`expand_message`（:46-61）配置化。R3 不动（纯索引，与域无关）。
- [ ] `tools/gen_ie.py:11-40`、`tools/gen_steps.py`：SIB/RRC 正则、提示词、SS/UE 词表改从 profile 读；注意 `gen_ie.py:121` 只取前 60 个字段做骨架，ML 域 schema 需确认是否失真。
- [ ] `scripts/run_one.py`、`tools/stage_tools.py`：`SYMBOLS` 路径与 case 过滤改配置；ingest 阶段接新切分器。
- [ ] `scripts/serve.py`：case 正则（:487 `^6\.`、:1125 `[0-9.]+`、:1340 `^6\.7\.1\.`）与 guide 文案支持域；列表接口加 domain 参数。
- [ ] 隐藏耦合参数化：`tools/score.py:12` 的 `L3_SKIP`、`:80-87` 的 `-rNN` 剥离、`l1_ok` 的 SS/UE 限制。
- [ ] 同步 `results/symbols/rrc_symbols.json` 与 `data/` 双份快照。

## D. 前端

- [ ] `webapp/lib/api.ts:3-7,172`：`CaseItem` 加 `domain`，`cases()` 加参数。
- [ ] `webapp/lib/evidence.ts:21-34`：符号表路径按域。
- [ ] `webapp/views/CaseView.tsx:218-220`：`/data/ir/ie/<id>.json`、`/data/out/<id>.json`、`/data/ctx/<id>.json` 按域命名空间。
- [ ] 顶部域切换器（新组件）：切换后用例库、意图、证据链整体换。
- [ ] `webapp/app/page.tsx:15` INSTRUCTIONS 里写死的 §6.7 按域。

## E. 迁移实验与报告

- [ ] 跑通第二域 1 条条款：生成 → 校验 → 导出，全程无人工干预。
- [ ] 采集四项数字：R1/R2/R3 通过率、判定覆盖率、人工复核一致率、符号表建设工时。
- [ ] 主指标：判定覆盖率 × 人工复核一致率。
- [ ] 写 `docs/MIGRATION-REPORT.md`（一页），含判据降级说明与失败模式清单。
- [ ] `docs/DEMO.md` 增加 30 秒切域片段。

---

## 风险清单（按危险程度）

1. `tools/validate.py:90` 把三个键当合法消息集——新域缺键会「正常工作但全判违规」，演示前极难发现。
2. `tools/gen_ie.py:121` 字段骨架截断 60 个，大 schema 会失真。
3. 前端与结果目录的符号表双份快照不同步。
4. `tools/leaf_ies.py:13`、`skills/*.md`、`tests/test_defects.py` 绑定 ASN.1 字段名，容易漏改。

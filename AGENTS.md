# VeriSpec

把 3GPP 规范条款编译成可校验测试意图的验证工作台：Python API（`scripts/serve.py`）+ Next 前端（`webapp/`）。

## 导航

- 文档索引：[docs/INDEX.md](docs/INDEX.md)
- 术语表：[GLOSSARY.md](GLOSSARY.md)
- 视觉规范：[webapp/DESIGN.md](webapp/DESIGN.md)
- 决策记录：[docs/adr/](docs/adr/)
- 迁移报告：[docs/MIGRATION-REPORT.md](docs/MIGRATION-REPORT.md)

## 常用命令

- 启动：`start.bat`（后端 8000、前端 3000）
- 类型检查：`cd webapp && npm run typecheck`
- 两域回归：`python scripts/verify_domains.py`
- 后端日志：`data/logs/serve.log`
- 提交闸门：`git config core.hooksPath .githooks`（类型检查 + 两域回归）

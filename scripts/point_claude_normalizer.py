#!/usr/bin/env python3
"""把 Claude Code 的 ANTHROPIC_BASE_URL 指向本地归一化代理（或改回直连 cc-switch）。

只改 `env.ANTHROPIC_BASE_URL` 一个字段，其它内容原样保留；首次修改前备份为
`settings.json.bak-normalizer`，重复执行不会覆盖已有备份。

用法
----
    py -3.12 scripts/point_claude_normalizer.py            # 指向 15722（归一化代理）
    py -3.12 scripts/point_claude_normalizer.py --revert   # 改回 15721（直连 cc-switch）

注意：settings.json 里的 env 只在 Claude Code 启动时读取，改完要重启 claude。
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys

DEFAULT_SETTINGS = r"D:\claude-home\.claude\settings.json"
NORMALIZER_URL = "http://127.0.0.1:15722"
DIRECT_URL = "http://127.0.0.1:15721"


def main() -> int:
    ap = argparse.ArgumentParser(description="切换 Claude Code 的本地代理指向")
    ap.add_argument("--settings", default=os.environ.get("CLAUDE_SETTINGS") or DEFAULT_SETTINGS)
    ap.add_argument("--port", type=int, default=None, help="自定义目标端口")
    ap.add_argument("--revert", action="store_true", help="改回直连 cc-switch（15721）")
    args = ap.parse_args()

    path = os.path.expandvars(os.path.expanduser(args.settings))
    if not os.path.isfile(path):
        print(f"找不到配置文件：{path}", file=sys.stderr)
        return 2

    target = args.port or (15721 if args.revert else 15722)
    url = f"http://127.0.0.1:{target}"

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    old = ((data.get("env") or {}).get("ANTHROPIC_BASE_URL"))
    if old == url:
        print(f"已经是 {url}，无需修改")
        return 0

    bak = path + ".bak-normalizer"
    if not os.path.exists(bak):
        shutil.copyfile(path, bak)
        print(f"已备份：{bak}")
    else:
        print(f"备份已存在，保留不动：{bak}")

    data.setdefault("env", {})["ANTHROPIC_BASE_URL"] = url
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    mode = "直连 cc-switch" if target == 15721 else "归一化代理"
    print(f"ANTHROPIC_BASE_URL: {old} -> {url}  ({mode})")
    print("重启 Claude Code 后生效。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

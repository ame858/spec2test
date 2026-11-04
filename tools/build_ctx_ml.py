"""第二域上下文构建：把 benchmark 的 inputs 复制为 ctx。

第一域用 PDF 切分（build_ir.py）；第二域的条款已经是结构化文本，不需要切分。
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BENCH = os.path.join(ROOT, "data", "benchmark", "ml")
CTX = os.path.join(ROOT, "data", "ctx", "ml")
KEYS = ("test_purpose", "conformance_requirements", "pre_test_conditions")


def main():
    os.makedirs(CTX, exist_ok=True)
    n = 0
    for name in sorted(os.listdir(BENCH)):
        if not name.endswith(".json"):
            continue
        with open(os.path.join(BENCH, name), encoding="utf-8") as f:
            bench = json.load(f)
        ins = bench.get("inputs", {})
        ctx = {"case_id": bench.get("case_id", name[:-5]), "title": bench.get("title", "")}
        ctx.update({k: ins.get(k, "") for k in KEYS})
        with open(os.path.join(CTX, name), "w", encoding="utf-8") as f:
            json.dump(ctx, f, ensure_ascii=False, indent=2)
        n += 1
    print("ctx=%d -> %s" % (n, CTX))


if __name__ == "__main__":
    main()

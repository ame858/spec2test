"""确定性回归：一条命令验证两个域。

- 第一域 gold：0 违规
- 第一域缺陷集：仍有违规
- 第二域：revalidate 跑通且 L1 合法

不调用模型；失败时非零退出。
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TOOLS = os.path.join(ROOT, "tools")
sys.path.insert(0, TOOLS)
import validate as validate_mod


def _load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _irs(path):
    data = _load(path)
    return [x for x in (data if isinstance(data, list) else [data]) if isinstance(x, dict)]


def check_gold():
    sym = _load(os.path.join(ROOT, "data", "symbols", "rrc_symbols.json"))
    gold_dir = os.path.join(ROOT, "data", "gold_ir")
    total = 0
    for name in sorted(os.listdir(gold_dir)):
        if name.endswith(".json"):
            for ir in _irs(os.path.join(gold_dir, name)):
                total += len(validate_mod.validate(ir, sym))
    return total == 0, "gold violations=%d" % total


def check_defects():
    sym = _load(os.path.join(ROOT, "data", "symbols", "rrc_symbols.json"))
    ddir = os.path.join(ROOT, "data", "defects")
    hit = 0
    files = 0
    for name in sorted(os.listdir(ddir)):
        if not name.endswith(".json") or name.startswith("_"):
            continue
        files += 1
        if any(validate_mod.validate(ir, sym) for ir in _irs(os.path.join(ddir, name))):
            hit += 1
    return hit == files and files > 0, "defects detected=%d/%d" % (hit, files)


def check_ml():
    ir = os.path.join(ROOT, "data", "out", "ml", "ml.1.json")
    if not os.path.exists(ir):
        return False, "missing %s" % os.path.relpath(ir, ROOT)
    cmd = [sys.executable, os.path.join(ROOT, "scripts", "run_one.py"), "ml.1",
           "--domain", "ml", "--revalidate", "--ir-file", ir, "--no-write"]
    proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    if proc.returncode != 0:
        return False, "run_one exit=%d" % proc.returncode
    for line in (proc.stdout or "").splitlines():
        try:
            ev = json.loads(line)
        except ValueError:
            continue
        if ev.get("stage") == "score":
            l1 = (ev.get("detail") or {}).get("L1")
            return l1 == 1.0, "ml L1=%s" % l1
    return False, "no score event"


def main():
    checks = [("rrc-gold", check_gold), ("rrc-defects", check_defects), ("ml-revalidate", check_ml)]
    ok = True
    for name, fn in checks:
        passed, detail = fn()
        print("%-14s %s  %s" % (name, "PASS" if passed else "FAIL", detail))
        ok = ok and passed
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())

"""域注册表：一套规范对应一组路径、词表与提示词。

六阶段骨架不随域改变；这里只放「换个域就要换」的东西。
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")

RRC_STEPS_SYSTEM = (
    "你是 3GPP 测试规范助手。只输出 JSON，不要解释。格式："
    '{"steps":[{"st":1,"actor":"SS","direction":"S->U","message":"消息名或空串","tp_ref":[1]}]}。'
    "每条步骤必须含 st(整数)、actor(SS 或 UE)、direction(S->U 或 U->S)、message(字符串，未知则空串)。"
)

RRC_IE_SYSTEM = (
    "你是 3GPP RRC 信令内容助手。只输出 JSON，不要解释。"
    '格式：{"message":"<消息名>","derivation_path":"<模板来源>",'
    '"ies":[{"name":"<字段名>","value":"<取值>","condition":"<条件或空串>"}]}。'
    "字段名必须是该消息 ASN.1 里真实存在的字段；取值写具体值（如 10、true、Not present）。"
    "若 validation_errors 非空，必须修正这些字段：只能使用 default_template_fields "
    "或全局标识符里的字段。"
)

ML_STEPS_SYSTEM = (
    "你是 3GPP AI/ML 管理规范助手。只输出 JSON，不要解释。格式："
    '{"steps":[{"st":1,"actor":"MnS consumer","direction":"consumer->producer",'
    '"message":"IOC 名或空串","tp_ref":[1]}]}。'
    "每条步骤必须含 st(整数)、actor(MnS consumer 或 MnS producer)、"
    "direction(consumer->producer 或 producer->consumer)、message(字符串，未知则空串)。"
    "message 只能取信息模型里存在的 IOC 名。"
)

ML_IE_SYSTEM = (
    "你是 3GPP AI/ML 管理信息模型助手。只输出 JSON，不要解释。"
    '格式：{"message":"<IOC 名>","derivation_path":"<模板来源>",'
    '"ies":[{"name":"<属性名>","value":"<取值>","condition":"<条件或空串>"}]}。'
    "属性名必须是该 IOC 在 TS 28.105 第 7 章里真实存在的属性；取值写具体值。"
    "若 validation_errors 非空，必须修正这些字段：只能使用 default_template_fields "
    "或全局标识符里的属性。"
)

DOMAINS = {
    "rrc": {
        "id": "rrc",
        "label": "RRC 域",
        "bench": os.path.join(DATA, "benchmark", "v0"),
        "ctx": os.path.join(DATA, "ctx"),
        "symbols": os.path.join(DATA, "symbols", "rrc_symbols.json"),
        "actors": ("SS", "UE"),
        "directions": ("S->U", "U->S"),
        "generic_message_names": False,
        "steps_system": RRC_STEPS_SYSTEM,
        "ie_system": RRC_IE_SYSTEM,
    },
    "ml": {
        "id": "ml",
        "label": "ML 域",
        "bench": os.path.join(DATA, "benchmark", "ml"),
        "ctx": os.path.join(DATA, "ctx", "ml"),
        "symbols": os.path.join(DATA, "symbols", "ml_symbols.json"),
        "actors": ("MnS consumer", "MnS producer"),
        "directions": ("consumer->producer", "producer->consumer"),
        "generic_message_names": True,
        "steps_system": ML_STEPS_SYSTEM,
        "ie_system": ML_IE_SYSTEM,
    },
}


def get(name=None):
    key = (name or os.environ.get("VERISPEC_DOMAIN") or "rrc").strip().lower()
    if key not in DOMAINS:
        raise KeyError("unknown domain: %s" % key)
    return DOMAINS[key]


def list_cases(name=None):
    d = get(name)
    return sorted(n[:-5] for n in os.listdir(d["bench"]) if n.endswith(".json"))

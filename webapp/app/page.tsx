"use client";

import { CopilotChat } from "@copilotkit/react-ui";
import { CornerDownLeft, PanelLeft, Search, SquarePen } from "lucide-react";
import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { ChatHistoryBridge } from "@/components/copilot/ChatHistoryBridge";
import { ConversationList } from "@/components/copilot/ConversationList";
import { CopilotActions } from "@/components/copilot/actions";
import { ChatInput } from "@/components/copilot/ChatInput";
import { EditableTitle } from "@/components/copilot/EditableTitle";
import { TracePanel } from "@/components/copilot/TracePanel";
import { currentConversationId, ensureConversation, newConversation } from "@/lib/conversation";
import { api, type CaseItem } from "@/lib/api";
import { getDomain, setDomain, subscribeDomain } from "@/lib/domain";

const SIDEBAR_KEY = "verispec-sidebar";

const INSTRUCTIONS = `你是 VeriSpec 的测试意图编译器助手，只覆盖 3GPP TS 38.523-1 §6.7 的 8 个 NR NTN 用例。
规则：
1. 用户给出用例号或能对应到某用例的场景时，调用 run_case；不确定就追问。
2. 所有数字与判定只能来自 action 返回结果，禁止自行生成。
3. abstained 是弃权、reject 是拒收，都不能说成“通过”；failed 直接说明失败原因。
4. 不编造不存在的用例号；范围外请求明确说明只覆盖 §6.7 的 8 个用例。
5. run_case 失败时如实说明原因；不得根据证据推测、还原或编造步骤与字段取值。
6. 用户要看分析/图表时调用 analyze_case；不要自己编造图表数据。
7. 运行参数（生成范围、修复轮数、严格度、候选消息）由输入框「+」菜单和审批卡决定，你不要向用户索要或自行设定。
8. 遇到校验违规（R1/R2/R3）或拿不准字段取舍时，先调用 list_skills / use_skill 加载对应技能，再说明怎么修；不要凭记忆编规则。
9. 六阶段证据（阶段 / 状态 / 说明）要调用 get_case_evidence 用卡片呈现，不要自己排表或复述细节。
10. 书面中文，不用口语和比喻（如“捞到”“大礼包”“空转”）。结论在前，依据在后。
11. 问题定位最多 3 条，每条只能引用 action 返回的阶段状态、字段名或数值；不要推断未返回的内部实现。
12. 证据不足时直接写“现有证据无法判断根因”，并给出最多两条可验证的下一步（重跑、换用例对照、打开用例面板）。`;

type TraceTarget = { jobId: string; case: string };

const STEPS = [
  { n: "01", t: "读取规范", d: "条款切片 + 符号表" },
  { n: "02", t: "生成意图", d: "步骤 / 消息 / 字段" },
  { n: "03", t: "确定性校验", d: "R1 · R2 · R3" },
  { n: "04", t: "判定", d: "通过 / 拒收 / 弃权" },
];

function EmptyHero() {
  const [domain, setDomainState] = useState<"rrc" | "ml">("rrc");
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setDomainState(getDomain());
    return subscribeDomain(() => setDomainState(getDomain()));
  }, []);

  useEffect(() => {
    let alive = true;
    api.cases().then((c) => alive && setCases(c)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [domain]);

  const scope =
    domain === "ml"
      ? "覆盖 1 个用例 · TS 28.105 §6.2c · AI/ML 管理"
      : "覆盖 8 个用例 · TS 38.523-1 §6.7 · NR NTN";

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return cases.filter((c) => !k || c.case.includes(k) || (c.title || "").toLowerCase().includes(k));
  }, [cases, q]);

  const run = (id: string) => {
    setDomain(id.startsWith("ml.") ? "ml" : "rrc");
    window.dispatchEvent(new CustomEvent("s2t-send", { detail: `运行用例 ${id}` }));
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((v) => Math.min(v + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((v) => Math.max(v - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[idx]) run(filtered[idx].case);
      else if (q.trim()) window.dispatchEvent(new CustomEvent("s2t-send", { detail: q.trim() }));
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center px-6">
      <div className="pointer-events-auto w-full max-w-[56rem]">
        <h1 className="text-[32px] font-semibold leading-[1.12] tracking-[-0.02em] text-ink sm:text-[40px]">
          从条款到判定，四步
        </h1>
        <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-muted">
          模型只负责生成与修复；通过与否由确定性规则给出。
        </p>

        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.n} className="relative rounded-[10px] border border-line bg-canvas px-4 py-4">
              <div className="font-mono text-xs text-muted tabular-nums">{s.n}</div>
              <div className="mt-2 text-sm font-medium text-ink">{s.t}</div>
              <div className="mt-1 text-xs leading-relaxed text-muted">{s.d}</div>
              {i < STEPS.length - 1 && (
                <span className="absolute -right-2 top-1/2 hidden h-px w-4 bg-line lg:block" aria-hidden />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6">
          <div className="flex h-12 items-center gap-3 rounded-[14px] border border-line bg-canvas px-3 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_rgb(0_0_0/0.06)]">
            <Search className="h-4 w-4 text-muted" />
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setIdx(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="输入用例号，或描述一个场景…"
              className="h-full flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
            />
            <CornerDownLeft className="h-4 w-4 text-muted" />
          </div>
          {q.trim() && (
            <div className="mt-1.5 overflow-hidden rounded-[10px] border border-line bg-canvas">
              {filtered.slice(0, 5).map((c, i) => (
                <button
                  key={c.case}
                  type="button"
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => run(c.case)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                    i === idx ? "bg-accent/10" : "hover:bg-surface"
                  }`}
                >
                  <span className="font-mono text-xs text-ink tabular-nums">{c.case}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted">{c.title}</span>
                  <span className="text-xs text-muted">运行</span>
                </button>
              ))}
              {!filtered.length && (
                <div className="px-3 py-2 text-xs text-muted">没有匹配的用例，回车直接发送这句话</div>
              )}
            </div>
          )}
        </div>

        <p className="mt-2 text-xs text-muted">{scope} · ↑↓ 选择 · Enter 运行</p>
      </div>
    </div>
  );
}

export default function Page() {
  const [trace, setTrace] = useState<TraceTarget | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHydrated, setSidebarHydrated] = useState(false);
  const [title, setTitle] = useState("");
  const [hasMessages, setHasMessages] = useState(false);
  const [convLoaded, setConvLoaded] = useState(false);

  useEffect(() => {
    try {
      setSidebarOpen(localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {
      /* 隐私模式下保持默认关闭 */
    }
    setSidebarHydrated(true);
  }, []);

  useEffect(() => {
    if (!sidebarHydrated) return;
    try {
      localStorage.setItem(SIDEBAR_KEY, sidebarOpen ? "1" : "0");
    } catch {
      /* 忽略写入失败 */
    }
  }, [sidebarOpen, sidebarHydrated]);

  useEffect(() => {
    const raw = window.location.hash.replace(/^#\/?/, "");
    const [path, query] = raw.split("?");
    if (!path) return;
    if (path === "case") {
      const id = new URLSearchParams(query || "").get("case");
      if (id) window.location.replace(`/case/${encodeURIComponent(id)}`);
      return;
    }
    if (["data", "eval", "api", "about", "chat"].includes(path)) {
      window.location.replace(path === "chat" ? `/${query ? "?" + query : ""}` : `/${path}`);
    }
  }, []);

  useEffect(() => {
    ensureConversation()
      .then(() => window.dispatchEvent(new Event("s2t-conv-changed")))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async (id: string | null) => {
      if (!id) {
        if (alive) {
          setTitle("");
          setHasMessages(false);
          setConvLoaded(true);
        }
        return;
      }
      try {
        const detail = await api.conversation(id);
        if (alive) {
          setTitle(detail.title || "");
          setHasMessages((detail.messages || []).length > 0);
          setConvLoaded(true);
        }
      } catch {
        if (alive) {
          setHasMessages(false);
          setConvLoaded(true);
        }
      }
    };
    load(currentConversationId());
    const onChanged = () => load(currentConversationId());
    const onLoad = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      setConvLoaded(false);
      load(id || currentConversationId());
    };
    const onNew = () => {
      setTitle("");
      setHasMessages(false);
      setConvLoaded(true);
    };
    window.addEventListener("s2t-conv-changed", onChanged);
    window.addEventListener("s2t-load-conv", onLoad);
    window.addEventListener("s2t-new-conv", onNew);
    return () => {
      alive = false;
      window.removeEventListener("s2t-conv-changed", onChanged);
      window.removeEventListener("s2t-load-conv", onLoad);
      window.removeEventListener("s2t-new-conv", onNew);
    };
  }, []);

  useEffect(() => {
    const onTrace = (e: Event) => {
      const d = (e as CustomEvent<TraceTarget>).detail;
      if (d?.jobId && d?.case) setTrace(d);
    };
    window.addEventListener("s2t-trace", onTrace);
    return () => window.removeEventListener("s2t-trace", onTrace);
  }, []);

  const persistUserMessage = async (content: string) => {
    const cid = await ensureConversation();
    try {
      await api.appendMessage(cid, "user", content);
      setHasMessages(true);
      window.dispatchEvent(new Event("s2t-conv-changed"));
    } catch {
      /* 写入失败不阻塞发送 */
    }
  };

  const newChat = async () => {
    await newConversation();
    window.dispatchEvent(new Event("s2t-new-conv"));
    window.dispatchEvent(new Event("s2t-conv-changed"));
  };

  const saveTitle = async (next: string) => {
    const id = currentConversationId();
    if (!id) return;
    try {
      await api.renameConversation(id, next);
      setTitle(next);
      window.dispatchEvent(new Event("s2t-conv-changed"));
    } catch {
      /* 保存失败保持原标题 */
    }
  };

  return (
    <div className="flex h-full min-h-0">
      <aside
        aria-label="对话"
        aria-hidden={!sidebarOpen}
        className={`shrink-0 overflow-hidden border-r border-line/70 bg-canvas transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          sidebarOpen ? "w-[260px]" : "w-0 border-r-0"
        }`}
      >
        <div className="h-full w-[260px]">
          <ConversationList onCollapse={() => setSidebarOpen(false)} />
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1">
          <div className="global-floating pointer-events-none absolute inset-x-3 top-3 z-10 flex items-center gap-2">
            <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-line/80 bg-canvas/85 p-1 shadow-[0_1px_2px_rgb(0_0_0/0.04)] backdrop-blur">
              {!sidebarOpen && (
                <button
                  type="button"
                  aria-label="展开侧栏"
                  aria-expanded={false}
                  onClick={() => setSidebarOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <PanelLeft className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                aria-label="新建对话"
                onClick={() => void newChat()}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <SquarePen className="h-4 w-4" />
              </button>
            </div>
            {hasMessages && (
              <div className="pointer-events-auto flex h-10 max-w-[42vw] items-center rounded-full border border-line/80 bg-canvas/85 px-1 shadow-[0_1px_2px_rgb(0_0_0/0.04)] backdrop-blur sm:max-w-none">
                <EditableTitle title={title} onSave={saveTitle} />
              </div>
            )}
          </div>

          {convLoaded && !hasMessages && <EmptyHero />}
          <ChatHistoryBridge />
          <CopilotActions />
          <div className={`chat-sparse h-full ${convLoaded && !hasMessages ? "hero-mode" : ""}`}>
            <CopilotChat
              className="h-full"
              labels={{
                title: "VeriSpec 助手",
                initial: "",
              }}
              instructions={INSTRUCTIONS}
              onSubmitMessage={persistUserMessage}
              Input={ChatInput}
            />
          </div>
        </div>
      </main>

      {trace && <TracePanel jobId={trace.jobId} caseId={trace.case} onClose={() => setTrace(null)} />}
    </div>
  );
}

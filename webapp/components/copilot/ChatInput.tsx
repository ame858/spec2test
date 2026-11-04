"use client";

import { ArrowUp, Check, ChevronLeft, ChevronRight, Mic, Plus, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, type SkillItem, type ToolItem } from "@/lib/api";
import {
  ENGINE_LABELS,
  MODE_LABELS,
  REPAIR_CHOICES,
  STRICTNESS_LABELS,
  resetRunOptions,
  setRunOptions,
  useRunOptions,
  type Engine,
  type RunMode,
  type Strictness,
} from "@/lib/runParams";

type Props = {
  inProgress: boolean;
  onSend: (text: string) => Promise<unknown>;
  onStop?: () => void;
  chatReady?: boolean;
  isVisible?: boolean;
};

/** 空态示例 chip 通过事件把一句话送进对话，避免从外部直接改 CopilotKit 内部状态。 */
const SEND_EVENT = "s2t-send";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-1 py-1">
      {title && (
        <div className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted">{title}</div>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Choice({
  active,
  label,
  onClick,
}: {
  active?: boolean;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        {active && <Check className="h-3.5 w-3.5 text-accent-ink" />}
      </span>
      <span className="flex-1">{label}</span>
    </button>
  );
}

function NavRow({
  title,
  meta,
  active,
  onClick,
}: {
  title: string;
  meta: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 border-t border-line/60 px-3 py-1.5 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
        active ? "bg-accent/10 text-accent-ink" : "hover:bg-accent/10"
      }`}
    >
      <span className="flex-1">{title}</span>
      <span className="text-[10px] text-muted">{meta}</span>
      <ChevronRight className="h-3.5 w-3.5 text-muted" />
    </button>
  );
}

export function ChatInput({ inProgress, onSend, onStop, chatReady }: Props) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"main" | "skills" | "mcp">("main");
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [micOn, setMicOn] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const opts = useRunOptions();
  const boxRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onExternalSend = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (text && !inProgress) void onSend(text);
    };
    window.addEventListener(SEND_EVENT, onExternalSend);
    return () => window.removeEventListener(SEND_EVENT, onExternalSend);
  }, [onSend, inProgress]);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setMicSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => recRef.current?.stop();
  }, []);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    api
      .skills()
      .then((r) => alive && setSkills(r.skills ?? []))
      .catch(() => {});
    api
      .tools()
      .then((r) => alive && setTools((r.tools ?? []).filter((t) => !t.eval_only)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(160, ta.scrollHeight)}px`;
  }, [text]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const send = async () => {
    const v = text.trim();
    if (!v || inProgress) return;
    setText("");
    await onSend(v);
  };

  const readonly = tools.filter((t) => !t.model);
  const effectiveTools = opts.mcpTools ?? readonly.map((t) => t.name);

  const toggleMic = () => {
    if (micOn) {
      recRef.current?.stop();
      setMicOn(false);
      return;
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => any;
      webkitSpeechRecognition?: new () => any;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "zh-CN";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const said = Array.from(e.results as ArrayLike<any>)
        .map((r: any) => r[0]?.transcript ?? "")
        .join("");
      if (said) setText((prev) => (prev ? `${prev} ${said}` : said));
    };
    rec.onend = () => setMicOn(false);
    rec.onerror = () => setMicOn(false);
    recRef.current = rec;
    rec.start();
    setMicOn(true);
  };

  const toggleSkill = (name: string) =>
    setRunOptions({
      skills: opts.skills.includes(name)
        ? opts.skills.filter((x) => x !== name)
        : [...opts.skills, name],
    });

  const toggleTool = (name: string) =>
    setRunOptions({
      mcpTools: effectiveTools.includes(name)
        ? effectiveTools.filter((x) => x !== name)
        : [...effectiveTools, name],
    });

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (opts.engine !== "pipeline")
    chips.push({
      key: "engine",
      label: ENGINE_LABELS[opts.engine],
      clear: () => setRunOptions({ engine: "pipeline" }),
    });
  if (opts.mode !== "full")
    chips.push({ key: "mode", label: MODE_LABELS[opts.mode], clear: () => setRunOptions({ mode: "full" }) });
  if (opts.repairs !== 1)
    chips.push({
      key: "repairs",
      label: opts.repairs === 0 ? "不修复" : `修复 ${opts.repairs} 轮`,
      clear: () => setRunOptions({ repairs: 1 }),
    });
  if (opts.strictness !== "strict")
    chips.push({
      key: "strictness",
      label: STRICTNESS_LABELS[opts.strictness],
      clear: () => setRunOptions({ strictness: "strict" }),
    });
  if (opts.messages.length)
    chips.push({
      key: "messages",
      label: `消息 ${opts.messages.join(" / ")}`,
      clear: () => setRunOptions({ messages: [] }),
    });
  opts.skills.forEach((name) =>
    chips.push({
      key: `skill-${name}`,
      label: `技能 ${name}`,
      clear: () => setRunOptions({ skills: opts.skills.filter((x) => x !== name) }),
    })
  );
  if (opts.mcpTools && readonly.length)
    chips.push({
      key: "mcp",
      label: `MCP ${opts.mcpTools.length}/${readonly.length}`,
      clear: () => setRunOptions({ mcpTools: null }),
    });

  return (
    <div ref={boxRef} className="relative mx-auto w-full max-w-[46rem]">
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 flex items-start gap-2">
          <div className="w-[15rem] overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
            <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
              <span className="text-xs font-medium">运行参数</span>
              <button
                type="button"
                className="text-[11px] text-muted hover:text-accent-ink"
                onClick={() => resetRunOptions()}
              >
                恢复默认
              </button>
            </div>
            <div className="max-h-[52vh] overflow-y-auto scroll-thin">
              <Group title="编排方式">
                {(Object.keys(ENGINE_LABELS) as Engine[]).map((e) => (
                  <Choice
                    key={e}
                    active={opts.engine === e}
                    label={ENGINE_LABELS[e]}
                    onClick={() => setRunOptions({ engine: e })}
                  />
                ))}
              </Group>
              {opts.engine === "pipeline" && (
                <>
                  <Group title="生成范围">
                    {(Object.keys(MODE_LABELS) as RunMode[]).map((m) => (
                      <Choice
                        key={m}
                        active={opts.mode === m}
                        label={MODE_LABELS[m]}
                        onClick={() => setRunOptions({ mode: m })}
                      />
                    ))}
                  </Group>
                  <Group title="修复轮数">
                    {REPAIR_CHOICES.map((n) => (
                      <Choice
                        key={n}
                        active={opts.repairs === n}
                        label={n === 0 ? "不修复" : n === 1 ? "1 轮（默认）" : `最多 ${n} 轮`}
                        onClick={() => setRunOptions({ repairs: n })}
                      />
                    ))}
                  </Group>
                  <Group title="校验严格度">
                    {(Object.keys(STRICTNESS_LABELS) as Strictness[]).map((s) => (
                      <Choice
                        key={s}
                        active={opts.strictness === s}
                        label={STRICTNESS_LABELS[s]}
                        onClick={() => setRunOptions({ strictness: s })}
                      />
                    ))}
                  </Group>
                </>
              )}
              <NavRow
                title="技能"
                meta={opts.skills.length ? `${opts.skills.length}` : `${skills.length}`}
                active={view === "skills"}
                onClick={() => setView(view === "skills" ? "main" : "skills")}
              />
              <NavRow
                title="MCP 连接器"
                meta={`${effectiveTools.length}/${readonly.length}`}
                active={view === "mcp"}
                onClick={() => setView(view === "mcp" ? "main" : "mcp")}
              />
            </div>
          </div>

          {view !== "main" && (
            <div className="w-[13rem] overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
              <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
                <span className="text-xs font-medium">
                  {view === "skills" ? "技能" : "MCP 连接器"}
                </span>
                <button
                  type="button"
                  aria-label="关闭子栏"
                  className="text-[11px] text-muted hover:text-accent-ink"
                  onClick={() => setView("main")}
                >
                  ×
                </button>
              </div>
              <div className="max-h-[52vh] overflow-y-auto scroll-thin">
                {view === "skills" ? (
                  <Group title="">
                    {skills.length === 0 && (
                      <div className="px-2 py-1 text-xs text-muted">读取中…</div>
                    )}
                    {skills.map((s) => (
                      <Choice
                        key={s.name}
                        active={opts.skills.includes(s.name)}
                        label={s.name}
                        onClick={() => toggleSkill(s.name)}
                      />
                    ))}
                  </Group>
                ) : (
                  <Group title="">
                    {readonly.length === 0 && (
                      <div className="px-2 py-1 text-xs text-muted">读取中…</div>
                    )}
                    {readonly.map((t) => (
                      <Choice
                        key={t.name}
                        active={effectiveTools.includes(t.name)}
                        label={t.name}
                        onClick={() => toggleTool(t.name)}
                      />
                    ))}
                    {readonly.length > 0 && (
                      <div className="flex justify-between px-2 pt-1 text-[10px] text-muted">
                        <button type="button" className="hover:text-accent-ink" onClick={() => setRunOptions({ mcpTools: null })}>
                          全选
                        </button>
                        <button type="button" className="hover:text-accent-ink" onClick={() => setRunOptions({ mcpTools: [] })}>
                          全不选
                        </button>
                      </div>
                    )}
                  </Group>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex min-h-[112px] flex-col rounded-[16px] border border-line/80 bg-canvas px-4 pb-3 pt-4 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_10px_28px_rgb(0_0_0/0.07)] transition-shadow duration-200 focus-within:border-line focus-within:shadow-[0_2px_6px_rgb(0_0_0/0.06),0_14px_36px_rgb(0_0_0/0.09)]">
        {chips.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {chips.map((c) => (
              <span
                key={c.key}
                className="inline-flex items-center gap-1 rounded-full bg-accent/10 py-0.5 pl-2 pr-1 text-[11px] text-accent-ink"
              >
                {c.label}
                <button
                  type="button"
                  aria-label={`移除 ${c.label}`}
                  className="rounded-full p-0.5 hover:bg-accent/20"
                  onClick={c.clear}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <textarea
          ref={taRef}
          rows={1}
          data-testid="copilot-chat-textarea"
          value={text}
          disabled={chatReady === false}
          placeholder="输入用例号（如 6.7.x），或描述一个场景…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          className="min-h-[60px] max-h-48 w-full flex-1 resize-none bg-transparent px-0 py-0 text-base leading-relaxed outline-none placeholder:text-muted disabled:opacity-60"
        />
        <div className="mt-2 flex items-center gap-1">
          <button
            type="button"
            aria-label="运行参数"
            onClick={() => {
              setView("main");
              setOpen((v) => !v);
            }}
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-muted transition ${
              open ? "border-accent/50 bg-accent/10 text-accent-ink" : "border-line hover:border-accent/40 hover:text-accent-ink"
            }`}
          >
            <Plus className={`h-4 w-4 transition ${open ? "rotate-45" : ""}`} />
          </button>
          <div className="ml-auto flex items-center gap-1">
            {micSupported && (
              <button
                type="button"
                aria-label={micOn ? "停止语音输入" : "语音输入"}
                aria-pressed={micOn}
                onClick={toggleMic}
                className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                  micOn ? "bg-bad/10 text-bad" : "text-ink hover:bg-surface"
                }`}
              >
                <Mic className="h-4 w-4" />
              </button>
            )}
            {inProgress ? (
              <button
                type="button"
                aria-label="停止"
                onClick={() => onStop?.()}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/20 text-ink hover:bg-muted/30"
              >
                <Square className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                aria-label="发送"
                disabled={!text.trim()}
                onClick={() => void send()}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white transition hover:bg-accent-solid disabled:opacity-40"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] leading-4 text-muted">
        内容由 AI 生成，请仔细甄别
      </p>
    </div>
  );
}

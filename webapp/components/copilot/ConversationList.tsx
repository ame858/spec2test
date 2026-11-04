"use client";

import { CirclePlus, PanelLeft, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, type Conversation } from "@/lib/api";
import { currentConversationId, newConversation } from "@/lib/conversation";

const DAY = 86400;

function groupOf(updated: number | undefined) {
  if (!updated) return "更早";
  const age = Date.now() / 1000 - updated;
  if (age < DAY) return "今天";
  if (age < 7 * DAY) return "7 天内";
  if (age < 30 * DAY) return "30 天内";
  return "更早";
}

const ORDER = ["置顶", "今天", "7 天内", "30 天内", "更早"];

export function ConversationList({ onCollapse }: { onCollapse?: () => void }) {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);

  const load = () => {
    api
      .conversations()
      .then((list) => {
        setConvs(list);
        setActive(currentConversationId());
      })
      .catch(() => setConvs([]));
  };

  useEffect(() => {
    load();
    const onChanged = () => load();
    window.addEventListener("s2t-conv-changed", onChanged);
    return () => window.removeEventListener("s2t-conv-changed", onChanged);
  }, []);

  const create = async () => {
    if (busy) return;
    const current = convs.find((c) => c.id === currentConversationId());
    if (current && (current.turns ?? 0) === 0) {
      window.dispatchEvent(new Event("s2t-new-conv"));
      return;
    }
    setBusy(true);
    try {
      await newConversation();
      window.dispatchEvent(new Event("s2t-conv-changed"));
      window.dispatchEvent(new Event("s2t-new-conv"));
    } finally {
      setBusy(false);
    }
  };

  const pick = (id: string) => {
    setActive(id);
    setMenuId(null);
    window.dispatchEvent(new CustomEvent("s2t-load-conv", { detail: id }));
  };

  const remove = async (id: string) => {
    setMenuId(null);
    if (!window.confirm("删除这个会话？删除后无法恢复。")) return;
    try {
      await api.deleteConversation(id);
    } catch {
      return;
    }
    if (id === currentConversationId()) {
      await newConversation();
      window.dispatchEvent(new Event("s2t-new-conv"));
    }
    window.dispatchEvent(new Event("s2t-conv-changed"));
  };

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const buckets: Record<string, Conversation[]> = {};
    convs
      .filter((c) => !q || (c.title || "未命名").toLowerCase().includes(q))
      .forEach((c) => {
        const key = c.id === active ? "今天" : groupOf(c.updated);
        (buckets[key] ||= []).push(c);
      });
    return ORDER.filter((k) => buckets[k]?.length).map((k) => [k, buckets[k]] as const);
  }, [convs, query, active]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 px-3 pb-2 pt-3">
        <img src="/brand/icon-512.png" alt="" aria-hidden className="mr-1 h-7 w-7 rounded-[7px]" />
        <span className="truncate text-[15px] font-semibold tracking-tight">VeriSpec</span>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            aria-label="搜索会话"
            onClick={() => setSearching((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="收起侧栏"
            onClick={onCollapse}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
      </div>

      {searching && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索会话"
              aria-label="搜索会话"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted/70"
            />
            {query && (
              <button type="button" aria-label="清空搜索" onClick={() => setQuery("")}>
                <X className="h-3.5 w-3.5 text-muted" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="px-3 pb-2">
        <button
          type="button"
          disabled={busy}
          onClick={create}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-line bg-canvas text-sm font-medium text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
        >
          <CirclePlus className="h-4 w-4" aria-hidden />
          开启新对话
        </button>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {groups.length === 0 && (
          <p className="px-2 py-2 text-xs text-muted">{query ? "没有匹配的会话" : "暂无会话"}</p>
        )}
        {groups.map(([label, list]) => (
          <section key={label} className="mb-1">
            <h3 className="px-2 pb-1 pt-2 text-[11px] font-medium text-muted">{label}</h3>
            <ul className="space-y-0.5">
              {list.map((c) => (
                <li key={c.id} className="group relative flex items-center">
                  <button
                    type="button"
                    onClick={() => pick(c.id)}
                    title={c.title}
                    className={`min-w-0 flex-1 truncate rounded-full px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                      active === c.id
                        ? "bg-accent/10 font-medium text-accent-ink"
                        : "text-ink hover:bg-surface"
                    }`}
                  >
                    {c.title || "未命名"}
                  </button>
                  <button
                    type="button"
                    aria-label={`会话操作 ${c.title || c.id}`}
                    onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                    className={`absolute right-2 flex h-6 w-6 items-center justify-center rounded-full text-muted transition-opacity hover:bg-surface focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                      menuId === c.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    ···
                  </button>
                  {menuId === c.id && (
                    <div className="absolute right-0 top-8 z-10 rounded-lg border border-line bg-canvas py-1 shadow-[0_8px_24px_rgb(0_0_0/0.10)]">
                      <button
                        type="button"
                        onClick={() => remove(c.id)}
                        className="block w-full whitespace-nowrap px-3 py-1.5 text-left text-xs text-bad hover:bg-bad/10"
                      >
                        删除会话
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-line/70 px-3 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-xs font-medium text-muted">
          本
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs text-ink">本地工作区</p>
          <p className="truncate text-[11px] text-muted">未登录 · 数据留在本机</p>
        </div>
      </div>
    </div>
  );
}

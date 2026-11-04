"use client";

import { useAgent } from "@copilotkit/react-core/v2";
import { useCallback, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { currentConversationId, setCurrentConversationId } from "@/lib/conversation";

function toAgentMessages(convId: string, messages: { role: string; content: string }[]) {
  return messages.map((m, i) => ({
    id: `${convId}-${i}`,
    role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
    content: m.content,
  }));
}

/** 把选中的会话 / 用例历史载入聊天；新对话时清空线程。 */
export function ChatHistoryBridge() {
  const { agent, isReady } = useAgent();
  const agentRef = useRef(agent);
  const saved = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    agentRef.current = agent;
  }, [agent]);

  // 回答停止变化后，用完整内容替换后端写入的一句话摘要；切换会话后不再丢失长分析
  const persist = useCallback(() => {
    const cid = currentConversationId();
    if (!cid) return;
    const last = [...agentRef.current.messages]
      .reverse()
      .find((m) => m.role === "assistant" && typeof m.content === "string" && m.content.trim());
    if (!last || typeof last.content !== "string" || !last.content.trim()) return;
    const content = last.content;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const key = `${cid}:${content}`;
      if (saved.current === key) return;
      saved.current = key;
      void api.updateLastAssistant(cid, content).catch(() => {});
    }, 1500);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const sub = agent.subscribe({ onMessagesChanged: persist });
    return () => sub.unsubscribe();
  }, [agent, isReady, persist]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  useEffect(() => {
    let alive = true;

    const loadConv = async (id: string) => {
      try {
        const detail = await api.conversation(id);
        if (!alive) return;
        setCurrentConversationId(id);
        agentRef.current.setMessages(toAgentMessages(id, detail.messages));
      } catch {
        /* 会话不存在时保持当前对话 */
      }
    };

    const onLoadConv = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id) loadConv(id);
    };

    const onNewConv = () => {
      agentRef.current.setMessages([]);
    };

    const current = currentConversationId();
    if (current && agentRef.current.messages.length === 0) loadConv(current);

    window.addEventListener("s2t-load-conv", onLoadConv);
    window.addEventListener("s2t-new-conv", onNewConv);
    return () => {
      alive = false;
      window.removeEventListener("s2t-load-conv", onLoadConv);
      window.removeEventListener("s2t-new-conv", onNewConv);
    };
  }, []);

  return null;
}

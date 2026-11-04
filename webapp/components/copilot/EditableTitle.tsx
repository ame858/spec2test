"use client";

import { Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function EditableTitle({
  title,
  onSave,
  placeholder = "未命名对话",
}: {
  title: string;
  onSave: (next: string) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(title);
  }, [title, editing]);

  useEffect(() => {
    if (!editing) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== title) onSave(next);
    else setDraft(title);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(title);
            setEditing(false);
          }
        }}
        aria-label="会话标题"
        data-testid="editable-title-input"
        className="w-[min(28rem,60vw)] rounded-md bg-surface px-2 py-1 text-sm font-medium text-ink outline-none ring-0"
      />
    );
  }

  return (
    <button
      type="button"
      data-testid="editable-title"
      onClick={() => setEditing(true)}
      className="group flex min-w-0 max-w-[min(28rem,60vw)] items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm font-medium text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      title="点击重命名"
    >
      <span className="truncate">{title || placeholder}</span>
      <Pencil
        className="h-3 w-3 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
    </button>
  );
}

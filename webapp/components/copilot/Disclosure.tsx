"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function Disclosure({
  title,
  count,
  children,
  defaultOpen = false,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded text-left text-xs text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
        <span>{title}</span>
        {typeof count === "number" && <span className="tabular-nums">· {count}</span>}
      </button>
      {open && (
        <div className="mt-1.5 border-l-2 border-line pl-4 text-sm leading-relaxed text-muted">
          {children}
        </div>
      )}
    </div>
  );
}

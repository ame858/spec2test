"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Info, MessageSquare, Plug } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DomainSwitch } from "@/components/DomainSwitch";

const NAV = [
  { href: "/", label: "对话", Icon: MessageSquare },
  { href: "/data", label: "数据与评测", Icon: BarChart3 },
  { href: "/api", label: "API", Icon: Plug },
  { href: "/about", label: "关于", Icon: Info },
];

type Health = { provider?: string; model?: string };

export function QuickNav() {
  const pathname = usePathname();
  const [health, setHealth] = useState<Health | null>(null);
  const [offline, setOffline] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    let alive = true;
    let ac: AbortController | null = null;
    const check = () => {
      const my = ++seq.current;
      ac?.abort();
      ac = new AbortController();
      fetch("/api/health", { signal: ac.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((h) => {
          if (alive && my === seq.current) {
            setHealth(h);
            setOffline(false);
          }
        })
        .catch((e) => {
          if (alive && my === seq.current && (e as Error).name !== "AbortError") setOffline(true);
        });
    };
    check();
    const id = window.setInterval(check, 15000);
    return () => {
      alive = false;
      window.clearInterval(id);
      ac?.abort();
    };
  }, []);

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="global-floating fixed right-3 top-3 z-40 flex items-center gap-1.5 sm:right-4 sm:gap-2">
      <DomainSwitch />
      <span
        role="status"
        aria-live="polite"
        title={offline ? "后端未连接" : `${health?.provider ?? "—"} · ${health?.model ?? "—"}`}
        className="hidden h-9 w-9 items-center justify-center rounded-full border border-line/80 bg-canvas/85 shadow-[0_1px_2px_rgb(0_0_0/0.04)] backdrop-blur sm:inline-flex"
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${offline ? "bg-bad" : "bg-ok"}`}
          aria-hidden
        />
      </span>

      <nav className="flex h-9 items-center gap-0.5 rounded-full border border-line/80 bg-canvas/85 px-1 shadow-[0_1px_2px_rgb(0_0_0/0.04)] backdrop-blur">
        {NAV.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active(href) ? "page" : undefined}
            title={label}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
              active(href)
                ? "bg-accent/10 text-accent-ink"
                : "text-muted hover:bg-surface hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4" />
          </Link>
        ))}
      </nav>
    </div>
  );
}

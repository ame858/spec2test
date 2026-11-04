"use client";

import { useEffect, useState } from "react";
import { DOMAINS, getDomain, setDomain, subscribeDomain, type DomainId } from "@/lib/domain";

export function DomainSwitch() {
  const [value, setValue] = useState<DomainId>("rrc");

  useEffect(() => {
    setValue(getDomain());
    return subscribeDomain(() => setValue(getDomain()));
  }, []);

  return (
    <div className="flex h-9 items-center rounded-full border border-line/80 bg-canvas/85 px-1 shadow-[0_1px_2px_rgb(0_0_0/0.04)] backdrop-blur">
      {DOMAINS.map((d) => (
        <button
          key={d.id}
          type="button"
          onClick={() => setDomain(d.id)}
          aria-pressed={value === d.id}
          className={`h-7 rounded-full px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:px-3 ${
            value === d.id ? "bg-accent/10 text-accent-ink" : "text-muted hover:bg-surface hover:text-ink"
          }`}
        >
          <span className="sm:hidden">{d.id === "rrc" ? "RRC" : "ML"}</span>
          <span className="hidden sm:inline">{d.label}</span>
        </button>
      ))}
    </div>
  );
}

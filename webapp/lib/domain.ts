const KEY = "verispec-domain";
const EVENT = "verispec-domain-changed";

export type DomainId = "rrc" | "ml";

export const DOMAINS: { id: DomainId; label: string }[] = [
  { id: "rrc", label: "RRC 域" },
  { id: "ml", label: "ML 域" },
];

export function getDomain(): DomainId {
  try {
    return localStorage.getItem(KEY) === "ml" ? "ml" : "rrc";
  } catch {
    return "rrc";
  }
}

export function setDomain(id: DomainId) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* 隐私模式下忽略 */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeDomain(fn: () => void) {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

export type DomainPaths = {
  irIe: string | null;
  out: string;
  outRejected: string;
  ctx: string;
  symbols: string;
  symbolsFallback: string;
};

export function domainPaths(): DomainPaths {
  return getDomain() === "ml"
    ? {
        irIe: null,
        out: "/data/out/ml",
        outRejected: "/data/out_rejected/ml",
        ctx: "/data/ctx/ml",
        symbols: "/data/symbols/ml_symbols.json",
        symbolsFallback: "/results/symbols/ml_symbols.json",
      }
    : {
        irIe: "/data/ir/ie",
        out: "/data/out",
        outRejected: "/data/out_rejected",
        ctx: "/data/ctx",
        symbols: "/data/symbols/rrc_symbols.json",
        symbolsFallback: "/results/symbols/rrc_symbols.json",
      };
}

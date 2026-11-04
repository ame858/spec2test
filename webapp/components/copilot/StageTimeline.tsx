"use client";

export type StageRec = {
  stage: string;
  status?: string;
  summary?: string;
  detail?: Record<string, unknown>;
};

const ORDER = ["ingest", "context", "candidates", "generate", "validate", "score"];
const LABEL: Record<string, string> = {
  ingest: "切片",
  context: "上下文",
  candidates: "候选",
  generate: "生成",
  validate: "校验",
  score: "评分",
};

function dotClass(status?: string) {
  if (status === "ok") return "bg-ok";
  if (status === "rejected" || status === "failed") return "bg-bad";
  if (status === "skipped") return "bg-line";
  return "bg-muted/40";
}

function statusText(status?: string) {
  if (status === "ok") return "完成";
  if (status === "rejected") return "拒收";
  if (status === "failed") return "失败";
  if (status === "skipped") return "跳过";
  if (status === "unavailable") return "无数据";
  return status || "未执行";
}

function statusTone(status?: string) {
  if (status === "ok") return "text-ok-ink";
  if (status === "rejected" || status === "failed") return "text-bad";
  return "text-muted";
}

export function StageTimeline({ stages }: { stages: StageRec[] }) {
  const byStage = Object.fromEntries(stages.map((s) => [s.stage, s]));
  const items = ORDER.map((key) => ({ key, ...(byStage[key] || { status: undefined, summary: "" }) }));

  return (
    <div className="mt-3">
      <div className="relative flex items-start justify-between px-1">
        <div className="absolute left-3 right-3 top-[5px] h-px bg-line" aria-hidden />
        {items.map((s) => (
          <div key={s.key} className="relative z-10 flex flex-col items-center gap-1">
            <span className={`h-2.5 w-2.5 rounded-full ring-2 ring-surface ${dotClass(s.status)}`} aria-hidden />
            <span className="text-[10px] leading-3 text-muted">{LABEL[s.key]}</span>
          </div>
        ))}
      </div>

      <table className="mt-2 w-full text-[11px]">
        <thead>
          <tr className="text-left text-muted">
            <th className="w-14 py-0.5 font-normal">阶段</th>
            <th className="w-12 py-0.5 font-normal">状态</th>
            <th className="py-0.5 font-normal">说明</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr key={s.key} className="border-t border-line/60 align-top">
              <td className="py-1 font-mono text-[10px] text-muted">{s.key}</td>
              <td className={`py-1 ${statusTone(s.status)}`}>{statusText(s.status)}</td>
              <td className="py-1 text-muted">{s.summary || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

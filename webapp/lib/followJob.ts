import { api, pollJob, type Job } from "./api";
import { setJob } from "./jobStore";
import type { RunOptions } from "./runParams";

export type FollowResult = { job: Job; sseOk: boolean; stoppedAtApproval: boolean };

/**
 * 轮询任务状态，逐帧写入 jobStore。
 *
 * 不再使用 EventSource：SSE 经 Next 代理会被缓冲，中间帧要等任务结束才到，
 * 运行卡会一直停在 queued。轮询保证阶段更新实时可见。
 * sseOk 保留原名，语义为「拿到了实时更新」。
 */
export function followJob(
  jobId: string,
  caseId: string,
  signal: AbortSignal,
  stopAtApproval = false
): Promise<FollowResult> {
  return new Promise((resolve) => {
    let settled = false;
    let last: Job = { state: "queued", log: [] };
    let timer: ReturnType<typeof setTimeout> | null = null;
    const deadline = Date.now() + 20 * 60 * 1000;

    function done(ok: boolean, stopped: boolean) {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      resolve({ job: last, sseOk: ok, stoppedAtApproval: stopped });
    }

    function onAbort() {
      done(false, false);
    }

    if (signal.aborted) return done(false, false);
    signal.addEventListener("abort", onAbort, { once: true });

    const tick = async () => {
      if (settled) return;
      if (Date.now() > deadline) return done(false, false);
      try {
        const snap = await api.job(jobId);
        last = snap;
        setJob(jobId, { ...snap, id: jobId, case: caseId });
        if (snap.state === "done" || snap.state === "failed") return done(true, false);
        if (stopAtApproval && snap.state === "awaiting_approval") return done(true, true);
      } catch {
        /* 网络抖动时继续轮询 */
      }
      timer = setTimeout(tick, 600);
    };

    void tick();
  });
}

export async function startRun(
  caseId: string,
  hitl: boolean,
  conversationId?: string,
  dryRun = false,
  options?: RunOptions
) {
  const { job_id } = await api.run(caseId, `运行用例 ${caseId}`, conversationId, hitl, dryRun, options);
  setJob(job_id, { id: job_id, state: "queued", log: [], case: caseId });
  return job_id;
}

export async function waitTerminal(jobId: string, caseId: string, signal: AbortSignal) {
  const r = await followJob(jobId, caseId, signal, false);
  if (signal.aborted) return r.job;
  if (!r.sseOk) {
    return pollJob(jobId, (j) => setJob(jobId, { ...j, id: jobId, case: caseId }), signal);
  }
  return r.job;
}

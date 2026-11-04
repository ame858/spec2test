import { describe, expect, it } from "vitest";
import { createTextBlockMerger } from "../anthropic-sse";

const sse = (event: string, data: object) =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

describe("anthropic sse merger", () => {
  it("merges consecutive text blocks into one", () => {
    const m = createTextBlockMerger();
    let out = "";
    out += m.push(
      sse("message_start", { type: "message_start", message: { id: "m1" } }) +
        sse("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }) +
        sse("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "你好" } }) +
        sse("content_block_stop", { type: "content_block_stop", index: 0 })
    );
    out += m.push(
      sse("content_block_start", { type: "content_block_start", index: 1, content_block: { type: "text", text: "" } }) +
        sse("content_block_delta", { type: "content_block_delta", index: 1, delta: { type: "text_delta", text: "世界" } }) +
        sse("content_block_stop", { type: "content_block_stop", index: 1 }) +
        sse("message_delta", { type: "message_delta", delta: { stop_reason: "end_turn" } })
    );
    out += m.flush();

    const events = out.split("\n\n").filter(Boolean).map((b) => b.split("\n")[0]);
    expect(events.filter((e) => e === "event: content_block_start")).toHaveLength(1);
    const stopCount = events.filter((e) => e === "event: content_block_stop").length;
    expect(stopCount).toBe(1);
    expect(out).toContain('"text":"你好"');
    expect(out).toContain('"text":"世界"');
    expect(out).not.toContain('"index":1');
  });

  it("drops fragmented thinking and keeps text continuous", () => {
    const m = createTextBlockMerger();
    let out = m.push(
      sse("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "thinking", thinking: "" } }) +
        sse("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "嗯" } }) +
        sse("content_block_stop", { type: "content_block_stop", index: 0 }) +
        sse("content_block_start", { type: "content_block_start", index: 1, content_block: { type: "text", text: "" } }) +
        sse("content_block_delta", { type: "content_block_delta", index: 1, delta: { type: "text_delta", text: "你好" } }) +
        sse("content_block_stop", { type: "content_block_stop", index: 1 }) +
        sse("content_block_start", { type: "content_block_start", index: 2, content_block: { type: "thinking", thinking: "" } }) +
        sse("content_block_stop", { type: "content_block_stop", index: 2 }) +
        sse("content_block_start", { type: "content_block_start", index: 3, content_block: { type: "text", text: "" } }) +
        sse("content_block_delta", { type: "content_block_delta", index: 3, delta: { type: "text_delta", text: "世界" } }) +
        sse("content_block_stop", { type: "content_block_stop", index: 3 }) +
        sse("message_stop", { type: "message_stop" })
    );
    out += m.flush();
    expect(out).not.toContain("thinking");
    expect(out.match(/event: content_block_start/g)?.length).toBe(1);
    expect(out).toContain('"text":"你好"');
    expect(out).toContain('"text":"世界"');
  });

  it("keeps tool_use blocks separate and closes text before them", () => {
    const m = createTextBlockMerger();
    let out = m.push(
      sse("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }) +
        sse("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "查一下" } }) +
        sse("content_block_stop", { type: "content_block_stop", index: 0 }) +
        sse("content_block_start", { type: "content_block_start", index: 1, content_block: { type: "tool_use", id: "t1", name: "run_case" } }) +
        sse("content_block_stop", { type: "content_block_stop", index: 1 })
    );
    out += m.flush();
    expect(out).toContain('"type":"tool_use"');
    expect(out.indexOf("content_block_stop")).toBeLessThan(out.indexOf("tool_use"));
  });
});

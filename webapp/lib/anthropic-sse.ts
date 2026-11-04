/**
 * 本地代理会把一段回复拆成多个 text content block（每个 block 只有几个 token）。
 * Anthropic 客户端会把每个 block 当成独立文本片段，界面上就出现“一句话被切成很多段”。
 * 这里在流式层把它们合并成一个 text block：保留第一段的 index，后续段落的 start/stop 丢弃，
 * delta 的 index 重写为第一段，遇到非文本块或消息结束时补一个 stop。
 */
export function createTextBlockMerger() {
  let buffer = "";
  let openText = false;
  let textIndex = 0;
  let out = "";

  const emit = (type: string, data: Record<string, unknown>) => {
    out += `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  };

  const closeText = () => {
    if (!openText) return;
    emit("content_block_stop", { type: "content_block_stop", index: textIndex });
    openText = false;
  };

  const handle = (event: string, data: Record<string, any>) => {
    const type = (data.type as string) || event;
    if (type === "content_block_start") {
      const kind = data.content_block?.type;
      if (kind === "text") {
        if (!openText) {
          openText = true;
          textIndex = data.index;
          emit("content_block_start", data);
        }
        return;
      }
      closeText();
      emit("content_block_start", data);
      return;
    }
    if (type === "content_block_delta") {
      if (data.delta?.type === "text_delta" && openText) {
        data.index = textIndex;
      }
      emit("content_block_delta", data);
      return;
    }
    if (type === "content_block_stop") {
      if (openText) return; // 合并块的 stop 在结尾统一补
      emit("content_block_stop", data);
      return;
    }
    if (type === "message_delta" || type === "message_stop") {
      closeText();
      emit(type, data);
      return;
    }
    emit(type, data);
  };

  const drain = () => {
    let cut = buffer.indexOf("\n\n");
    while (cut >= 0) {
      const raw = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      const lines = raw.split("\n");
      const eventLine = lines.find((l) => l.startsWith("event:"));
      const dataLine = lines.find((l) => l.startsWith("data:"));
      if (dataLine) {
        const event = eventLine ? eventLine.slice(6).trim() : "message";
        try {
          handle(event, JSON.parse(dataLine.slice(5).trim()));
        } catch {
          out += raw + "\n\n";
        }
      }
      cut = buffer.indexOf("\n\n");
    }
    const chunk = out;
    out = "";
    return chunk;
  };

  return {
    push(text: string) {
      buffer += text;
      return drain();
    },
    flush() {
      closeText();
      const chunk = out;
      out = "";
      return chunk;
    },
  };
}

export function mergeTextStreamResponse(res: Response): Response {
  const type = res.headers.get("content-type") || "";
  if (!res.body || !type.includes("text/event-stream")) return res;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const merger = createTextBlockMerger();

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        const tail = merger.flush();
        if (tail) controller.enqueue(encoder.encode(tail));
        controller.close();
        return;
      }
      const chunk = merger.push(decoder.decode(value, { stream: true }));
      if (chunk) controller.enqueue(encoder.encode(chunk));
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });

  return new Response(stream, { status: res.status, headers: res.headers });
}

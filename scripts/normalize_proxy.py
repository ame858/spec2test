#!/usr/bin/env python3
"""本地流式归一化代理：合并 Anthropic SSE 中被拆碎的内容块。

背景
----
cc-switch 的本地代理（默认 127.0.0.1:15721）会把上游 OpenAI 兼容接口的分片
逐个包装成**独立的 content block**。标准 Anthropic 客户端（Claude Code、网页端）
按块渲染，于是出现「一行只有几个 token」「一句话被切成很多段」。

做法
----
本进程监听一个本地端口（默认 15722），转发到 cc-switch（默认 15721）：

  claude -> 127.0.0.1:15722 (本进程) -> 127.0.0.1:15721 (cc-switch) -> 上游

只改写 `text/event-stream` 响应：
  - 连续 text block 合并成一个（沿用第一段的 index，后续 start/stop 丢弃）；
  - 碎片化 thinking block 整块丢弃（不打断文本连续性）；
  - tool_use 等非文本块原样保留，并在其之前正确闭合文本块。

非流式响应与其它路径原样透传。合并规则与 webapp/lib/anthropic-sse.ts 一致。

用法
----
    py -3.12 scripts/normalize_proxy.py --listen 15722 --upstream 15721
"""

from __future__ import annotations

import argparse
import http.client
import json
import socket
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# 逐跳头，不能透传
HOP_BY_HOP = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
}

# 透传响应时这些头必须重算或去掉
RESP_DROP = HOP_BY_HOP | {"content-length", "content-encoding"}


def _sse(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


class TextBlockMerger:
    """把被拆碎的 Anthropic SSE 事件流合并回连续文本块。

    与 webapp/lib/anthropic-sse.ts 的 createTextBlockMerger 语义一致：
      - 同时只有一个「输出块」在增长；
      - text 块可以被反复 start/stop 打断，但对外只暴露一个块；
      - thinking 块整块丢弃，且**不打断**已经打开的 text 块；
      - 遇到 tool_use 等块时先闭合 text，再开新块。
    """

    def __init__(self) -> None:
        self._buf = ""
        self._reset_stream()

    def _reset_stream(self) -> None:
        """只重置块状态，**不动缓冲区**（缓冲区里可能还有后续帧）。"""
        self._out_idx = 0          # 下一个可分配的输出 index
        self._text_open = False    # 是否已对外打开 text 块
        self._text_idx = 0         # text 块占用的输出 index
        self._cur_idx = 0          # 当前非文本块的输出 index
        self._skip_block = False   # 当前块是否整块丢弃（thinking）
        self._saw_block = False

    # ---------- 事件处理 ----------

    def _handle(self, event: str, data: dict) -> list[str]:
        typ = data.get("type") or event

        if typ == "message_start":
            self._reset_stream()  # 新一轮消息，重置块状态
            return [_sse("message_start", data)]

        if typ == "content_block_start":
            kind = ((data.get("content_block") or {}).get("type")) or ""
            if kind == "thinking" or kind == "redacted_thinking":
                # 整块丢弃，不关闭已开的 text，保证文本连续
                self._skip_block = True
                return []

            if kind == "text":
                if self._text_open:
                    # 合并：丢弃后续 text 块的 start
                    return []
                self._skip_block = False
                self._text_open = True
                self._text_idx = self._out_idx
                self._out_idx += 1
                self._saw_block = True
                data["index"] = self._text_idx
                return [_sse("content_block_start", data)]

            # tool_use / server_tool_use / image 等：先闭合 text
            out: list[str] = []
            if self._text_open:
                out.append(_sse("content_block_stop", {"type": "content_block_stop", "index": self._text_idx}))
                self._text_open = False
            self._skip_block = False
            self._cur_idx = self._out_idx
            self._out_idx += 1
            self._saw_block = True
            data["index"] = self._cur_idx
            out.append(_sse("content_block_start", data))
            return out

        if typ == "content_block_delta":
            if self._skip_block:
                return []
            dtype = (data.get("delta") or {}).get("type") or ""
            if dtype == "thinking_delta" or dtype == "signature_delta":
                return []
            if dtype == "text_delta":
                if not self._text_open:
                    # 上游没发 start 就直接给 delta：补开块，避免客户端丢字
                    self._text_open = True
                    self._text_idx = self._out_idx
                    self._out_idx += 1
                    self._saw_block = True
                data["index"] = self._text_idx
                return [_sse("content_block_delta", data)]
            # 其它 delta（input_json_delta 等）
            data["index"] = self._cur_idx
            return [_sse("content_block_delta", data)]

        if typ == "content_block_stop":
            if self._skip_block:
                self._skip_block = False
                return []
            if self._text_open:
                # 延后统一补，避免文本被切断
                return []
            data["index"] = self._cur_idx
            return [_sse("content_block_stop", data)]

        if typ in ("message_delta", "message_stop"):
            out = []
            if self._text_open:
                out.append(_sse("content_block_stop", {"type": "content_block_stop", "index": self._text_idx}))
                self._text_open = False
            out.append(_sse(typ, data))
            return out

        return [_sse(typ, data)]

    # ---------- 帧解析 ----------

    def feed(self, chunk: str) -> str:
        self._buf += chunk
        out: list[str] = []
        while True:
            cut = self._buf.find("\n\n")
            if cut < 0:
                cut = self._buf.find("\r\n\r\n")
                if cut < 0:
                    break
                raw, self._buf = self._buf[:cut], self._buf[cut + 4:]
            else:
                raw, self._buf = self._buf[:cut], self._buf[cut + 2:]

            event = ""
            data_lines: list[str] = []
            for line in raw.replace("\r\n", "\n").split("\n"):
                if line.startswith("event:"):
                    event = line[6:].strip()
                elif line.startswith("data:"):
                    data_lines.append(line[5:].lstrip())
            if not data_lines:
                continue
            payload = "\n".join(data_lines)
            try:
                data = json.loads(payload)
            except (ValueError, TypeError):
                # 无法解析就原样透传，保持兼容
                out.append(f"{raw}\n\n")
                continue
            out.extend(self._handle(event or "message", data))
        return "".join(out)

    def flush(self) -> str:
        out = ""
        if self._text_open:
            out = _sse("content_block_stop", {"type": "content_block_stop", "index": self._text_idx})
            self._text_open = False
        return out


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "ccNormalizer/1.0"

    # 由 main 注入
    upstream_host = "127.0.0.1"
    upstream_port = 15721
    verbose = False

    def log_message(self, fmt: str, *args) -> None:  # noqa: A003
        if self.verbose:
            sys.stderr.write(f"[normalize] {fmt % args}\n")

    # ---------- 工具 ----------

    def _read_body(self) -> bytes:
        length = self.headers.get("Content-Length")
        if length:
            try:
                return self.rfile.read(int(length))
            except (ValueError, OSError):
                return b""
        return b""

    def _forward_headers(self) -> dict:
        headers = {}
        for k, v in self.headers.items():
            lk = k.lower()
            if lk in HOP_BY_HOP or lk == "accept-encoding" or lk == "host":
                continue
            headers[k] = v
        headers["Host"] = f"{self.upstream_host}:{self.upstream_port}"
        headers["Accept-Encoding"] = "identity"
        # cc-switch 会把 127.0.0.1 视作本地来源；显式声明避免它把本机当外部客户端
        headers.setdefault("X-Forwarded-By", "cc-normalizer")
        return headers

    def _proxy(self) -> None:
        body = self._read_body()
        try:
            conn = http.client.HTTPConnection(self.upstream_host, self.upstream_port, timeout=600)
            conn.request(self.command, self.path, body=body or None, headers=self._forward_headers())
            resp = conn.getresponse()
        except (ConnectionRefusedError, socket.timeout, OSError) as exc:
            msg = f"归一化代理无法连接上游 {self.upstream_host}:{self.upstream_port}：{exc}"
            payload = json.dumps(
                {"error": {"type": "proxy_error", "message": msg}}, ensure_ascii=False
            ).encode("utf-8")
            self.send_response(502)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(payload)
            self.close_connection = True
            return

        ctype = (resp.getheader("Content-Type") or "").lower()
        cenc = (resp.getheader("Content-Encoding") or "identity").lower()
        is_sse = "text/event-stream" in ctype and cenc in ("identity", "")

        if not is_sse:
            data = resp.read()
            self.send_response(resp.status, resp.reason)
            for k, v in resp.getheaders():
                if k.lower() in RESP_DROP:
                    continue
                self.send_header(k, v)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(data)
            conn.close()
            return

        # 流式：不使用 chunked，靠 Connection: close 界定结束，兼容性最好
        self.send_response(resp.status, resp.reason)
        for k, v in resp.getheaders():
            if k.lower() in RESP_DROP:
                continue
            self.send_header(k, v)
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "close")
        self.end_headers()
        self.close_connection = True

        merger = TextBlockMerger()
        try:
            while True:
                chunk = resp.read1(8192) if hasattr(resp, "read1") else resp.read(8192)
                if not chunk:
                    break
                text = chunk.decode("utf-8", errors="replace")
                out = merger.feed(text)
                if out:
                    self.wfile.write(out.encode("utf-8"))
                    self.wfile.flush()
            tail = merger.flush()
            if tail:
                self.wfile.write(tail.encode("utf-8"))
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            conn.close()

    # ---------- HTTP 方法 ----------

    def do_GET(self) -> None:  # noqa: N802
        self._proxy()

    def do_POST(self) -> None:  # noqa: N802
        self._proxy()

    def do_HEAD(self) -> None:  # noqa: N802
        self._proxy()

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._proxy()

    def do_DELETE(self) -> None:  # noqa: N802
        self._proxy()

    def do_PUT(self) -> None:  # noqa: N802
        self._proxy()


def main() -> int:
    ap = argparse.ArgumentParser(description="Anthropic SSE 流式归一化代理")
    ap.add_argument("--listen", type=int, default=15722, help="监听端口（默认 15722）")
    ap.add_argument("--host", default="127.0.0.1", help="监听地址（默认 127.0.0.1）")
    ap.add_argument("--upstream", type=int, default=15721, help="上游端口（默认 15721）")
    ap.add_argument("--upstream-host", default="127.0.0.1", help="上游地址")
    ap.add_argument("-v", "--verbose", action="store_true", help="打印访问日志")
    args = ap.parse_args()

    if args.listen == args.upstream and args.host == args.upstream_host:
        print("监听端口不能与上游端口相同", file=sys.stderr)
        return 2

    Handler.upstream_host = args.upstream_host
    Handler.upstream_port = args.upstream
    Handler.verbose = args.verbose

    srv = ThreadingHTTPServer((args.host, args.listen), Handler)
    srv.daemon_threads = True
    print(
        f"[normalize] {args.host}:{args.listen} -> {args.upstream_host}:{args.upstream}"
        "  (合并 text 块 / 丢弃 thinking 碎片)",
        flush=True,
    )
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n[normalize] 已停止", flush=True)
    finally:
        srv.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

/**
 * VTID-05179 — a small `text/event-stream` parser (N6a, plan Change 3).
 *
 * React Native has no `EventSource`. The SSE transport reads the stream
 * through `XMLHttpRequest` progress events and feeds each new chunk here.
 * Chunks can split anywhere (inside a field, between `\r` and `\n`, inside a
 * multi-byte character is handled by XHR's text decoding), so the parser
 * keeps the unfinished line and the pending event between calls.
 *
 * Implements the WHATWG event-stream rules the gateway uses: `data:` lines
 * (joined with `\n`), `event:`, `id:`, `retry:` (ignored), comment lines
 * (`:` heartbeats), one optional space after the colon, CRLF / LF / CR line
 * endings, a leading BOM, and dispatch on a blank line.
 */

export interface SseEvent {
  event: string;
  data: string;
  id?: string;
}

export class SseParser {
  private buffer = '';
  private pendingCR = false;
  private started = false;
  private data: string[] = [];
  private eventName = '';
  private lastId: string | undefined;

  /** Feeds one chunk; returns the events it completed, in order. */
  push(chunk: string): SseEvent[] {
    let text = chunk;
    if (!this.started) {
      if (text.length === 0) return [];
      this.started = true;
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    }
    const out: SseEvent[] = [];
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (this.pendingCR) {
        this.pendingCR = false;
        if (ch === '\n') continue; // second half of a CRLF split across chunks
      }
      if (ch === '\r') {
        this.pendingCR = true;
        this.line(this.buffer, out);
        this.buffer = '';
      } else if (ch === '\n') {
        this.line(this.buffer, out);
        this.buffer = '';
      } else {
        this.buffer += ch;
      }
    }
    return out;
  }

  private line(line: string, out: SseEvent[]): void {
    if (line === '') {
      if (this.data.length) {
        const ev: SseEvent = { event: this.eventName || 'message', data: this.data.join('\n') };
        if (this.lastId !== undefined) ev.id = this.lastId;
        out.push(ev);
      }
      this.data = [];
      this.eventName = '';
      return;
    }
    if (line.startsWith(':')) return;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    switch (field) {
      case 'data':
        this.data.push(value);
        break;
      case 'event':
        this.eventName = value;
        break;
      case 'id':
        if (!value.includes('\0')) this.lastId = value;
        break;
      default:
        break; // `retry` and unknown fields are ignored
    }
  }
}

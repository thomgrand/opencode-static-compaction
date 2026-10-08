// currentTokens — the session's current token usage, from SessionMessage.Info[]
// (oldest -> newest). Shared by the plugin (index.ts) and the checks
// (test/check.mjs).
//
// Scan from the end because usage records before a completed or in-flight
// compaction are stale (the context was or is being replaced), a failed
// compaction left the context unchanged, and only assistant messages carry a
// TokenUsage record. All five token fields sum to what the provider reports
// as the context size.
export function currentTokens(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.type === "compaction") {
      // A completed/running compaction invalidates every usage record before it.
      if (msg.status === "failed") continue
      return 0
    }
    if (msg.type !== "assistant") continue
    const t = msg.tokens
    // Assistant entries without a real dispatch (no usage recorded) don't count.
    if ((t?.output ?? 0) <= 0) continue
    return (t.input ?? 0) + (t.output ?? 0) + (t.reasoning ?? 0) + (t.cache?.read ?? 0) + (t.cache?.write ?? 0)
  }
  return 0
}

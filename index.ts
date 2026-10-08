// static-compaction — compacts the session at a static token threshold.
//
// The "context" hook fires before every model dispatch. On each fire the
// session transcript is re-read and OpenCode's native compaction is requested
// once provider-reported usage reaches `soft`. Compaction runs async and can
// land mid-turn, so usage may overshoot `soft` by one step — by design; OC
// merges duplicate compact requests, so re-requesting on the next dispatch is
// safe and no pending-compaction bookkeeping is needed.
//
// A trigger failure must never block a prompt: the hook body runs inside a
// catch-all that logs and continues the turn without compacting. Native
// auto-compaction (`compaction.auto`) stays on as the backstop.
import type { Plugin } from "@opencode/plugin" // type-only: define() is identity in @opencode/plugin@2.0.24 — no runtime import, no node_modules needed
import { currentTokens } from "./tokens.js"

const DEFAULT_SOFT = 128_000 // used when no options.soft is configured

export default {
  id: "static-compaction",
  async setup(ctx) {
    const soft = typeof ctx.options.soft === "number" ? ctx.options.soft : DEFAULT_SOFT
    await ctx.session.hook("context", async (event) => {
      try {
        // The session transcript (authoritative token accounting), not the
        // hook's event.messages (the outgoing request's view).
        const messages = await ctx.session.context({ sessionID: event.sessionID })
        // >= : at equality the next dispatch is already over soft.
        if (currentTokens(messages) >= soft) await ctx.session.compact({ sessionID: event.sessionID })
      } catch (err) {
        console.error("static-compaction:", err instanceof Error ? err.message : err)
      }
    })
  },
} satisfies Plugin

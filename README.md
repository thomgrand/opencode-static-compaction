# opencode-static-compaction

A small [OpenCode](https://opencode.ai) plugin that compacts sessions at a **static token threshold** — the same trigger point for every model, zero agent involvement.

OpenCode's auto-compaction triggers at `model limit − compaction.buffer`, so the trigger point drifts per model, and there is no way to say "compact at N tokens" natively. This plugin measures the session's provider-reported token usage before every model dispatch and requests OpenCode's **native** compaction once usage reaches the configured `soft` threshold (default 128000). It never summarizes, prunes, or rewrites anything itself — compaction is OpenCode's own, so the transcript gains a normal `compaction` message and the conversation continues from `[summary + recent tail]` exactly as with manual compaction.

## Install

The plugin loads straight from this repository — no build step, no npm package required.

**Option A — let OpenCode manage it (clones from git for you):**

```sh
opencode plugin add github:thomgrand/opencode-static-compaction
```

To also set the threshold, use the object form of the entry (see below) with `"package": "github:thomgrand/opencode-static-compaction"`.

**Option B — clone it yourself (edit locally, update with `git pull`):**

```sh
git clone https://github.com/thomgrand/opencode-static-compaction.git ~/tools/opencode-static-compaction
```

Then point a `plugins` entry at the clone — global in `~/.config/opencode/opencode.jsonc`, or per project (below):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    { "package": "~/tools/opencode-static-compaction", "options": { "soft": 128000 } }
  ]
}
```

`plugins` entries accept git specs (`github:...`, `git+ssh://...`), absolute paths, relative paths (resolved from the config file), and `file:` URLs. The object form is only needed to set `soft` — a plain string entry runs with the default threshold.

Alternatively, drop a copy of the repo into a plugins auto-discovery directory:

```text
~/.config/opencode/plugins/static-compaction/   # global (index.ts inside)
.opencode/plugins/static-compaction/            # per-project
```

Updates: `git pull` in the clone (path entries load straight from disk), or `opencode plugin update` for Option A installs.

## Configure the threshold

The threshold is a plugin option in `opencode.jsonc` (the object form of a `plugins` entry):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    { "package": "github:thomgrand/opencode-static-compaction", "options": { "soft": 128000 } }
  ]
}
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `soft` | number (tokens) | `128000` | Ask OpenCode to compact when the session reaches this many tokens. Same value applies to every model. |

How much of the conversation is kept after each compaction is OpenCode's own `compaction.keep.tokens` (default `15000`), configured next to the plugin:

```jsonc
"compaction": { "keep": { "tokens": 15000 } }
```

Per-project thresholds: put the same plugin snippet in that project's `.opencode/opencode.jsonc` — plugin arrays merge from global (lowest) to `.opencode` (highest) precedence, so projects can pick their own `soft` without touching the global default. No extra config file.

Temporarily disable (plugin id is `static-compaction`):

```jsonc
{ "plugins": ["*", "-static-compaction"] }
```

## Use

Nothing to learn. Work normally; when the context reaches `soft`, the plugin asks OpenCode to compact and the session continues with `[summary + recent ~keep.tokens tail]` (default keep: ~15k tokens). Manual compaction is still `<leader>c` (`session.compact`).

Verify the plugin is loaded:

```sh
opencode plugin list
```

## Interplay with OpenCode's native compaction

- Leave `compaction.auto` on (the default): it stays a free per-model backstop. On models whose `limit − compaction.buffer` is **at or below** `soft`, native auto-compaction fires earlier than `soft` — the safe direction.
- One step of overshoot past `soft` is possible: the plugin measures before each model dispatch, and compaction runs at the next step boundary. Usage also reads 0 before the first response and right after a completed compaction (by design — usage records before a compaction are stale).
- The summary is written by the session's model (native compaction has no separate summarizer model).
- If fixed overhead (system prompt + tools) + `compaction.keep.tokens` + the summary exceeds `soft`, every dispatch would re-request compaction. Choose `soft` with headroom.

## Requirements

OpenCode v2 (uses the V2 plugin API: `ctx.session.hook("context")` + `ctx.session.compact`).

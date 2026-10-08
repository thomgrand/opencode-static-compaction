// Pure-logic checks for currentTokens() — run with `npm run check`.
// Each case feeds a synthetic SessionMessage.Info[] containing only the fields
// the algorithm reads, and asserts the returned count. The compaction cases
// pin the core rule: completed/running compaction resets the count to 0,
// failed compaction keeps counting.
import assert from "node:assert/strict"
import { currentTokens } from "../tokens.js"

// Synthetic message arrays carrying only the fields the algorithm reads.
const t167 = { input: 100, output: 50, reasoning: 10, cache: { read: 5, write: 2 } } // sums to 167

const cases = [
  ["fresh session (empty)", [], 0],
  ["no assistant usage", [{ type: "user" }, { type: "idle" }], 0],
  ["sums all usage fields", [{ type: "assistant", tokens: t167 }], 167],
  [
    "skips tail assistant without usage",
    [
      { type: "assistant", tokens: { input: 9, output: 0, reasoning: 0, cache: { read: 0, write: 0 } } },
      { type: "assistant", tokens: t167 },
    ],
    167,
  ],
  ["resets after completed compaction", [{ type: "assistant", tokens: t167 }, { type: "compaction", status: "completed" }], 0],
  ["keeps counting after failed compaction", [{ type: "assistant", tokens: t167 }, { type: "compaction", status: "failed" }], 167],
  ["resets while compaction running", [{ type: "assistant", tokens: t167 }, { type: "compaction", status: "running" }], 0],
  [
    "counts post-compaction assistant",
    [
      { type: "assistant", tokens: t167 },
      { type: "compaction", status: "completed" },
      { type: "assistant", tokens: { input: 10, output: 5, reasoning: 0, cache: { read: 1, write: 0 } } },
    ],
    16,
  ],
  ["missing fields default to 0", [{ type: "assistant", tokens: { input: 1, output: 2 } }], 3],
]

let n = 0
for (const [name, messages, expected] of cases) {
  assert.equal(currentTokens(messages), expected, name)
  console.log(`ok ${++n} ${name}`)
}
console.log(`ok ${n} checks passed`)

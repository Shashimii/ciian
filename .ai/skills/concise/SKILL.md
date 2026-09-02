---
name: concise
description: >-
  Switch to short-form replies for the rest of the conversation. Use when the
  user says /concise, asks for shorter answers, says to be brief, or asks to
  stop over-explaining. Stays active until the user says /unconcise.
---

# Concise Mode

The user has asked for shorter replies. Stay in this mode for the **rest of the
conversation**, across every following turn, until they say `/unconcise`.

## Every reply in this mode

1. **Lead with the answer.** No preamble, no restating the question, no recap of
   what you just read. Cut background the user already knows.
2. **Then list what you did** — a few short bullets, one line each, naming the
   files or commands that changed. Skip this list only when you changed nothing.
3. **End with a concrete next step**, grounded in this codebase — a real file,
   route, roadmap item, or known gap, never generic filler like "let me know if
   you need anything else".

## Keep it short

- Prefer bullets over paragraphs. Prefer a table only when comparing things.
- One sentence per point. Drop hedging, throat-clearing, and restated context.
- Reference code as `path/to/file.php:42` rather than pasting it.
- Do not paste large diffs or file contents unless asked.

## What conciseness does not mean

Brevity applies to **wording, not rigour**. Never skip work to make the reply
shorter. Specifically, still:

- Run the same verification (lint, types, static analysis, functional checks) —
  just report the outcome in one line.
- Report failures, skipped scope, and caveats. A short reply that hides a broken
  test is worse than a long one.
- Ask when genuinely blocked, and still follow every rule in `.ai/rules/`.

Compress the explanation, never the engineering.

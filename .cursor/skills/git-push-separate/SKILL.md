---
name: git-push-separate
description: >-
  Split local changes into multiple scoped commits by related concern, then
  push once. Use when the user asks to push separately, commit one by one,
  /git-push-separate, /git-push-seperate, or split changes into separate
  commits by scope.
---

# Git Push Separate

Commit and push only when the user explicitly asks. Never commit or push unprompted.

Unlike `git-push` (one selective commit) and `git-push-all` (one commit for everything), split the working tree into **multiple commits** grouped by scope or relation, then push once.

## Workflow

Run these in parallel first:

1. `git status` — staged, unstaged, untracked; whether the branch tracks a remote
2. `git diff` and `git diff --staged` — full change content
3. `git log -10 --format='%s'` — match recent message style

Then:

1. Group every non-secret change into scoped commit buckets (see Grouping below)
2. For each bucket, in dependency order when it matters:
   - Stage **only** that bucket’s paths (`git add` explicit paths)
   - Commit with HEREDOC (PowerShell-safe form below)
   - Confirm the commit succeeded before starting the next bucket
3. After all buckets are committed, push once (`git push`, or `git push -u origin HEAD` if no upstream)
4. Run `git status` to verify a clean tree (or only intentional leftovers) and successful push

If there is nothing to commit but the branch is ahead of the remote, skip commits and push the existing commits.

If the working tree is clean and the branch is not ahead, report that there is nothing to push.

## Grouping

Inspect the full diff and split by **related concern**, not by file type alone.

Typical buckets (use only what applies; merge tiny leftovers into the nearest related bucket):

- Backend domain work (models, actions, form requests, controllers, presenters)
- Routes / middleware / permission wiring for that feature
- Shared frontend types, libs, or UI primitives the feature needs
- Feature pages/components that consume those primitives
- Dependencies (`package.json` / lockfile) with the feature that introduced them
- Config, seeders, or docs only when they stand alone

Rules:

- Prefer **few clear commits** over many tiny ones — one concern per commit
- Keep a commit self-explanatory: someone reading `git log` should understand each step
- If file A is required for file B to make sense, commit A in an earlier bucket than B when practical
- Do **not** put unrelated features in the same commit
- Do **not** ask the user to approve each bucket unless the split is ambiguous — choose sensible groups and proceed
- If one file mixes unrelated concerns and cannot be split cleanly with path staging, put it in the commit that matches its **primary** change; do not use interactive `git add -p` unless the user asks

Before the first commit, briefly list the planned commits (message + main paths) in the reply so the user can see the split. Then execute without waiting unless they already asked to review first.

## Commit message format

Follow recent `git log` subjects. This repo uses:

- A leading `# ` then one plain imperative sentence
- Focus on **why** / outcome, not a file list
- No Conventional Commits prefixes (`feat:`, `fix:`, etc.)
- Title-style sentence: capital first letter, no trailing period
- Keep it concise (one line)
- Each commit message must describe **that bucket only**

**Examples from this repo:**

```text
# Add Tables module with shape builder and Database sidebar
# Store internal Accounts shapes in ciian_int_tbl
# Move platform models under Models/Ciian for system isolation
# Block setup routes once the database is ready
# Remove passkey sign-in from the login page
```

If the latest messages differ, prefer the current log style over these examples.

## Commit command

On Windows PowerShell:

```powershell
git commit -m @"
# Your imperative sentence here

"@
```

On bash/zsh:

```bash
git commit -m "$(cat <<'EOF'
# Your imperative sentence here

EOF
)"
```

Include the `Co-authored-by: Cursor <cursoragent@cursor.com>` trailer only when this environment already adds it or the user asks.

## Push command

Push **once** after all scoped commits succeed:

```powershell
git push
```

If the branch has no upstream:

```powershell
git push -u origin HEAD
```

Do not push after each individual commit unless the user explicitly asks.

## Safety

- Never update git config
- Never force-push, hard-reset, or skip hooks unless the user explicitly asks
- Never use interactive flags (`-i`)
- Do not commit `.env`, credentials, or other secrets — warn if requested
- Do not commit unrelated junk (build artifacts, session files, caches) unless the user asks
- Avoid `--amend` unless all of: user requested amend (or hook auto-modified files after a successful commit you made), HEAD was created by you in this conversation, and the commit is not pushed
- If a commit fails or is rejected by a hook: fix the issue and create a **new** commit (do not amend); resume with remaining buckets
- If push fails (rejected, non-fast-forward): report the error; do not force-push unless the user explicitly asks

## What to stage

- For each commit, stage **only** the paths in that bucket
- Prefer explicit paths over `git add -A`
- Leave secrets unstaged always
- After the last commit, the working tree should be clean aside from intentional exclusions

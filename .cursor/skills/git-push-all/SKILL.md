---
name: git-push-all
description: >-
  Stage every local change (except secrets), commit with this repo's message
  style, then push to the remote. Use when the user asks to push all, commit
  all, /git-push-all, or publish the full working tree without leaving files
  behind.
---

# Git Push All

Commit and push **all** local changes when the user explicitly asks. Never commit or push unprompted.

Unlike `git-push`, do **not** leave unrelated dirty files unstaged. Stage the full working tree (minus secrets), make one commit covering everything, and push.

## Workflow

Run these in parallel first:

1. `git status` — staged, unstaged, untracked; whether the branch tracks a remote
2. `git diff` and `git diff --staged` — full change content
3. `git log -10 --format='%s'` — match recent message style

Then:

1. Draft **one** commit message that covers the full set of changes (see format below)
2. Stage **everything** with `git add -A`, then unstage secrets if any were included
3. Commit with HEREDOC (PowerShell-safe form below)
4. Push to the remote (`git push`, or `git push -u origin HEAD` if the branch has no upstream)
5. Run `git status` to verify a clean tree and successful push

If there is nothing to commit but the branch is ahead of the remote, skip the commit and push the existing commits.

If the working tree is clean and the branch is not ahead, report that there is nothing to push.

## Commit message format

Follow recent `git log` subjects. This repo uses:

- A leading `# ` then one plain imperative sentence
- Focus on **why** / outcome, not a file list
- No Conventional Commits prefixes (`feat:`, `fix:`, etc.)
- Title-style sentence: capital first letter, no trailing period
- Keep it concise (one line)
- When changes span multiple concerns, prefer the primary outcome; mention secondary work only if needed for clarity

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

```powershell
git push
```

If the branch has no upstream:

```powershell
git push -u origin HEAD
```

## Safety

- Never update git config
- Never force-push, hard-reset, or skip hooks unless the user explicitly asks
- Never use interactive flags (`-i`)
- Do **not** commit `.env`, credentials, or other secrets — if `git add -A` picked them up, unstage and warn; never push secrets
- Do not commit build artifacts, session files, or caches unless they are intentionally tracked
- Avoid `--amend` unless all of: user requested amend (or hook auto-modified files after a successful commit you made), HEAD was created by you in this conversation, and the commit is not pushed
- If a commit fails or is rejected by a hook: fix the issue and create a **new** commit (do not amend)
- If push fails (rejected, non-fast-forward): report the error; do not force-push unless the user explicitly asks

## What to stage

- Stage **all** modified, deleted, and untracked files that belong in the repo (`git add -A`)
- Always exclude secrets even when pushing all
- Do not ask whether to include “unrelated” dirty files — including them is the point of this skill

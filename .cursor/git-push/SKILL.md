---
name: git-push
description: >-
  Commit local changes with this repo's message style, then push to the remote.
  Use when the user asks to commit, push, commit and push, /git-push, or save
  and publish changes to git.
---

# Git Push

Commit and push only when the user explicitly asks. Never commit or push unprompted.

## Workflow

Run these in parallel first:

1. `git status` — staged, unstaged, untracked; whether the branch tracks a remote
2. `git diff` and `git diff --staged` — full change content
3. `git log -10 --format='%s'` — match recent message style

Then:

1. Draft the message from the diff (see format below)
2. Stage relevant files (`git add`), excluding secrets
3. Commit with HEREDOC (PowerShell-safe form below)
4. Push to the remote (`git push`, or `git push -u origin HEAD` if the branch has no upstream)
5. Run `git status` to verify success

If there is nothing to commit but the branch is ahead of the remote, skip the commit and push the existing commits.

## Commit message format

Follow recent `git log` subjects. This repo uses:

- A leading `# ` then one plain imperative sentence
- Focus on **why** / outcome, not a file list
- No Conventional Commits prefixes (`feat:`, `fix:`, etc.)
- Title-style sentence: capital first letter, no trailing period
- Keep it concise (one line)

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
- Do not commit `.env`, credentials, or other secrets — warn if requested
- Do not commit unrelated junk (build artifacts, session files, caches) unless the user asks
- Avoid `--amend` unless all of: user requested amend (or hook auto-modified files after a successful commit you made), HEAD was created by you in this conversation, and the commit is not pushed
- If a commit fails or is rejected by a hook: fix the issue and create a **new** commit (do not amend)
- If push fails (rejected, non-fast-forward): report the error; do not force-push unless the user explicitly asks

## What to stage

- Stage files that belong to the requested commit
- Leave unrelated dirty files unstaged, or ask if unclear
- Prefer explicit paths over `git add -A` when the working tree is noisy

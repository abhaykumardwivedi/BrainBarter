# Safe-change workflow (so new changes never break working features)

The goal: never let a new change silently break something that already works.

## The rule before every commit

Run the smoke test. If it fails, **do not commit.**

```bash
GEMINI_API_KEY=<your-key> bash scripts/smoke-test.sh
```

It checks the three things that break most often:
1. **Server modules load** — no syntax errors / bad imports
2. **Frontend builds** — no broken imports or JSX errors (would white-screen the app)
3. **AI features work** — generation + 768-dim embeddings, live against Google

A green "SMOKE TEST PASSED" means the core app still works.

## Recommended branch flow

For anything non-trivial, work on a branch and only merge after the smoke test passes:

```bash
git checkout -b fix/my-change         # 1. branch off main
# ... make changes ...
GEMINI_API_KEY=<key> bash scripts/smoke-test.sh   # 2. must pass
git add -p && git commit -m "..."     # 3. commit only if green
git checkout main && git merge fix/my-change       # 4. merge
git push origin main                  # 5. deploy
```

For tiny changes you can commit straight to `main` — but **only after the smoke
test is green.** That is the non-negotiable part.

## Database changes

DB schema/trigger changes are NOT covered by the smoke test (the database isn't
reachable from CI). For those:
- Keep every change as an **idempotent** SQL script in the repo (like
  `BULLETPROOF_PROFILES.sql`) so it can be re-run safely.
- After running in Supabase, run the **verification query** at the bottom of the
  script — it must return 0 problem rows.

## What this does and doesn't catch

- ✅ Catches: build breaks, import/syntax errors, AI regressions.
- ⚠️ Does not catch: live Supabase/Render behavior (not reachable from here).
  For those, test in the browser after deploy and check Render logs.

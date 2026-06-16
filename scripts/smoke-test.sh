#!/usr/bin/env bash
# ============================================================================
# Pre-commit smoke test — run this BEFORE every commit/merge.
# Catches the most common ways a change silently breaks the app:
#   1. Server modules fail to load (syntax / bad require)
#   2. Frontend fails to build (broken import / JSX error)
#   3. AI features broken (needs GEMINI_API_KEY in env)
# Usage:  GEMINI_API_KEY=xxx bash scripts/smoke-test.sh
# Exits non-zero on any failure so it can gate a commit.
# ============================================================================
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAIL=0

echo "── 1/3  Server modules load ─────────────────────────────"
cd "$ROOT/server"
SUPABASE_URL="https://x.supabase.co" SUPABASE_SERVICE_KEY="x" node -e "
  ['./utils/gemini','./utils/embeddings','./controllers/aiController','./controllers/authController','./routes/ai','./routes/auth'].forEach(m=>require(m));
  console.log('   ✅ all server modules load');
" || { echo "   ❌ server module load FAILED"; FAIL=1; }

echo "── 2/3  Frontend builds ─────────────────────────────────"
cd "$ROOT/client"
if npm run build >/tmp/bb_build.log 2>&1; then
  echo "   ✅ frontend build succeeded"
else
  echo "   ❌ frontend build FAILED — see /tmp/bb_build.log"; tail -15 /tmp/bb_build.log; FAIL=1
fi

echo "── 3/3  AI features (live) ──────────────────────────────"
if [ -z "${GEMINI_API_KEY:-}" ]; then
  echo "   ⚠️  skipped (set GEMINI_API_KEY to run)"
else
  cd "$ROOT/server"
  node -e "
    const { callGemini } = require('./utils/gemini');
    const { embedText } = require('./utils/embeddings');
    (async () => {
      const s = await callGemini('summarize','The cell is the basic unit of life.');
      const e = await embedText('test');
      if (s && s.length>10 && e.length===768) console.log('   ✅ AI generation + embeddings (768d) work');
      else { console.log('   ❌ AI check FAILED'); process.exit(1); }
    })().catch(err => { console.log('   ❌ AI check FAILED:', err.message); process.exit(1); });
  " || FAIL=1
fi

echo "─────────────────────────────────────────────────────────"
if [ "$FAIL" -eq 0 ]; then echo "✅ SMOKE TEST PASSED — safe to commit"; else echo "❌ SMOKE TEST FAILED — DO NOT commit until fixed"; fi
exit $FAIL

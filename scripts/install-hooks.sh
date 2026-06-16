#!/usr/bin/env bash
# Installs a local pre-push hook that runs the smoke test before every push.
# Run once:  bash scripts/install-hooks.sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOK="$ROOT/.git/hooks/pre-push"

cat > "$HOOK" <<'EOF'
#!/usr/bin/env bash
# Auto-runs the smoke test before pushing. Push is blocked if it fails.
echo "Running smoke test before push…"
bash "$(git rev-parse --show-toplevel)/scripts/smoke-test.sh"
EOF

chmod +x "$HOOK"
echo "✅ pre-push hook installed at .git/hooks/pre-push"
echo "   It runs scripts/smoke-test.sh before every 'git push'."
echo "   (Set GEMINI_API_KEY in your shell to include the live AI check.)"

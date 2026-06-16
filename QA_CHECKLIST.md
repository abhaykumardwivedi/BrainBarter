# Release QA checklist — live-service features

CI auto-tests the code logic (build, contracts, AI). But these features touch
Supabase / Razorpay / Storage and **can't be tested from CI**. Run this 5-minute
checklist in the browser after any deploy that could touch them, BEFORE telling
users it's live. Tick every box.

## Auth & profiles
- [ ] Register a brand-new email → receive code → verify → lands logged in
- [ ] New profile shows **50 tokens**, username, avatar
- [ ] Log out and back in → session restores, tokens still correct
- [ ] Registering an existing email → does not error (logs in / clear message)

## Tokens & wallet
- [ ] Wallet page shows correct token balance
- [ ] Balance matches the profile/navbar count

## Payment (Razorpay TEST mode)
- [ ] Buy tokens (e.g. ₹100) → Razorpay opens → test card succeeds
- [ ] After payment, balance increases by the right amount (₹100 → 1000 tokens)
- [ ] Repeating the same payment_id does NOT double-credit (idempotent)
- [ ] Amount below ₹10 is rejected

## Upload (creator)
- [ ] Upload a video (≤30MB) and notes/PDF (≤10MB) → success
- [ ] File appears in Creator Dashboard as draft, then publishes
- [ ] Oversized file is rejected with a clear message

## Download / content access
- [ ] A paid learner can unlock content → tokens deducted, creator credited
- [ ] **Creator can view their OWN content for free** (no unlock prompt)
- [ ] Unlocked content stays unlocked on refresh

## Creator dashboard
- [ ] My Content, Analytics, Earnings tabs load with correct numbers
- [ ] Edit modal saves changes

## AI features (also covered by CI, but verify in-app)
- [ ] Content Assistant: summarize / simplify / notes / questions / mock test
- [ ] Ask a Doubt returns a grounded answer with citations
- [ ] Exam Mode: expected questions, mock test, revision, final prep
- [ ] Study Planner: a 7-day request produces a 7-day plan

## Withdrawal (if enabled)
- [ ] Creator can request a withdrawal of earned tokens
- [ ] Balance/withdrawal record updates correctly

---
**Rule:** if any box fails, the deploy is NOT done — fix before announcing.
For repeatable confidence later, these can be automated with Playwright against
a staging environment + Razorpay test mode (paid/setup effort — see me when ready).

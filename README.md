# 🧠 BrainBarter — Peer-to-Peer Learning Marketplace

> A student-powered knowledge marketplace where learners **earn a token currency by teaching and spend it to learn** — supercharged by an AI tutor that answers questions grounded in the actual uploaded study material.

BrainBarter turns studying into a two-sided economy: students upload topic-wise videos and notes, other students unlock them with tokens, and creators cash those tokens out to real money. A Retrieval-Augmented AI layer (Google Gemini) sits on top, reading uploaded PDFs and helping students summarize, simplify, clear doubts, and prepare for exams.

🔗 **Live App:** [brain-barter-zeta.vercel.app](https://brain-barter-zeta.vercel.app)

---

## ✨ Features

### 📚 For Learners
- **Browse & discover** — search by title, filter by subject, difficulty, and type (video/notes)
- **Token-gated content** — unlock videos and notes with tokens via an atomic, server-side transaction
- **Star ratings** — rate content 1–5★ and earn tokens for the first genuine rating (self-rating is blocked)
- **Bookmarks & progress tracking** — save content and mark topics complete
- **50 free starter tokens** on signup

### 🎥 For Creators
- **Upload videos & notes** with subject/topic tagging and free-text topic autocomplete
- **Earn tokens** every time someone unlocks your content
- **Creator dashboard** — track uploads, total views, balance, and publish/unpublish drafts
- **Withdraw earnings** to **UPI or bank account** (real-money payout)
- **Verified-creator** badges granted by admins

### 🤖 AI Study Assistant (RAG-powered)
- **Retrieval-Augmented doubt solving** — ask a question and the AI answers using the *actual content of the uploaded PDF*, with **inline citations** to the passages it used
- **Summarize / Simplify** any piece of content
- **Generate notes & practice questions** from the material
- **Exam Mode** — AI-generated **mock tests, revision sheets, expected questions, and final-prep checklists** for a chosen subject and topic (uses previous-year-question context when available)

### 💸 Token Economy & Payments
- **Buy tokens** through **Razorpay** with server-side HMAC signature verification
- **Idempotent crediting** — a duplicated/retried payment can never double-credit tokens
- **Withdrawals** with balance checks, platform fee, and an admin approval workflow
- Full **transaction ledger** for every earn/spend

### 🛡️ Admin Panel
- Approve / reject **withdrawal requests** (rejections auto-refund tokens)
- Triage user **feedback** (mark reviewed / done)
- Review content **reports** and moderate/unpublish content
- **Verify creators**

### 🔐 Accounts & Security
- **Email-verified signup** — 6-digit codes (cryptographically generated, stored server-side, 10-min expiry)
- **Password reset** via email
- **Role-based access** (user / admin)
- **Row-Level Security** on every table — clients can never edit their own token balance or role; all token movements go through audited `SECURITY DEFINER` database functions

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, Tailwind CSS, Zustand, React Router |
| **Backend** | Node.js, Express 5 (REST API) |
| **Database & Auth** | Supabase — PostgreSQL, Auth, Storage, Row-Level Security |
| **AI** | Google Gemini — `text-embedding-004` (embeddings) + generative model |
| **Vector Search** | `pgvector` (IVFFlat cosine-similarity index) |
| **Payments** | Razorpay (orders + HMAC-verified webhooks) |
| **Email** | SendGrid (transactional verification codes) |
| **PDF Parsing** | `pdf-parse` (text extraction for RAG ingestion) |
| **Deployment** | Vercel (frontend) · Render (API) |

---

## 🧩 How the RAG Pipeline Works

```
Upload PDF ──► Server extracts text (pdf-parse)
            ──► Split into ~220-word overlapping chunks
            ──► Embed each chunk (Gemini text-embedding-004, 768-dim)
            ──► Store vectors in Postgres (pgvector)

Ask a doubt ─► Embed the question
            ─► Cosine-similarity search over that document's chunks
            ─► Feed top matches to Gemini → grounded answer + citations
```

This is what makes the AI answer *from the student's own material* instead of guessing — and why every answer can cite the exact passages it relied on.

---

## 🎨 Token Economy

| Rule | Value |
|------|-------|
| Buy rate | ₹1 = 10 tokens |
| Sell rate | 10 tokens = ₹0.80 (20% platform fee) |
| Minimum purchase | ₹10 |
| Minimum withdrawal | ₹50 (625 tokens) |
| Starter bonus | 50 tokens on signup |
| First-rating reward | +2 tokens |

---

## 📦 Deployment

### Prerequisites
- Node.js 18+
- Supabase project
- Razorpay account
- Google Gemini API key
- SendGrid account (verified sender)

### 1. Database setup (Supabase)
1. Open the **Supabase SQL Editor**
2. Run `client/supabase_schema.sql` (base tables)
3. Run `client/COMPLETE_SETUP.sql` (profiles, RLS, all `SECURITY DEFINER` functions, feedback, email codes, and the `pgvector` RAG tables/functions)

> `COMPLETE_SETUP.sql` is idempotent — safe to re-run any time.

### 2. Deploy the frontend (Vercel)
- Root directory: `client`
- Environment variables:
  ```
  VITE_SUPABASE_URL=your_supabase_url
  VITE_SUPABASE_ANON_KEY=your_anon_key
  VITE_API_URL=your_deployed_server_url
  ```

### 3. Deploy the backend (Render)
- Root directory: `server`
- Build: `npm install` · Start: `npm start`
- Environment variables:
  ```
  PORT=5000
  SUPABASE_URL=your_supabase_url
  SUPABASE_SERVICE_KEY=your_service_role_key
  GEMINI_API_KEY=your_gemini_key
  RAZORPAY_KEY_ID=your_razorpay_key_id
  RAZORPAY_KEY_SECRET=your_razorpay_secret
  SENDGRID_API_KEY=your_sendgrid_key
  SENDGRID_FROM=your_verified_sender_email
  CLIENT_URL=your_vercel_url
  ```

---

## 💻 Local Development

```bash
# Frontend
cd client && npm install && npm run dev   # http://localhost:5173

# Backend
cd server && npm install && npm run dev   # http://localhost:5000
```

---

## 🔒 Security Notes
- Never commit `.env` files
- The `service_role` key is used **only** on the server
- RLS is enabled on all tables; token balances move exclusively through `SECURITY DEFINER` functions
- Razorpay payments are verified server-side (HMAC-SHA256) and credited idempotently
- Use HTTPS in production

---

## 📄 License

MIT — built for students, by students. 💜

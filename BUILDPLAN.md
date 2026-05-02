# BrainBarter — Complete Build Plan & Instructions

---

## Project Overview

BrainBarter is a peer-first MERN-based learning platform where students share and access
topic-wise academic content using a token system. Lightweight AI (Gemini) supports
summarization, doubt clarification, question generation, mock exams, and Exam Mode.

---

## Final Tech Stack

| Layer      | Tool                          |
|------------|-------------------------------|
| Frontend   | React.js + Tailwind CSS       |
| Backend    | Node.js + Express.js (AI only)|
| Database   | Supabase (PostgreSQL)         |
| Auth       | Supabase Auth                 |
| Storage    | Supabase Storage              |
| AI         | Google Gemini API             |
| State      | Zustand                       |
| Deployment | Vercel (client) + Railway (server) + Supabase (cloud) |

---

## Folder Structure

```
brainbarter/
├── client/
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── common/          # Button, Input, Modal, Loader, Badge
│       │   ├── layout/          # Navbar, Sidebar, Footer
│       │   ├── content/         # ContentCard, ContentViewer, PreviewCard
│       │   ├── ai/              # AIPanel, ExamModePanel
│       │   └── admin/           # ReportsTable, CreatorVerify
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── Browse.jsx
│       │   ├── ContentPage.jsx
│       │   ├── ExamMode.jsx
│       │   ├── Upload.jsx
│       │   ├── Wallet.jsx
│       │   ├── Profile.jsx
│       │   ├── CreatorDashboard.jsx
│       │   ├── AdminPanel.jsx
│       │   ├── Leaderboard.jsx
│       │   ├── Login.jsx
│       │   └── Register.jsx
│       ├── hooks/               # useAuth, useTokens, useContent
│       ├── store/               # Zustand stores
│       ├── lib/
│       │   └── supabase.js      # Supabase client init
│       ├── utils/               # formatters, validators, compressor
│       ├── App.jsx
│       └── main.jsx
├── server/
│   ├── routes/
│   │   └── ai.js
│   ├── controllers/
│   │   └── aiController.js
│   ├── utils/
│   │   └── gemini.js            # Gemini API utility
│   ├── middleware/
│   │   └── verifyToken.js       # Verify Supabase JWT
│   ├── .env
│   └── index.js
├── BUILDPLAN.md
└── README.md
```

---

## Database Schema (Supabase PostgreSQL)

### Table: profiles
```sql
id            uuid  PRIMARY KEY REFERENCES auth.users(id)
username      text  UNIQUE NOT NULL
avatar_url    text
bio           text
token_balance integer DEFAULT 50        -- starter tokens on signup
is_verified   boolean DEFAULT false     -- verified creator badge
created_at    timestamptz DEFAULT now()
```

### Table: subjects
```sql
id         uuid PRIMARY KEY DEFAULT gen_random_uuid()
name       text UNIQUE NOT NULL
code       text UNIQUE NOT NULL         -- e.g. CS301
semester   integer
created_at timestamptz DEFAULT now()
```

### Table: units
```sql
id         uuid PRIMARY KEY DEFAULT gen_random_uuid()
subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE
name       text NOT NULL
order_no   integer
```

### Table: topics
```sql
id         uuid PRIMARY KEY DEFAULT gen_random_uuid()
unit_id    uuid REFERENCES units(id) ON DELETE CASCADE
name       text NOT NULL
order_no   integer
```

### Table: content
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
creator_id    uuid REFERENCES profiles(id)
topic_id      uuid REFERENCES topics(id)
title         text NOT NULL
description   text
type          text CHECK (type IN ('video','notes'))
file_url      text NOT NULL
thumbnail_url text
token_cost    integer DEFAULT 5
difficulty    text CHECK (difficulty IN ('beginner','medium','advanced'))
tags          text[]
is_published  boolean DEFAULT false
views         integer DEFAULT 0
created_at    timestamptz DEFAULT now()
```

### Table: unlocks
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id      uuid REFERENCES profiles(id)
content_id   uuid REFERENCES content(id)
tokens_spent integer
unlocked_at  timestamptz DEFAULT now()
UNIQUE(user_id, content_id)
```

### Table: token_transactions
```sql
id         uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id    uuid REFERENCES profiles(id)
type       text CHECK (type IN ('earn','spend'))
amount     integer
reason     text
ref_id     uuid                         -- content_id or null
created_at timestamptz DEFAULT now()
```

### Table: ratings
```sql
id         uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id    uuid REFERENCES profiles(id)
content_id uuid REFERENCES content(id)
stars      integer CHECK (stars BETWEEN 1 AND 5)
review     text
created_at timestamptz DEFAULT now()
UNIQUE(user_id, content_id)
```

### Table: bookmarks
```sql
id         uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id    uuid REFERENCES profiles(id)
content_id uuid REFERENCES content(id)
created_at timestamptz DEFAULT now()
UNIQUE(user_id, content_id)
```

### Table: progress
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id      uuid REFERENCES profiles(id)
topic_id     uuid REFERENCES topics(id)
content_ids  uuid[]
completed_at timestamptz
UNIQUE(user_id, topic_id)
```

### Table: mock_tests
```sql
id         uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id    uuid REFERENCES profiles(id)
topic_id   uuid REFERENCES topics(id)
type       text                         -- quick/topic/unit/full
questions  jsonb
score      integer
created_at timestamptz DEFAULT now()
```

### Table: reports
```sql
id         uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id    uuid REFERENCES profiles(id)
content_id uuid REFERENCES content(id)
reason     text
status     text DEFAULT 'pending'       -- pending/reviewed/removed
created_at timestamptz DEFAULT now()
```

### Table: ai_logs
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid REFERENCES profiles(id)
content_id  uuid REFERENCES content(id)
task_type   text
prompt      text
response    text
created_at  timestamptz DEFAULT now()
```

### Table: pyqs
```sql
id         uuid PRIMARY KEY DEFAULT gen_random_uuid()
subject_id uuid REFERENCES subjects(id)
year       integer
file_url   text
text_dump  text                         -- extracted text for AI context
created_at timestamptz DEFAULT now()
```

---

## Supabase Storage Buckets

| Bucket       | Purpose              | Max Size | Public |
|--------------|----------------------|----------|--------|
| videos       | Creator video uploads| 30 MB    | false  |
| notes        | PDF/notes uploads    | 10 MB    | false  |
| thumbnails   | Content thumbnails   | 2 MB     | true   |
| avatars      | User profile pics    | 2 MB     | true   |
| pyqs         | Admin PYQ uploads    | 10 MB    | false  |

---

## Row Level Security (RLS) Rules — Key Policies

```
profiles      → user can read all, update only own
subjects      → everyone can read, only admin can insert/update
units         → everyone can read, only admin can insert/update
topics        → everyone can read, only admin can insert/update
content       → everyone can read published, creator manages own
unlocks       → user can read own, insert own
token_transactions → user can read own only
ratings       → user can read all, insert/update own
bookmarks     → user can read/insert/delete own only
progress      → user can read/update own only
mock_tests    → user can read/insert own only
reports       → user can insert, admin can read all
ai_logs       → user can read own, insert own
pyqs          → everyone can read, admin can insert
```

---

## Backend API Routes (Express — AI Only)

```
POST /api/ai/assist
  body: { taskType, contentId, userMessage }
  taskTypes: summarize | simplify | doubt | generate-notes |
             generate-questions | mock-test | revision-sheet

POST /api/ai/exam/expected-questions
  body: { subjectId, topicId }

POST /api/ai/exam/mock
  body: { topicId, type }         -- type: quick|topic|unit|full

POST /api/ai/exam/revision-notes
  body: { topicId }

POST /api/ai/exam/final-prep
  body: { subjectId }
```

All routes are protected — verify Supabase JWT in middleware.
All responses are logged to ai_logs table.

---

## Token Economy Rules

| Event                        | Token Change |
|------------------------------|--------------|
| New user signup              | +50 tokens   |
| Unlock a content             | -N tokens (content.token_cost) |
| Someone unlocks your content | +N tokens (same amount) |
| Rate a content               | +2 tokens    |
| Content gets 10 unlocks      | +10 bonus    |

---

## Content Upload Rules

| Type   | Max Size | Format         | Compression |
|--------|----------|----------------|-------------|
| Video  | 30 MB    | mp4, webm      | Yes (client-side before upload) |
| Notes  | 10 MB    | pdf, doc, docx | No compression |
| Thumb  | 2 MB     | jpg, png, webp | Yes |

Client-side video compression using `browser-image-compression` for images
and `ffmpeg.wasm` for video before uploading to Supabase Storage.

---

## AI Task Prompts (Gemini)

Each task uses a fixed system prompt + scoped content context:

| Task               | System Prompt Goal                                      |
|--------------------|---------------------------------------------------------|
| summarize          | Summarize this academic content in 5-7 bullet points    |
| simplify           | Explain this in simple language a student can understand|
| doubt              | Answer this doubt based only on the provided content    |
| generate-notes     | Create structured revision notes from this content      |
| generate-questions | Generate 10 important exam questions from this content  |
| mock-test          | Create a 10-question MCQ test with answers              |
| revision-sheet     | Create a one-page revision sheet with key points        |
| expected-questions | Based on PYQs and topic, list probable exam questions   |
| final-prep         | Create a final preparation checklist for this subject   |

Context is always scoped — never open-ended.

---

## Pages & Their Data Source

| Page              | Data From                        |
|-------------------|----------------------------------|
| Home              | Supabase: subjects, top content  |
| Browse            | Supabase: topics, content        |
| ContentPage       | Supabase: content, ratings       |
| ExamMode          | Express/Gemini + Supabase pyqs   |
| Upload            | Supabase Storage + content table |
| Wallet            | Supabase: token_transactions     |
| Profile           | Supabase: profiles, progress     |
| CreatorDashboard  | Supabase: content, unlocks       |
| AdminPanel        | Supabase: reports, content       |
| Leaderboard       | Supabase: profiles ordered by tokens |

---

## Build Phases — Step by Step

---

### PHASE 1 — Project Scaffold
**Goal:** Empty but runnable project with correct folder structure

Steps:
1. Create `client/` using Vite + React
2. Install client deps: `@supabase/supabase-js`, `react-router-dom`, `zustand`,
   `axios`, `tailwindcss`, `browser-image-compression`
3. Create `server/` with `npm init`
4. Install server deps: `express`, `cors`, `dotenv`, `@google/generative-ai`
5. Create all folders as per structure above
6. Create `.env` files for both client and server
7. Setup Tailwind in client
8. Create Supabase client in `client/src/lib/supabase.js`
9. Create base Express server in `server/index.js`

Deliverable: Both client and server start without errors.

---

### PHASE 2 — Supabase Setup
**Goal:** All tables, buckets, and RLS policies created in Supabase

Steps:
1. Create Supabase project
2. Run all SQL from Database Schema section above in Supabase SQL editor
3. Create all 5 storage buckets with correct size limits
4. Enable RLS on all tables
5. Write and apply all RLS policies
6. Create a Supabase database function for token transfer on unlock:
   - deduct from buyer
   - credit to creator
   - insert two token_transaction rows
   - insert unlock row
   - all in one transaction

Deliverable: All tables visible in Supabase dashboard, RLS active.

---

### PHASE 3 — Authentication
**Goal:** Working signup, login, logout with profile creation

Steps:
1. Build `Register.jsx` — email, password, username, submit
2. On register: call `supabase.auth.signUp()` then insert into `profiles`
3. Build `Login.jsx` — email, password
4. On login: call `supabase.auth.signInWithPassword()`
5. Build `useAuth` hook — wraps `supabase.auth.getUser()` and session listener
6. Build Zustand `authStore` — user, profile, loading
7. Build `ProtectedRoute` component — redirects if not logged in
8. Add logout button in Navbar

Deliverable: User can register, login, logout. Profile row created on signup.

---

### PHASE 4 — Subject / Unit / Topic Browsing
**Goal:** Learner can browse the full subject → unit → topic tree

Steps:
1. Admin seeds subjects, units, topics via Supabase dashboard (SQL insert)
2. Build `Browse.jsx` — fetch and display all subjects as cards
3. On subject click — show units and topics under it
4. Build `useContent` hook — fetches subjects, units, topics
5. Add search bar — filters topics by name
6. Add filter by semester/subject

Deliverable: Full browsable topic tree visible to any logged-in user.

---

### PHASE 5 — Content Upload
**Goal:** Creator can upload video or notes under a topic

Steps:
1. Build `Upload.jsx` — form: title, description, topic select, type, file, thumbnail, token_cost, difficulty, tags
2. Add file size validation: video ≤ 30MB, notes ≤ 10MB
3. Add client-side video compression using `ffmpeg.wasm`
4. Upload file to Supabase Storage bucket (videos or notes)
5. Upload thumbnail to thumbnails bucket
6. Insert row into `content` table with `is_published: false`
7. Add publish toggle — creator can publish when ready
8. Show upload progress bar

Deliverable: Creator can upload and publish content. File appears in Supabase Storage.

---

### PHASE 6 — Content Browsing & Preview
**Goal:** Learner can browse, search, and preview content before unlocking

Steps:
1. Build `ContentCard` component — thumbnail, title, creator, difficulty badge, token cost, rating
2. On `Browse.jsx` topic click — show list of ContentCards for that topic
3. Build `ContentPage.jsx` — full content view
4. If user has NOT unlocked: show preview (first 30 seconds for video, first page for notes)
5. If user HAS unlocked: show full content
6. Check unlock status from `unlocks` table on page load
7. Add difficulty badge, exam relevance tag, view count

Deliverable: Learner can browse content and see preview. Full content locked behind tokens.

---

### PHASE 7 — Token Economy
**Goal:** Working token unlock system with wallet and history

Steps:
1. Build `Wallet.jsx` — show token balance + transaction history
2. On ContentPage — show "Unlock for N tokens" button if not unlocked
3. On unlock click — call Supabase function (from Phase 2 Step 6):
   - deduct tokens from learner
   - credit tokens to creator
   - insert unlock record
   - insert two transaction records
4. Refresh unlock status and content access after unlock
5. Show token balance in Navbar
6. On new user signup trigger — give 50 starter tokens (Supabase trigger/function)

Deliverable: Full token flow works. Learner spends, creator earns, history recorded.

---

### PHASE 8 — AI Assistance Layer
**Goal:** Working AI panel on ContentPage for all assist tasks

Steps:
1. Build Gemini utility in `server/utils/gemini.js`
   - single function: `callGemini(systemPrompt, userMessage)` → response text
2. Build `server/controllers/aiController.js`
   - one handler per task type
   - fetch content text/transcript from Supabase
   - build scoped prompt
   - call Gemini
   - log to ai_logs
   - return response
3. Build `server/routes/ai.js` — POST /api/ai/assist
4. Add JWT verification middleware — verify Supabase token on every request
5. Build `AIPanel` component on ContentPage
   - tabs: Summarize | Simplify | Ask Doubt | Generate Notes | Questions
   - each tab calls POST /api/ai/assist with correct taskType
   - show loading state and response
6. Only show AIPanel if content is unlocked

Deliverable: Unlocked content has working AI panel with all 5 task types.

---

### PHASE 9 — Exam Mode
**Goal:** Dedicated Exam Mode page with all 4 features

Steps:
1. Build `ExamMode.jsx` page with 4 tabs:
   - Expected Questions
   - Mock Test
   - Revision Notes
   - Final Prep
2. Add subject and topic selectors on the page
3. Build 4 Express routes under `/api/ai/exam/`
4. For Expected Questions — fetch PYQs text from pyqs table, pass as context to Gemini
5. For Mock Test — generate 10 MCQs, save to mock_tests table, show interactive quiz UI
6. For Revision Notes — generate structured notes, allow download as text
7. For Final Prep — generate checklist, show as interactive checklist UI
8. Add disclaimer: "AI-generated. Verify before exam."

Deliverable: Full Exam Mode page working with all 4 AI-powered tabs.

---

### PHASE 10 — Support Features
**Goal:** Ratings, bookmarks, progress tracking, reports, leaderboard

Steps:
1. Ratings — star rating + review form on ContentPage, save to ratings table
2. Bookmarks — bookmark button on ContentCard and ContentPage, save to bookmarks table
3. Progress — "Mark as Complete" button on ContentPage, save to progress table
4. Reports — report button on ContentPage, modal with reason, save to reports table
5. Leaderboard — `Leaderboard.jsx` page, fetch profiles ordered by token_balance DESC
6. Recently viewed — save last 10 viewed content IDs in localStorage
7. Transcript/Summary tab — on ContentPage, show AI-generated summary as a tab

Deliverable: All support features working end to end.

---

### PHASE 11 — Dashboards
**Goal:** Creator dashboard, Admin panel, Profile page

Steps:
1. `CreatorDashboard.jsx`:
   - list of creator's uploaded content
   - per-content: views, unlocks, tokens earned
   - edit/delete/publish toggle per content
   - total earnings summary

2. `AdminPanel.jsx`:
   - reports queue — view flagged content, mark reviewed, remove content
   - creator verification — list creators, toggle is_verified badge
   - content moderation — unpublish any content

3. `Profile.jsx`:
   - user info, avatar, bio edit
   - bookmarks list
   - progress / completed topics
   - watch history (from localStorage)
   - token balance shortcut

Deliverable: All three dashboards fully functional.

---

### PHASE 12 — Polish & Deploy
**Goal:** Production-ready deployment

Steps:
1. Add loading skeletons on all data-fetching pages
2. Add error boundaries and empty states
3. Add toast notifications (success/error) on all actions
4. Make all pages mobile responsive
5. Add page titles and meta tags
6. Environment variables audit — no keys exposed in client except Supabase public keys
7. Deploy client to Vercel — connect GitHub repo
8. Deploy server to Railway — set env vars
9. Set Supabase project to production mode
10. Test full user journey end to end on production

Deliverable: Live production URL for both client and server.

---

## Environment Variables

### client/.env
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:5000
```

### server/.env
```
PORT=5000
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
CLIENT_URL=http://localhost:5173
```

---

## NPM Packages

### Client
```
@supabase/supabase-js
react-router-dom
zustand
axios
tailwindcss
@tailwindcss/typography
browser-image-compression
ffmpeg (ffmpeg.wasm for video compression)
react-hot-toast
react-icons
```

### Server
```
express
cors
dotenv
@google/generative-ai
@supabase/supabase-js
```

---

## Key Implementation Notes

1. Supabase client is used directly from frontend for all CRUD — no Express proxy needed
2. Express server is ONLY for Gemini AI calls — keeps API key server-side safe
3. Token transfer is a Supabase PostgreSQL function (atomic transaction) — never done in JS
4. Video compression happens client-side before upload — reduces storage usage
5. All AI context is scoped to content text — never open-ended prompts
6. RLS ensures users can never access other users' private data directly
7. Supabase service role key is ONLY on server — never exposed to client
8. is_verified badge is only toggled by admin — never self-assigned

---

## Phase Completion Checklist

- [ ] Phase 1  — Scaffold complete, both apps run
- [ ] Phase 2  — All Supabase tables, buckets, RLS ready
- [ ] Phase 3  — Auth working, profile created on signup
- [ ] Phase 4  — Subject/topic tree browsable
- [ ] Phase 5  — Content upload with compression working
- [ ] Phase 6  — Browse and preview working
- [ ] Phase 7  — Token unlock flow working end to end
- [ ] Phase 8  — AI panel working on content page
- [ ] Phase 9  — Exam Mode all 4 tabs working
- [ ] Phase 10 — All support features working
- [ ] Phase 11 — All dashboards working
- [ ] Phase 12 — Deployed and tested on production

---

## Viva Positioning

BrainBarter is a peer-first MERN-based learning platform where students share and access
topic-wise academic content using a token system. The platform uses Supabase for auth,
database, and storage, with a lightweight Express backend exclusively for Gemini AI
integration. AI is used only as a support layer for summarization, simplification,
doubt clarification, revision notes, question generation, mock exams, and Exam Mode
preparation. The core learning remains peer-driven while AI improves understanding
and exam readiness.

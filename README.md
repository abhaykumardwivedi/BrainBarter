# 🧠 BrainBarter - Peer Learning Platform

A MERN-based tokenized learning platform where students can share and access educational content using tokens.

## 🚀 Features

- **Token Economy**: Buy/sell tokens, earn by creating content
- **AI Assistant**: Gemini-powered study help, doubt solving, mock tests
- **Content Marketplace**: Upload & unlock videos, notes, PDFs
- **Exam Mode**: AI-generated practice tests and revision materials
- **Leaderboard**: Top creators ranked by earnings
- **Payment Integration**: Razorpay for token purchases
- **Withdrawals**: Convert tokens to money (bank/UPI)

## 🛠 Tech Stack

- **Frontend**: React + Vite, Tailwind CSS, Zustand
- **Backend**: Express.js, Google Gemini AI
- **Database**: Supabase (PostgreSQL, Auth, Storage)
- **Payment**: Razorpay

## 📦 Deployment

### Prerequisites
- Node.js 18+
- Supabase account
- Razorpay account
- Google Gemini API key

### Deploy Frontend (Vercel)

1. Push code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your repository
4. Set Root Directory: `client`
5. Add Environment Variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_API_URL=your_deployed_server_url
   ```
6. Deploy!

### Deploy Backend (Render)

1. Go to [Render](https://render.com)
2. Create new Web Service
3. Connect your repository
4. Set Root Directory: `server`
5. Build Command: `npm install`
6. Start Command: `npm start`
7. Add Environment Variables:
   ```
   PORT=5000
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_key
   GEMINI_API_KEY=your_gemini_key
   CLIENT_URL=your_vercel_url
   ```
8. Deploy!

### Setup Database

1. Go to Supabase SQL Editor
2. Run `client/SETUP_TOKEN_ECONOMY.sql`
3. Set yourself as admin:
   ```sql
   update profiles set role = 'admin' where email = 'your_email';
   ```

### Update Razorpay Key

In `client/src/pages/Wallet.jsx` line 62:
```js
key: 'rzp_live_YOUR_LIVE_KEY', // Use live key for production
```

## 🔒 Security Notes

- Never commit `.env` files
- Use service_role key only on server
- Enable RLS policies on all Supabase tables
- Use HTTPS in production
- Verify Razorpay webhook signatures

## 📝 Local Development

```bash
# Install dependencies
cd client && npm install
cd ../server && npm install

# Run development servers
cd client && npm run dev   # Port 5173
cd server && npm run dev   # Port 5000
```

## 🎨 Token Economy

- **Buy Rate**: ₹1 = 10 tokens
- **Sell Rate**: 10 tokens = ₹0.80 (20% fee)
- **Min Purchase**: ₹10
- **Min Withdrawal**: ₹50
- **Content Pricing**: 20-200 tokens

## 👨‍💻 Author

Built with ❤️ for college students

## 📄 License

MIT

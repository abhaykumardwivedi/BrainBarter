# Email Verification Setup

## Overview
Email verification has been added to prevent unauthorized use of email addresses during registration.

## How It Works
1. User fills registration form (username, email, password)
2. System sends 6-digit verification code to the email
3. User enters the code to complete registration
4. Account is created only after successful verification

## Setup Instructions

### 1. Gmail App Password Setup
To send emails, you need a Gmail App Password:

1. Go to your Google Account: https://myaccount.google.com/
2. Select **Security** → **2-Step Verification** (enable if not already)
3. Scroll to **App passwords** → Click **Generate**
4. Select **Mail** and **Other (Custom name)** → Enter "BrainBarter"
5. Copy the 16-character password

### 2. Configure Environment Variables
Update `server/.env`:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password
```

### 3. Restart Server
```bash
cd server
npm run dev
```

## Files Modified/Created

### Backend
- `server/routes/auth.js` - Auth routes
- `server/controllers/authController.js` - Verification logic
- `server/index.js` - Added auth routes

### Frontend
- `client/src/pages/Register.jsx` - 2-step verification UI

## Features
- 6-digit random verification code
- 10-minute code expiration
- In-memory code storage (production: use Redis/database)
- Email validation before account creation
- Clean UI with step indicators

## Security Notes
- Codes expire after 10 minutes
- One-time use codes (deleted after verification)
- Email ownership verified before account creation
- Prevents email hijacking during registration

## Alternative Email Services
If not using Gmail, update `authController.js`:

**Outlook/Hotmail:**
```js
service: 'hotmail'
```

**Custom SMTP:**
```js
host: 'smtp.example.com',
port: 587,
secure: false,
auth: { user: '...', pass: '...' }
```

# Token Economy Setup Guide

## What's Been Built

Complete token purchase and withdrawal system with:
- **Buy Tokens**: Razorpay integration (UPI, cards, net banking)
- **Sell Tokens**: Withdrawal to bank account or UPI ID
- **Admin Panel**: Approve/reject withdrawal requests
- **Token Economy**: ₹1 = 10 tokens, 20% withdrawal fee

## Token Pricing Model

### Conversion Rates
- **Buy**: ₹1 = 10 tokens
- **Sell**: 10 tokens = ₹0.80 (20% platform fee)

### Limits
- Min purchase: ₹10 (100 tokens)
- Min withdrawal: ₹50 (625 tokens)

### Content Pricing Guide
- Notes/PDFs: 20-50 tokens (₹2-5)
- Videos: 50-100 tokens (₹5-10)
- Complete bundles: 100-200 tokens (₹10-20)
- Mock tests: 30-80 tokens (₹3-8)

## Setup Steps

### 1. Run SQL in Supabase SQL Editor

Run these files in order:
1. `supabase_withdrawal_schema.sql` - Creates withdrawal_requests table
2. `supabase_helpers.sql` - Adds role column and refund function

### 2. Get Razorpay API Key

1. Sign up at https://razorpay.com/
2. Go to Settings → API Keys
3. Generate test/live key
4. Replace `rzp_test_YOUR_KEY_HERE` in `Wallet.jsx` line 62

### 3. Set Yourself as Admin

In Supabase SQL Editor:
```sql
update profiles set role = 'admin' where email = 'your_email@example.com';
```

### 4. Test the Flow

#### As Student:
1. Go to Wallet page
2. Click "Buy Tokens"
3. Enter amount (min ₹10)
4. Complete Razorpay payment (use test card: 4111 1111 1111 1111)
5. Tokens credited instantly

#### Withdraw Money:
1. Click "Withdraw" button
2. Enter tokens (min 625)
3. Choose UPI or Bank Transfer
4. Fill details
5. Submit request

#### As Admin:
1. Go to Admin Panel
2. Click "Withdrawal Requests" tab
3. See pending requests with full details
4. Approve (enter transaction ID) or Reject (tokens auto-refunded)

## Files Modified

- `client/src/pages/Wallet.jsx` - Added buy/withdraw UI and Razorpay integration
- `client/src/pages/AdminPanel.jsx` - Added withdrawal approval tab
- `client/supabase_withdrawal_schema.sql` - Withdrawal requests table
- `client/supabase_helpers.sql` - Helper functions

## Testing with Razorpay Test Mode

Use these test credentials:
- **Card**: 4111 1111 1111 1111
- **CVV**: Any 3 digits
- **Expiry**: Any future date
- **UPI**: success@razorpay
- **Net Banking**: Select any bank

## Next Steps

1. Get real Razorpay key for production
2. Set up webhook for payment verification (optional but recommended)
3. Add email notifications for withdrawal status
4. Create withdrawal history page for users
5. Add daily/monthly withdrawal limits

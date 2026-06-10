-- ============================================================
-- BrainBarter — Missing Database Functions & Fixes
-- Run this in Supabase SQL Editor AFTER running supabase_schema.sql
-- ============================================================

-- 1. Add increment_views function (used in ContentPage.jsx)
CREATE OR REPLACE FUNCTION increment_views(content_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE content SET views = views + 1 WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add refund_tokens function (used in AdminPanel for withdrawal rejections)
CREATE OR REPLACE FUNCTION refund_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Add tokens back to user
  UPDATE profiles 
  SET token_balance = token_balance + p_amount 
  WHERE id = p_user_id;

  -- Log transaction
  INSERT INTO token_transactions (user_id, type, amount, reason)
  VALUES (p_user_id, 'earn', p_amount, p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create withdrawal_requests table (referenced in Wallet.jsx and AdminPanel.jsx)
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tokens_amount INTEGER NOT NULL,
  inr_amount DECIMAL(10,2) NOT NULL,
  method TEXT CHECK (method IN ('upi', 'bank')),
  
  -- UPI fields
  upi_id TEXT,
  
  -- Bank fields
  bank_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  account_holder TEXT,
  
  -- Status fields
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  transaction_id TEXT,
  admin_note TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on withdrawal_requests
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for withdrawal_requests
CREATE POLICY "Users can insert own withdrawal requests"
  ON withdrawal_requests FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own withdrawal requests"
  ON withdrawal_requests FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawal requests"
  ON withdrawal_requests FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update withdrawal requests"
  ON withdrawal_requests FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- 4. Add subject_id directly to content table for easier filtering
ALTER TABLE content ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;
ALTER TABLE content ADD COLUMN IF NOT EXISTS subject_name TEXT;
ALTER TABLE content ADD COLUMN IF NOT EXISTS topic_name TEXT;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_content_subject ON content(subject_id);
CREATE INDEX IF NOT EXISTS idx_content_published ON content(is_published);
CREATE INDEX IF NOT EXISTS idx_content_creator ON content(creator_id);

-- 5. Grant permissions
GRANT ALL ON withdrawal_requests TO authenticated;
GRANT EXECUTE ON FUNCTION increment_views TO authenticated;
GRANT EXECUTE ON FUNCTION refund_tokens TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'All missing functions and tables created successfully!';
END $$;

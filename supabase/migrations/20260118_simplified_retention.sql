-- Add retention fields to transactions
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_retained BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS retained_surplus NUMERIC DEFAULT 0;

-- Add investor flag to holders
ALTER TABLE holders
ADD COLUMN IF NOT EXISTS is_investor BOOLEAN DEFAULT FALSE;

-- Comments
COMMENT ON COLUMN transactions.is_retained IS 'Flag indicating if the transaction profit is retained as investment';
COMMENT ON COLUMN transactions.retained_surplus IS 'Amount of USDT retained as surplus from the transaction';
COMMENT ON COLUMN holders.is_investor IS 'Flag indicating if this holder is an investment platform/entity';

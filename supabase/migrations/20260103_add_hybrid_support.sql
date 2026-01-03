-- Add hybrid transaction support
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_hybrid BOOLEAN DEFAULT false;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS usdt_sell_rate_bank NUMERIC;

-- Add comment to explain columns
COMMENT ON COLUMN transactions.is_hybrid IS 'Whether the transaction covers cash costs and sells surplus profit at bank rate';
COMMENT ON COLUMN transactions.usdt_sell_rate_bank IS 'The sell rate used for the bank-profit portion of a hybrid transaction';

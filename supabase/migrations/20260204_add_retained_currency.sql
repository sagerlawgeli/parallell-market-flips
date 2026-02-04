-- Migration: Add missing retained_currency column to transactions table

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS retained_currency VARCHAR(10) DEFAULT 'USDT';

-- Update existing retained transactions to default to USDT if they are null
UPDATE transactions 
SET retained_currency = 'USDT' 
WHERE is_retained = true AND retained_currency IS NULL;

-- Add comment
COMMENT ON COLUMN transactions.retained_currency IS 'The currency in which the surplus is retained (USDT, EUR, GBP)';

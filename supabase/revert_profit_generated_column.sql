-- Revert profit column from generated always to a regular column
-- This allows manual overrides while still populating it initially with the current values.

-- 1. Drop the generated column
ALTER TABLE transactions DROP COLUMN IF EXISTS profit;

-- 2. Add it back as a regular numeric column
ALTER TABLE transactions ADD COLUMN profit numeric;

-- 3. Populate existing rows with the calculated value
UPDATE transactions 
SET profit = (usdt_amount * usdt_sell_rate) - (fiat_amount * fiat_buy_rate);

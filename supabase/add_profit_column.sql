-- Re-create profit column as a generated column
-- This ensures it is always calculated correctly based on the amounts and rates
-- Formula: (usdt_amount * usdt_sell_rate) - (fiat_amount * fiat_buy_rate)

-- 1. Drop the existing profit column if it exists
-- WARNING: This will remove any manually set profit values and replace them with the calculated value.
alter table transactions drop column if exists profit;

-- 2. Add it back as a generated column
alter table transactions 
add column profit numeric generated always as (
  (usdt_amount * usdt_sell_rate) - (fiat_amount * fiat_buy_rate)
) stored;

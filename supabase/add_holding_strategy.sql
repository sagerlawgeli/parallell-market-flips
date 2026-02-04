-- Create the Enum for Outcome Strategy
CREATE TYPE outcome_strategy AS ENUM ('total_cash', 'total_bank', 'partial_hold');

-- Add new columns to transactions table
ALTER TABLE transactions
ADD COLUMN outcome_strategy outcome_strategy DEFAULT 'total_cash',
ADD COLUMN held_amount DECIMAL(15, 2),
ADD COLUMN held_currency VARCHAR(10),
ADD COLUMN held_location VARCHAR(255);

-- Update existing transactions to have a default strategy (optional, but good for consistency)
UPDATE transactions SET outcome_strategy = 'total_cash' WHERE outcome_strategy IS NULL;

-- Add comment
COMMENT ON COLUMN transactions.outcome_strategy IS 'The strategy used to settle the transaction: total_cash, total_bank, or partial_hold';

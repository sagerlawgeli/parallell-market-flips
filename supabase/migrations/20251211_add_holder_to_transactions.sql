-- Add holder_id column to transactions table
alter table transactions 
add column holder_id uuid references holders(id) on delete set null;

-- Add index for better query performance
create index idx_transactions_holder_id on transactions(holder_id);

-- Add comment to document the column
comment on column transactions.holder_id is 'Reference to the holder who has the cash profit from this transaction. Required when step_fiat_paid is true.';

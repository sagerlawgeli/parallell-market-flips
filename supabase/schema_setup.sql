-- Create transactions table
create table transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  type text check (type in ('GBP', 'EUR')) not null,
  status text check (status in ('planned', 'in_progress', 'complete', 'cancelled')) not null default 'planned',
  payment_method text check (payment_method in ('cash', 'bank')) not null default 'cash',
  fiat_amount numeric not null default 0,
  fiat_buy_rate numeric not null default 0,
  usdt_amount numeric not null default 0,
  usdt_sell_rate numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  notes text,
  
  -- Progress steps
  step_fiat_acquired boolean default false,
  step_usdt_sold boolean default false,
  step_fiat_paid boolean default false,
  
  -- Rates & Fees
  forex_rate numeric default 0,
  crypto_rate numeric default 0,
  revolut_fee numeric default 0,
  kraken_fee numeric default 0
);

-- Enable RLS
alter table transactions enable row level security;

-- Create policy for shared access (as per previous requirements)
create policy "Allow all authenticated users to view all transactions"
on transactions for select
to authenticated
using (true);

create policy "Allow all authenticated users to insert transactions"
on transactions for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Allow all authenticated users to update all transactions"
on transactions for update
to authenticated
using (true);

create policy "Allow all authenticated users to delete all transactions"
on transactions for delete
to authenticated
using (true);

-- Create transaction_logs table
create table transaction_logs (
  id uuid default gen_random_uuid() primary key,
  transaction_id uuid references transactions on delete cascade not null,
  user_id uuid references auth.users not null,
  action text not null,
  changes jsonb not null,
  created_at timestamptz default now()
);

-- Enable RLS for logs
alter table transaction_logs enable row level security;

create policy "Allow all authenticated users to view logs"
on transaction_logs for select
to authenticated
using (true);

create policy "Allow all authenticated users to insert logs"
on transaction_logs for insert
to authenticated
with check (auth.uid() = user_id);

-- 1. Create user_roles table
create table if not exists user_roles (
  user_id uuid references auth.users primary key,
  role text check (role in ('admin', 'standard')) not null default 'standard',
  created_at timestamptz default now()
);

-- Enable RLS on user_roles
alter table user_roles enable row level security;

-- Allow everyone to read roles (needed for frontend to check own role)
create policy "Allow authenticated users to read roles"
on user_roles for select
to authenticated
using (true);

-- Only service_role can insert/update/delete roles (for now, manual assignment via SQL)

-- 2. Add is_private column to transactions
alter table transactions 
add column if not exists is_private boolean default true;

-- 3. Update RLS policies for transactions

-- Drop existing select policy
drop policy if exists "Allow all authenticated users to view all transactions" on transactions;

-- Create new select policy based on role
create policy "RBAC: View transactions"
on transactions for select
to authenticated
using (
  -- User is admin
  (select role from user_roles where user_id = auth.uid()) = 'admin'
  OR
  -- OR transaction is public
  is_private = false
);

-- Update insert/update/delete policies to restrict to admins only? 
-- Or allow standard users to create but force is_private=false?
-- For now, let's stick to the plan: Admins see everything, Standard see public.
-- Assuming Standard users generally DON'T create transactions in this app context (it's a ledger for the admins), 
-- but if they do, maybe they can only create public ones?
-- Let's keep write access open for now but maybe restricted by UI. 
-- Actually, the requirement was "User 3 shouldn't even see the option to make transaction private".
-- So if they create, it defaults to true? No, that would hide it from them!
-- Let's assume for now write access is same as before (all auth users), but we might want to restrict it later.
-- The prompt said "User 3... can otherwise use the app to the full capacity as we do".
-- So they CAN create transactions.
-- If they create a transaction, it should probably be visible to them.
-- If default is `true` (private), and they are standard, they won't see it after creating it!
-- So for standard users, default should probably be `false` or they should be allowed to see their OWN private transactions?
-- Let's adjust the policy: Users can see PUBLIC transactions OR their OWN transactions OR if they are ADMIN.

drop policy if exists "RBAC: View transactions" on transactions;

create policy "RBAC: View transactions"
on transactions for select
to authenticated
using (
  -- User is admin
  (select role from user_roles where user_id = auth.uid()) = 'admin'
  OR
  -- OR transaction is public
  is_private = false
  OR
  -- OR user owns the transaction
  user_id = auth.uid()
);

-- 4. Helper to assign admin role (Run this manually for specific users)
-- insert into user_roles (user_id, role) values ('USER_UUID_HERE', 'admin') on conflict (user_id) do update set role = 'admin';

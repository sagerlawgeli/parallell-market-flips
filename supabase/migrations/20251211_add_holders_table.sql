-- Create holders table
create table holders (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamptz default now(),
  created_by uuid references auth.users not null
);

-- Enable RLS
alter table holders enable row level security;

-- Create policies for holders
create policy "Allow all authenticated users to view holders"
on holders for select
to authenticated
using (true);

create policy "Allow all authenticated users to insert holders"
on holders for insert
to authenticated
with check (auth.uid() = created_by);

create policy "Allow all authenticated users to update holders"
on holders for update
to authenticated
using (true);

create policy "Allow all authenticated users to delete holders"
on holders for delete
to authenticated
using (true);

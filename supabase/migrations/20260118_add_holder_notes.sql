create table holder_notes (
  id uuid default gen_random_uuid() primary key,
  holder_id uuid references holders(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now() not null
);

-- Add RLS policies (reusing existing patterns)
alter table holder_notes enable row level security;

create policy "Enable read access for all users"
on holder_notes for select
using (true);

create policy "Enable insert for authenticated users only"
on holder_notes for insert
to authenticated
with check (true);

create policy "Enable delete for authenticated users only"
on holder_notes for delete
to authenticated
using (true);

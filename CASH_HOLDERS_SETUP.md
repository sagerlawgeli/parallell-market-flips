# Cash Holders Feature - Database Setup

## Apply Migrations

To enable the cash holders feature, you need to run the following SQL migrations in your Supabase database:

### 1. Create Holders Table

Run the migration file: `supabase/migrations/20251211_add_holders_table.sql`

This creates:
- `holders` table with columns: `id`, `name`, `created_at`, `created_by`
- Row-level security policies for authenticated users

### 2. Add Holder Reference to Transactions

Run the migration file: `supabase/migrations/20251211_add_holder_to_transactions.sql`

This adds:
- `holder_id` column to `transactions` table (nullable, foreign key to `holders`)
- Index on `holder_id` for performance

## How to Run Migrations

### Option 1: Supabase Dashboard (SQL Editor)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of each migration file
4. Execute the SQL

### Option 2: Supabase CLI (if using local development)
```bash
# The migrations are already in the migrations folder
# They will be applied automatically when you reset or push to Supabase
supabase db reset
# or
supabase db push
```

## Seed Initial Holders (Optional)

After running migrations, you can add initial holders via the app UI at `/holders`, or run this SQL:

```sql
INSERT INTO holders (name, created_by) VALUES
  ('Mohamed', (SELECT id FROM auth.users LIMIT 1)),
  ('Sanad', (SELECT id FROM auth.users LIMIT 1)),
  ('iSport Store', (SELECT id FROM auth.users LIMIT 1));
```

## Feature Overview

Once migrations are complete, you can:
1. **Manage Holders**: Navigate to `/holders` to add/edit/delete holders
2. **Assign Holders**: Edit transactions and select a holder from the dropdown
3. **View Summary**: Navigate to `/holders-summary` to see cash totals per holder
4. **Validation**: When marking a transaction as "Fiat Paid", a holder must be assigned

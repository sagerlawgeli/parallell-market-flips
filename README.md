# Arbitrage Ledger

A Progressive Web App for tracking arbitrage transactions between GBP/EUR and USDT, with real-time profit calculations and transaction management.

## Features

- **Calculator**: Real-time profit calculations with configurable exchange rates and fees
- **Transaction Management**: Track transactions with status phases (Fiat Acquired → USDT Sold → Fiat Paid)
- **Analytics Dashboard**: Visualize profits, volumes, and margins over time
- **PWA Support**: Installable on mobile devices with offline capabilities
- **Audit Logging**: Complete transaction history and change tracking

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and add your Supabase credentials
4. Run the development server:
   ```bash
   npm run dev
   ```

## Database Setup

Run the migration script in your Supabase SQL Editor:
```bash
# See migration_reset.sql in the artifacts directory
```

## Deployment

Build for production:
```bash
npm run build
```

Deploy to Vercel or Netlify by connecting your GitHub repository.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI, Lucide Icons
- **Backend**: Supabase (Auth, Database, RLS)
- **Charts**: Recharts
- **PWA**: vite-plugin-pwa

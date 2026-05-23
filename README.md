# DevFlow

Personal task and coding sprint tracker for individual developers.

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Prisma

## Local Development

```bash
npm install
cp .env.example .env.local
npm run prisma:generate
npm run dev
```

Open `http://localhost:3000/dashboard`.

If Supabase env variables are not filled, the app falls back to browser `localStorage` for demo data. After Supabase env variables are configured, auth and data persistence use Supabase + Prisma.

## Database Setup

Follow `SUPABASE_SETUP.md`.

Create tables with:

```bash
npm run prisma:migrate -- --name init
```

Deploy existing migrations with:

```bash
npm run prisma:deploy
```

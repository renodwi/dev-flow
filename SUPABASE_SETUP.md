# DevFlow Supabase Setup

DevFlow uses:

- Supabase Auth for register, login, logout, and session.
- Supabase PostgreSQL for app data.
- Prisma for schema, migration, and server-side database queries.

The app never queries project/task/sprint data directly from the browser. Browser requests include the Supabase access token, `/api/devflow` verifies it, then Prisma queries rows with `userId`.

## 1. Create Supabase Project

1. Open Supabase and create a new project.
2. Save the database password somewhere safe.
3. Wait until the project is fully provisioned.

## 2. Get Environment Values

In Supabase:

1. Go to `Project Settings` -> `API`.
2. Copy:
   - Project URL -> `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key -> `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Go to `Project Settings` -> `Database` -> `Connection string`.
4. Copy the pooled connection string for `DATABASE_URL`.
5. Copy the direct/session connection string for `DIRECT_URL`.

Use `.env.example` as the template and create `.env.local`.

## 3. Install and Generate Prisma Client

```bash
npm install
npm run prisma:generate
```

## 4. Create Database Tables

For local development, run:

```bash
npm run prisma:migrate -- --name init
```

For production deploys, run migrations from your machine or CI:

```bash
npm run prisma:deploy
```

## 5. Configure Auth

In Supabase Auth:

1. Enable Email provider.
2. For fastest MVP testing, disable email confirmation.
3. For production, enable email confirmation and set the Site URL to your Vercel domain.
4. Add redirect URLs:
   - `http://localhost:3000/**`
   - `https://your-vercel-domain.vercel.app/**`

## 6. Vercel Environment Variables

Add these variables in Vercel Project Settings:

```txt
DATABASE_URL
DIRECT_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

After adding env vars, redeploy the app.

## 7. Security Notes

- Each `Project`, `Task`, and `Sprint` row stores Supabase `user.id` in `userId`.
- `/api/devflow` rejects requests without a valid Supabase session token.
- Server mutations verify ownership before updating or deleting rows.
- RLS is optional for this Prisma API design because browser clients do not query these tables directly. If you later query tables from Supabase client-side, enable RLS policies first.

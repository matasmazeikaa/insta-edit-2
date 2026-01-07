# Push Migrations to Production

This guide shows you how to push your database migrations directly to your production Supabase project.

## Step 1: Get Your Project Reference ID

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **General**
4. Find your **Reference ID** (it looks like: `abcdefghijklmnop`)

## Step 2: Link Your Project

Run this command (replace `YOUR_PROJECT_REF` with your actual project reference ID):

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

You'll be prompted to:
- Enter your database password (found in Settings → Database → Database password)
- Confirm the link

## Step 3: Push Migrations to Production

Once linked, push your migrations:

```bash
npx supabase db push
```

This will:
- Apply all migrations in `supabase/migrations/` to your production database
- Show you what will be applied before executing
- Ask for confirmation before making changes

## Alternative: One-Time Push Without Linking

If you prefer not to link (one-time push):

```bash
npx supabase db push --linked=false --project-ref YOUR_PROJECT_REF
```

You'll need to provide your database password when prompted.

## Verify the Migration

After pushing, verify in Supabase Dashboard:
1. Go to **Table Editor** - you should see `projects` and `project_items` tables
2. Check **SQL Editor** → **Migration History** to see the applied migration

## Important Notes

⚠️ **Always backup your production database before running migrations!**

- The migration uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times
- If tables already exist, the migration will skip creating them
- RLS policies will be created/updated as needed

## Troubleshooting

### "Project not found"
- Double-check your project reference ID
- Make sure you're logged in: `npx supabase login`

### "Authentication failed"
- Verify your database password in Settings → Database
- Try linking again with the correct password

### "Migration already applied"
- This is fine! The migration is idempotent
- Check the migration history in Supabase Dashboard


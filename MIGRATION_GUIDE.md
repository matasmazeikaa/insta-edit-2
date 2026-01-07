# How to Run the Database Migration

This guide explains how to set up the database schema for the project management system.

## Method 1: Using Supabase Dashboard (Recommended - Easiest)

1. **Open your Supabase project**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and paste the migration**
   - Open the file `supabase-migrations.sql` in your project
   - Copy the entire contents (or use the file directly)
   - Paste it into the SQL Editor

4. **Run the migration**
   - Click the "Run" button (or press `Ctrl+Enter` / `Cmd+Enter`)
   - Wait for the query to complete

5. **Verify the migration**
   - Check the "Table Editor" in the left sidebar
   - You should see two new tables: `projects` and `project_items`
   - Verify that RLS (Row Level Security) is enabled on both tables

## Method 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (if not already linked)
supabase link --project-ref your-project-ref

# Run the migration
supabase db push
```

Or directly execute the SQL file:

```bash
# Execute the SQL file directly
supabase db execute -f supabase-migrations.sql
```

## Method 3: Using psql (Direct Database Access)

If you have direct database access:

```bash
# Get your database connection string from Supabase Dashboard
# Settings > Database > Connection string > URI

# Run the migration
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f supabase-migrations.sql
```

## After Running the Migration

### 1. Verify Tables Were Created

Go to **Table Editor** in Supabase Dashboard and verify:
- ✅ `projects` table exists
- ✅ `project_items` table exists
- ✅ Both tables have RLS enabled (shown as a shield icon)

### 2. Set Up Storage Bucket

1. Go to **Storage** in the Supabase Dashboard
2. Click **"New bucket"**
3. Name it: `project-assets`
4. Make it **Private** (important!)
5. Enable **Public access**: No
6. Click **"Create bucket"**

### 3. Set Up Storage Policies

Go to **Storage** > **Policies** for the `project-assets` bucket and create these policies:

**Policy 1: Users can upload to their own project folders**
```sql
CREATE POLICY "Users can upload to their own project folders"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 2: Users can read from their own project folders**
```sql
CREATE POLICY "Users can read from their own project folders"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 3: Users can delete from their own project folders**
```sql
CREATE POLICY "Users can delete from their own project folders"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 4: Users can update files in their own project folders**
```sql
CREATE POLICY "Users can update files in their own project folders"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'project-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 4. Verify Everything Works

1. Make sure your `.env.local` has the correct Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. Test creating a project in your app
3. Test uploading a file to a project
4. Verify the file appears in the `project-assets` bucket under `{user_id}/{project_id}/`

## Troubleshooting

### Error: "relation already exists"
- The tables might already exist. You can either:
  - Drop the existing tables and re-run the migration
  - Or modify the migration to use `CREATE TABLE IF NOT EXISTS` (already included)

### Error: "permission denied"
- Make sure you're using the correct database credentials
- Check that RLS policies are set up correctly

### Error: "bucket not found"
- Make sure you created the `project-assets` bucket
- Verify the bucket name matches exactly (case-sensitive)

### Error: "storage.foldername does not exist"
- This function should be available in Supabase by default
- If not, you may need to use a different approach for folder-based policies

## Quick Checklist

- [ ] Migration SQL executed successfully
- [ ] `projects` table created
- [ ] `project_items` table created
- [ ] RLS enabled on both tables
- [ ] `project-assets` storage bucket created (private)
- [ ] Storage policies created for the bucket
- [ ] Environment variables set in `.env.local`
- [ ] Tested creating a project
- [ ] Tested uploading a file

## Need Help?

If you encounter any issues:
1. Check the Supabase Dashboard logs
2. Verify your environment variables
3. Check the browser console for errors
4. Review the Supabase documentation for storage policies


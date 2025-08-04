# Supabase Setup Guide for LocalRetail

This guide will help you connect your LocalRetail application to Supabase for cloud-based data storage.

## Prerequisites

1. A Supabase account (free at https://supabase.com)
2. Basic understanding of SQL

## Step 1: Create a Supabase Project

1. Go to https://app.supabase.com/
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: LocalRetail (or any name you prefer)
   - Database Password: Create a strong password
   - Region: Choose the closest to your location
5. Click "Create new project"
6. Wait for the project to be ready (usually 1-2 minutes)

## Step 2: Set up the Database Schema

1. In your Supabase dashboard, go to the "SQL Editor"
2. Click "New query"
3. Copy the entire content from `supabase-schema.sql` file
4. Paste it into the SQL editor
5. Click "Run" to execute the schema

This will create all necessary tables, indexes, and default data.

## Step 3: Get Your API Keys

1. In your Supabase dashboard, go to "Settings" > "API"
2. Copy the following values:
   - **Project URL**: Something like `https://your-project-id.supabase.co`
   - **Anon key**: A long string starting with `eyJ...`

## Step 4: Configure Environment Variables

1. Open the `.env` file in your project root
2. Replace the placeholder values with your actual Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

## Step 5: Test the Connection

1. Save your `.env` file
2. Restart your development server:
   ```bash
   npm run dev
   ```
3. Open your application
4. Try creating a customer or product - data should now be saved to Supabase!

## Verification

To verify everything is working:

1. Create a test customer in your app
2. Go to your Supabase dashboard > "Table Editor"
3. Click on the "customers" table
4. You should see your test customer data

## Data Migration (Optional)

If you have existing data in localStorage and want to migrate it to Supabase:

1. Export your current data using browser developer tools
2. Use the Supabase dashboard or write a migration script
3. Import the data into the appropriate tables

## Security Considerations

- **Row Level Security (RLS)**: The schema includes permissive policies for development. In production, implement proper authentication and authorization.
- **Environment Variables**: Never commit your `.env` file to version control
- **Service Role Key**: Only use if you need admin-level operations

## Troubleshooting

### Common Issues:

1. **"Missing Supabase environment variables"**: Check your `.env` file format and restart the dev server
2. **Connection errors**: Verify your project URL and API key
3. **Database errors**: Check the SQL schema was executed correctly
4. **CORS issues**: Supabase allows all origins by default, but check your project settings if needed

### Support

- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com/

## Fallback Mode

The application automatically falls back to localStorage if Supabase is not configured, so you can develop locally without Supabase and add it later.

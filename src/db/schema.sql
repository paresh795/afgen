-- Enable the necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean initialization)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS figures CASCADE;
DROP TABLE IF EXISTS credits CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table (this is managed by Supabase Auth)
-- We're creating a shadow table to track additional user data
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create credits table
CREATE TABLE IF NOT EXISTS credits (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create figures table
CREATE TABLE IF NOT EXISTS figures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt_json JSONB,
  status TEXT NOT NULL CHECK (status IN ('queued', 'done', 'error')),
  image_url TEXT,
  cost_cents INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_session TEXT,
  amount_cents INTEGER NOT NULL,
  credits_added INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Supabase storage bucket for figures
BEGIN;
  INSERT INTO storage.buckets (id, name, public) VALUES 
    ('figures', 'figures', true)
  ON CONFLICT (id) DO NOTHING;
COMMIT;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE figures ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop existing ones first to avoid conflicts)
DO $$ 
BEGIN
  -- Users table policies
  DROP POLICY IF EXISTS "Users can view their own data" ON users;
  EXECUTE format('CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id)');

  -- Credits table policies
  DROP POLICY IF EXISTS "Users can view their own credits" ON credits;
  EXECUTE format('CREATE POLICY "Users can view their own credits" ON credits FOR SELECT USING (auth.uid() = user_id)');
  
  DROP POLICY IF EXISTS "Only service role can update credits" ON credits;
  EXECUTE format('CREATE POLICY "Only service role can update credits" ON credits FOR UPDATE USING (false) WITH CHECK (false)');

  -- Figures table policies
  DROP POLICY IF EXISTS "Users can view their own figures" ON figures;
  EXECUTE format('CREATE POLICY "Users can view their own figures" ON figures FOR SELECT USING (auth.role() = ''authenticated'')');
  
  DROP POLICY IF EXISTS "Users can insert their own figures" ON figures;
  EXECUTE format('CREATE POLICY "Users can insert their own figures" ON figures FOR INSERT WITH CHECK (auth.uid() = user_id)');

  -- Payments table policies
  DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
  EXECUTE format('CREATE POLICY "Users can view their own payments" ON payments FOR SELECT USING (auth.uid() = user_id)');
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating policies: %', SQLERRM;
END $$;

-- Trigger for new users to automatically create a credits record
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at)
  VALUES (NEW.id, NEW.email, NEW.created_at);
  
  INSERT INTO public.credits (user_id, balance)
  VALUES (NEW.id, 0);
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage policies
DO $$ 
BEGIN
  -- Storage policies
  BEGIN
    DROP POLICY IF EXISTS "Public read access for figures" ON storage.objects;
    EXECUTE format('CREATE POLICY "Public read access for figures" ON storage.objects FOR SELECT USING (bucket_id = ''figures'')');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating storage select policy: %', SQLERRM;
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Users can upload figures to their own folder" ON storage.objects;
    EXECUTE format('CREATE POLICY "Users can upload figures to their own folder" ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''figures'' AND auth.uid()::text = (storage.foldername(name))[1])');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating storage insert policy: %', SQLERRM;
  END;
END $$; 
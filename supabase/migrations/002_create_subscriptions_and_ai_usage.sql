-- Create user_profiles table for subscription and usage tracking
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  "stripeCustomerId" TEXT UNIQUE,
  "subscriptionId" TEXT,
  "subscriptionStatus" TEXT DEFAULT 'free', -- 'free', 'active', 'canceled', 'past_due'
  "subscriptionPriceId" TEXT,
  "subscriptionCurrentPeriodEnd" TIMESTAMPTZ,
  "aiGenerationsUsed" INTEGER DEFAULT 0,
  "aiGenerationsResetAt" TIMESTAMPTZ DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on stripeCustomerId for webhook lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer ON user_profiles("stripeCustomerId");

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile (limited fields)
CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Allow insert for new users (triggered by auth)
CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create ai_generation_logs table for detailed tracking
CREATE TABLE IF NOT EXISTS ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "generationType" TEXT NOT NULL, -- 'video_analysis', 'title_generation', etc.
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index on userId and createdAt for usage queries
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_user_date ON ai_generation_logs("userId", "createdAt" DESC);

-- Enable RLS on ai_generation_logs
ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own generation logs
CREATE POLICY "Users can view their own generation logs"
  ON ai_generation_logs
  FOR SELECT
  USING (auth.uid() = "userId");

-- Policy: Users can insert their own generation logs
CREATE POLICY "Users can insert their own generation logs"
  ON ai_generation_logs
  FOR INSERT
  WITH CHECK (auth.uid() = "userId");

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, "createdAt", "updatedAt")
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to reset AI generations monthly
CREATE OR REPLACE FUNCTION reset_monthly_ai_generations()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET 
    "aiGenerationsUsed" = 0,
    "aiGenerationsResetAt" = NOW(),
    "updatedAt" = NOW()
  WHERE "aiGenerationsResetAt" < NOW() - INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


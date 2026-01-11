import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

const FREE_TIER_LIMIT = 3;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with subscription info
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('subscriptionStatus, aiGenerationsUsed, aiGenerationsResetAt')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is ok for new users
      console.error('Profile error:', profileError);
    }

    const subscriptionStatus = profile?.subscriptionStatus || 'free';
    const aiGenerationsUsed = profile?.aiGenerationsUsed || 0;
    const isPremium = subscriptionStatus === 'active';

    // Check if we need to reset monthly counter
    const resetAt = profile?.aiGenerationsResetAt ? new Date(profile.aiGenerationsResetAt) : null;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    let effectiveUsage = aiGenerationsUsed;
    if (resetAt && resetAt < oneMonthAgo) {
      // Reset the counter
      effectiveUsage = 0;
      await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          aiGenerationsUsed: 0,
          aiGenerationsResetAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
    }

    const canGenerate = isPremium || effectiveUsage < FREE_TIER_LIMIT;
    const remaining = isPremium ? 'unlimited' : Math.max(0, FREE_TIER_LIMIT - effectiveUsage);

    return NextResponse.json({
      canGenerate,
      isPremium,
      used: effectiveUsage,
      limit: isPremium ? 'unlimited' : FREE_TIER_LIMIT,
      remaining,
    });
  } catch (error: any) {
    console.error('Check usage error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


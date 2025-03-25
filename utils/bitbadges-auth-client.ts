'use client';

import { createClient } from '@/utils/supabase/client';

export interface BitBadgesConnectionStatus {
    isConnected: boolean;
    bitbadgesAddress: string | null;
}

export async function getCurrentUserId(): Promise<string | null> {
    const supabase = createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    console.log('Current user:', user?.id);
    return user?.id || null;
}

export async function checkBitBadgesConnection(
    userId: string
): Promise<BitBadgesConnectionStatus> {
    console.log('Checking connection for user:', userId);
    const supabase = createClient();
    const { data: tokenData, error } = await supabase
        .from('bitbadges_tokens')
        .select('bitbadges_address')
        .eq('user_id', userId)
        .single();

    console.log('Token data:', tokenData);
    console.log('Error:', error);

    return {
        isConnected: !!tokenData,
        bitbadgesAddress: tokenData?.bitbadges_address || null,
    };
}

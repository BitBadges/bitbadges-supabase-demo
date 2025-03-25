'use server';

import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient as createBrowserClient } from '@/utils/supabase/client';

const BITBADGES_AUTH_URL = 'https://bitbadges.io/siwbb/authorize';
const BITBADGES_TOKEN_URL = 'https://api.bitbadges.io/api/v0/siwbb/token';
const BITBADGES_REVOKE_URL =
    'https://api.bitbadges.io/api/v0/siwbb/token/revoke';

export interface BitBadgesTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    access_token_expires_at: number;
    address: string;
    chain: string;
    bitbadgesAddress: string;
}

export async function initiateBitBadgesAuth() {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error(
            'User must be authenticated to initiate BitBadges auth'
        );
    }

    const params = new URLSearchParams({
        client_id: process.env.BITBADGES_CLIENT_ID!,
        redirect_uri: process.env.BITBADGES_REDIRECT_URI!,
        response_type: 'code',
        state: user.id,
        scope: '',
    });

    const authUrl = `${BITBADGES_AUTH_URL}?${params.toString()}`;
    console.log('Generated auth URL:', authUrl);
    return authUrl;
}

export async function exchangeCodeForToken(
    code: string,
    redirectUri: string
): Promise<BitBadgesTokenResponse> {
    console.log('Exchanging code for token with redirect URI:', redirectUri);
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error(
            'User must be authenticated to exchange code for token'
        );
    }

    const response = await fetch(BITBADGES_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'x-api-key': process.env.BITBADGES_API_KEY!,
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: process.env.BITBADGES_CLIENT_ID!,
            client_secret: process.env.BITBADGES_CLIENT_SECRET!,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Token exchange failed:', errorText);
        throw new Error(
            `Failed to exchange code for token: ${response.statusText}`
        );
    }

    const tokenData = await response.json();
    console.log('Received token data:', tokenData);

    // Store the token in Supabase
    const { error: upsertError } = await supabase
        .from('bitbadges_tokens')
        .upsert({
            user_id: user.id,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: new Date(
                tokenData.access_token_expires_at
            ).toISOString(),
            bitbadges_address: tokenData.bitbadgesAddress,
            chain: tokenData.chain,
        });

    if (upsertError) {
        console.error('Failed to store token:', upsertError);
        throw new Error('Failed to store token in database');
    }

    return tokenData;
}

export async function revokeToken(userId: string) {
    const supabase = await createServerClient();

    // Get the refresh token from Supabase
    const { data: tokenData } = await supabase
        .from('bitbadges_tokens')
        .select('refresh_token')
        .eq('user_id', userId)
        .single();

    if (!tokenData?.refresh_token) {
        throw new Error('No refresh token found');
    }

    // Revoke the token with BitBadges
    const response = await fetch(BITBADGES_REVOKE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'x-api-key': process.env.BITBADGES_API_KEY!,
        },
        body: new URLSearchParams({
            token: tokenData.refresh_token,
            client_id: process.env.BITBADGES_CLIENT_ID!,
            client_secret: process.env.BITBADGES_CLIENT_SECRET!,
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to revoke token: ${response.statusText}`);
    }

    // Delete the token from Supabase
    await supabase.from('bitbadges_tokens').delete().eq('user_id', userId);
}

export async function getValidToken(userId: string): Promise<string> {
    const supabase = await createServerClient();

    const { data: tokenData } = await supabase
        .from('bitbadges_tokens')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (!tokenData) {
        throw new Error('No token found');
    }

    // Check if token is expired
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt <= new Date()) {
        // Token is expired, you might want to implement refresh token logic here
        throw new Error('Token expired');
    }

    return tokenData.access_token;
}

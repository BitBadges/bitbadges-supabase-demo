import { exchangeCodeForToken } from '@/utils/bitbadges-auth';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    try {
        const code = requestUrl.searchParams.get('code');
        const state = requestUrl.searchParams.get('state');
        const error = requestUrl.searchParams.get('error');

        if (error) {
            throw new Error(`OAuth error: ${error}`);
        }

        if (!code || !state) {
            throw new Error('Missing required OAuth parameters');
        }

        // Verify the state matches the user's ID
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user || user.id !== state) {
            throw new Error('Invalid state parameter');
        }

        // Exchange the code for a token
        const redirectUri = process.env.BITBADGES_REDIRECT_URI!;
        await exchangeCodeForToken(code, redirectUri);

        //TODO: Check any claim successes or anything you need to do here

        // Redirect to the protected page or dashboard
        return NextResponse.redirect(`${requestUrl.origin}/protected`);
    } catch (error) {
        console.error('BitBadges OAuth error:', error);
        return NextResponse.redirect(
            `${requestUrl.origin}/protected?error=${encodeURIComponent(
                error instanceof Error ? error.message : 'Authentication failed'
            )}`
        );
    }
}

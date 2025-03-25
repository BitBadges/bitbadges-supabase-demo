'use client';

import { useEffect, useState } from 'react';
import { initiateBitBadgesAuth, revokeToken } from '@/utils/bitbadges-auth';
import {
    checkBitBadgesConnection,
    getCurrentUserId,
} from '@/utils/bitbadges-auth-client';

export default function BitBadgesConnect() {
    const [isConnected, setIsConnected] = useState(false);
    const [bitbadgesAddress, setBitbadgesAddress] = useState<string | null>(
        null
    );
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        checkConnectionStatus();
    }, []);

    const checkConnectionStatus = async () => {
        try {
            const userId = await getCurrentUserId();
            if (!userId) {
                console.log('No user ID found');
                setIsLoading(false);
                return;
            }

            console.log('Checking connection for user:', userId);
            const { isConnected, bitbadgesAddress } =
                await checkBitBadgesConnection(userId);
            console.log('Connection status:', {
                isConnected,
                bitbadgesAddress,
            });
            setIsConnected(isConnected);
            setBitbadgesAddress(bitbadgesAddress);
        } catch (error) {
            console.error('Error checking connection status:', error);
            setError('Failed to check connection status');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            setError(null);
            const authUrl = await initiateBitBadgesAuth();
            window.location.href = authUrl;
        } catch (error) {
            console.error('Error initiating BitBadges auth:', error);
            setError('Failed to connect to BitBadges');
        }
    };

    const handleDisconnect = async () => {
        try {
            setError(null);
            const userId = await getCurrentUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            await revokeToken(userId);
            setIsConnected(false);
            setBitbadgesAddress(null);
        } catch (error) {
            console.error('Error disconnecting BitBadges:', error);
            setError('Failed to disconnect from BitBadges');
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="p-4 border rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">BitBadges Connection</h2>
            {error && (
                <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                    {error}
                </div>
            )}
            {isConnected ? (
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-green-600">Connected</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                        Connected Address: {bitbadgesAddress}
                    </p>
                    <button
                        onClick={handleDisconnect}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                    >
                        Disconnect
                    </button>
                </div>
            ) : (
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                        <span className="text-gray-600">Not Connected</span>
                    </div>
                    <button
                        onClick={handleConnect}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                    >
                        Connect BitBadges
                    </button>
                </div>
            )}
        </div>
    );
}

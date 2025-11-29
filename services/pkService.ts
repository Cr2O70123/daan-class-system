
import { supabase } from './supabaseClient';
import { User, PkPlayerState, PkGamePayload } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

// --- Matchmaking Service ---

let matchmakingChannel: RealtimeChannel | null = null;
let gameChannel: RealtimeChannel | null = null;
let disconnectTimer: number | null = null;

export const joinMatchmaking = (
    user: User, 
    onMatchFound: (opponent: PkPlayerState, roomId: string, isHost: boolean) => void,
    onStatusChange: (msg: string) => void
) => {
    // Clean up any existing connection first
    leaveMatchmaking();

    const myState: PkPlayerState = {
        studentId: user.studentId,
        name: user.name,
        avatarColor: user.avatarColor,
        avatarImage: user.avatarImage,
        avatarFrame: user.avatarFrame,
        level: user.level,
        status: 'idle',
        joinedAt: Date.now()
    };

    onStatusChange("正在連接大廳伺服器...");

    matchmakingChannel = supabase.channel('public-pk-lobby', {
        config: {
            presence: {
                key: user.studentId,
            },
        },
    });

    matchmakingChannel
        .on('presence', { event: 'sync' }, () => {
            const state = matchmakingChannel?.presenceState();
            if (!state) return;

            const allUsers: PkPlayerState[] = [];
            for (const key in state) {
                // @ts-ignore
                const userState = state[key][0] as PkPlayerState;
                if (userState) allUsers.push(userState);
            }

            // Filter only idle users
            const idleUsers = allUsers.filter(u => u.status === 'idle');
            
            // Sort by join time to ensure deterministic pairing
            const sortedUsers = idleUsers.sort((a, b) => a.joinedAt - b.joinedAt);
            const myIndex = sortedUsers.findIndex(u => u.studentId === user.studentId);

            onStatusChange(`尋找對手中... (線上人數: ${idleUsers.length})`);

            if (myIndex !== -1 && sortedUsers.length > 1) {
                // Determine pair based on sorted list
                // If I am at index 0, I match with index 1. 
                // If I am at index 2, I match with index 3.
                // Only the "even" index initiates the match to prevent double-firing.
                
                if (myIndex % 2 === 0 && myIndex + 1 < sortedUsers.length) {
                    const opponent = sortedUsers[myIndex + 1];
                    
                    // Generate a deterministic Room ID based on sorted Student IDs
                    const ids = [user.studentId, opponent.studentId].sort();
                    const roomId = `room_${ids[0]}_${ids[1]}`;
                    
                    console.log(`Initiating match with ${opponent.name} in ${roomId}`);

                    // Send offer
                    matchmakingChannel?.send({
                        type: 'broadcast',
                        event: 'MATCH_OFFER',
                        payload: {
                            targetId: opponent.studentId,
                            initiator: myState,
                            roomId: roomId
                        }
                    });

                    // I am the host/initiator
                    onMatchFound(opponent, roomId, true); 
                }
            }
        })
        .on('broadcast', { event: 'MATCH_OFFER' }, ({ payload }) => {
            // Check if this offer is for me
            if (payload.targetId === user.studentId) {
                const initiator = payload.initiator as PkPlayerState;
                const roomId = payload.roomId;
                
                console.log(`Received match offer from ${initiator.name}`);
                
                // I am the joiner
                onMatchFound(initiator, roomId, false);
            }
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                onStatusChange("正在搜尋對手...");
                await matchmakingChannel?.track(myState);
            } else if (status === 'CHANNEL_ERROR') {
                onStatusChange("連線錯誤，請重試");
            }
        });
};

export const leaveMatchmaking = () => {
    if (matchmakingChannel) {
        matchmakingChannel.unsubscribe();
        matchmakingChannel = null;
    }
};

/**
 * Join a private game room.
 * Improved logic to handle connection stability.
 */
export const joinGameRoom = (
    roomId: string,
    userId: string,
    onGameEvent: (payload: PkGamePayload) => void,
    onOpponentLeft: () => void,
    onRoomReady: () => void
) => {
    // Cleanup previous game channels
    if (gameChannel) {
        gameChannel.unsubscribe();
        gameChannel = null;
    }
    if (disconnectTimer) {
        clearTimeout(disconnectTimer);
        disconnectTimer = null;
    }

    console.log(`Connecting to Game Room: ${roomId}`);

    gameChannel = supabase.channel(roomId, {
        config: {
            presence: {
                key: userId
            }
        }
    });
    
    let isConnected = false;

    gameChannel
        .on('broadcast', { event: 'GAME_EVENT' }, ({ payload }) => {
            onGameEvent(payload as PkGamePayload);
        })
        .on('presence', { event: 'sync' }, () => {
            const state = gameChannel?.presenceState();
            const count = state ? Object.keys(state).length : 0;
            // console.log(`Room Sync: ${count} users`);

            // If we have 2 players, the room is ready
            if (count >= 2) {
                if (disconnectTimer) {
                    clearTimeout(disconnectTimer);
                    disconnectTimer = null;
                }
                // Only trigger ready once when we hit 2 players
                if (!isConnected) {
                    isConnected = true;
                    onRoomReady();
                }
            } else if (isConnected && count < 2) {
                // If we were connected but count dropped, opponent might have left
                // Add a small debounce to avoid flickering on page reload
                if (!disconnectTimer) {
                    disconnectTimer = window.setTimeout(() => {
                        console.log("Opponent disconnect confirmed");
                        onOpponentLeft();
                    }, 5000); // 5 seconds grace period for reconnections
                }
            }
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                // Track my presence in the room
                await gameChannel?.track({ online: true, userId });
            }
        });
};

export const sendGameEvent = async (payload: PkGamePayload) => {
    if (!gameChannel) return;
    try {
        await gameChannel.send({
            type: 'broadcast',
            event: 'GAME_EVENT',
            payload
        });
    } catch (e) {
        console.error("Send Event Error", e);
    }
};

export const leaveGameRoom = () => {
    if (disconnectTimer) {
        clearTimeout(disconnectTimer);
        disconnectTimer = null;
    }
    if (gameChannel) {
        gameChannel.unsubscribe();
        gameChannel = null;
    }
};

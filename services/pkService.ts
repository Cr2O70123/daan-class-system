
import { supabase } from './supabaseClient';
import { User, PkPlayerState, PkGamePayload, Word } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

// --- Matchmaking Service ---

let matchmakingChannel: RealtimeChannel | null = null;
let gameChannel: RealtimeChannel | null = null;

/**
 * Join the global matchmaking lobby.
 * Uses Supabase Presence to track online users.
 */
export const joinMatchmaking = (
    user: User, 
    onMatchFound: (opponent: PkPlayerState, roomId: string, isHost: boolean) => void,
    onStatusChange: (msg: string) => void
) => {
    // 1. Clean up existing
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

            // Flatten presence state to get all users
            const allUsers: PkPlayerState[] = [];
            for (const key in state) {
                // @ts-ignore
                const userState = state[key][0] as PkPlayerState;
                if (userState) allUsers.push(userState);
            }

            // Filter for idle users
            const idleUsers = allUsers.filter(u => u.status === 'idle');
            
            // Check if I can match with anyone
            // Logic: I match with someone if I am "older" (joined earlier) than them, or if I randomly pick them?
            // To avoid race condition (both picking each other), we sort by joinedAt.
            // The user who joined *earlier* is responsible for initiating the match with the next available user.
            
            const sortedUsers = idleUsers.sort((a, b) => a.joinedAt - b.joinedAt);
            const myIndex = sortedUsers.findIndex(u => u.studentId === user.studentId);

            if (myIndex !== -1 && sortedUsers.length > 1) {
                // Determine pair
                // If I am at index 0, I pair with index 1. 
                // If I am at index 2, I pair with index 3.
                // If I am at index 1, I wait for index 0 to pair with me.
                
                if (myIndex % 2 === 0 && myIndex + 1 < sortedUsers.length) {
                    // I am the "Host" / Initiator
                    const opponent = sortedUsers[myIndex + 1];
                    const roomId = `room_${user.studentId}_${opponent.studentId}`;
                    
                    // Broadcast MATCH_START event to specific user? 
                    // Supabase Broadcast sends to everyone. We include targetId in payload.
                    matchmakingChannel?.send({
                        type: 'broadcast',
                        event: 'MATCH_OFFER',
                        payload: {
                            targetId: opponent.studentId,
                            initiator: myState,
                            roomId: roomId
                        }
                    });

                    // I also accept it myself
                    onMatchFound(opponent, roomId, true); // I am host
                }
            }
        })
        .on('broadcast', { event: 'MATCH_OFFER' }, ({ payload }) => {
            // Check if this offer is for me
            if (payload.targetId === user.studentId) {
                // I am the guest
                const initiator = payload.initiator as PkPlayerState;
                const roomId = payload.roomId;
                onMatchFound(initiator, roomId, false); // I am guest
            }
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                onStatusChange("正在搜尋對手...");
                await matchmakingChannel?.track(myState);
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
 */
export const joinGameRoom = (
    roomId: string,
    onGameEvent: (payload: PkGamePayload) => void
) => {
    if (gameChannel) leaveGameRoom();

    gameChannel = supabase.channel(roomId);
    
    gameChannel
        .on('broadcast', { event: 'GAME_EVENT' }, ({ payload }) => {
            onGameEvent(payload as PkGamePayload);
        })
        .subscribe();
};

export const sendGameEvent = async (payload: PkGamePayload) => {
    if (!gameChannel) return;
    await gameChannel.send({
        type: 'broadcast',
        event: 'GAME_EVENT',
        payload
    });
};

export const leaveGameRoom = () => {
    if (gameChannel) {
        gameChannel.unsubscribe();
        gameChannel = null;
    }
};

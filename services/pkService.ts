
import { supabase } from './supabaseClient';
import { User, PkPlayerState, PkGamePayload, Word } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

// --- Matchmaking Service ---

let matchmakingChannel: RealtimeChannel | null = null;
let gameChannel: RealtimeChannel | null = null;

export const joinMatchmaking = (
    user: User, 
    onMatchFound: (opponent: PkPlayerState, roomId: string, isHost: boolean) => void,
    onStatusChange: (msg: string) => void
) => {
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

            const allUsers: PkPlayerState[] = [];
            for (const key in state) {
                // @ts-ignore
                const userState = state[key][0] as PkPlayerState;
                if (userState) allUsers.push(userState);
            }

            const idleUsers = allUsers.filter(u => u.status === 'idle');
            
            const sortedUsers = idleUsers.sort((a, b) => a.joinedAt - b.joinedAt);
            const myIndex = sortedUsers.findIndex(u => u.studentId === user.studentId);

            if (myIndex !== -1 && sortedUsers.length > 1) {
                // Match with the next person
                if (myIndex % 2 === 0 && myIndex + 1 < sortedUsers.length) {
                    const opponent = sortedUsers[myIndex + 1];
                    // Deterministic Room ID: Always sort IDs to ensure consistency
                    const ids = [user.studentId, opponent.studentId].sort();
                    const roomId = `room_${ids[0]}_${ids[1]}`;
                    
                    matchmakingChannel?.send({
                        type: 'broadcast',
                        event: 'MATCH_OFFER',
                        payload: {
                            targetId: opponent.studentId,
                            initiator: myState,
                            roomId: roomId
                        }
                    });

                    onMatchFound(opponent, roomId, true); 
                }
            }
        })
        .on('broadcast', { event: 'MATCH_OFFER' }, ({ payload }) => {
            if (payload.targetId === user.studentId) {
                const initiator = payload.initiator as PkPlayerState;
                const roomId = payload.roomId;
                onMatchFound(initiator, roomId, false);
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
    onGameEvent: (payload: PkGamePayload) => void,
    onOpponentLeft: () => void,
    onConnected: () => void
) => {
    if (gameChannel) leaveGameRoom();

    console.log(`Joining Game Room: ${roomId}`);

    gameChannel = supabase.channel(roomId, {
        config: {
            presence: {
                key: 'player'
            }
        }
    });
    
    gameChannel
        .on('broadcast', { event: 'GAME_EVENT' }, ({ payload }) => {
            // console.log("Received Game Event:", payload);
            onGameEvent(payload as PkGamePayload);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
            // If anyone leaves, notify game over
            // console.log("Presence Left:", leftPresences);
            if (leftPresences.length > 0) {
                onOpponentLeft();
            }
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                console.log("Game Channel Subscribed!");
                await gameChannel?.track({ online: true });
                onConnected();
            } else if (status === 'CHANNEL_ERROR') {
                console.error("Game Channel Error");
            }
        });
};

export const sendGameEvent = async (payload: PkGamePayload) => {
    if (!gameChannel) {
        console.warn("Attempted to send event without active channel");
        return;
    }
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

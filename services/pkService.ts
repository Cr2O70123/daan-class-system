
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
                if (myIndex % 2 === 0 && myIndex + 1 < sortedUsers.length) {
                    const opponent = sortedUsers[myIndex + 1];
                    const roomId = `room_${user.studentId}_${opponent.studentId}`;
                    
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
    onOpponentLeft?: () => void
) => {
    if (gameChannel) leaveGameRoom();

    gameChannel = supabase.channel(roomId, {
        config: {
            presence: {
                key: 'game-session'
            }
        }
    });
    
    gameChannel
        .on('broadcast', { event: 'GAME_EVENT' }, ({ payload }) => {
            onGameEvent(payload as PkGamePayload);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
            // If anyone leaves, notify game over
            if (onOpponentLeft && leftPresences.length > 0) {
                onOpponentLeft();
            }
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await gameChannel?.track({ online: true });
            }
        });
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

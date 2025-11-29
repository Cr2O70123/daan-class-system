
import { supabase } from './supabaseClient';
import { Question, Resource, Exam, User, GameLeaderboardEntry, LeaderboardEntry } from '../types';
import { calculateLevel } from './levelService';
import { createNotification } from './notificationService';

// --- Questions ---

export const fetchQuestions = async (): Promise<Question[]> => {
    const { data, error } = await supabase
        .from('questions')
        .select(`
            *,
            replies (*)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Supabase fetch questions failed:', error);
        throw error; // Strict mode
    }

    return data.map((q: any) => ({
        id: q.id,
        title: q.title,
        content: q.content,
        image: q.image,
        author: q.author_name,
        date: new Date(q.created_at).toLocaleDateString(),
        tags: q.tags || [],
        status: q.status,
        replyCount: q.replies ? q.replies.length : 0,
        views: q.views,
        authorAvatarColor: q.author_avatar_data?.color || 'bg-gray-400',
        authorAvatarImage: q.author_avatar_data?.image,
        authorAvatarFrame: q.author_avatar_data?.frame,
        authorNameColor: q.author_avatar_data?.nameColor,
        isAnonymous: q.author_name === '匿名同學', 
        replies: (q.replies || []).map((r: any) => ({
            id: r.id,
            author: r.author_name,
            content: r.content,
            image: r.image,
            date: new Date(r.created_at).toLocaleDateString(),
            isBestAnswer: r.is_best_answer,
            avatarColor: r.author_avatar_data?.color || 'bg-gray-400',
            avatarImage: r.author_avatar_data?.image,
            avatarFrame: r.author_avatar_data?.frame,
            nameColor: r.author_avatar_data?.nameColor,
            isAnonymous: r.author_name === '匿名同學',
        }))
    }));
};

export const createQuestion = async (user: User, title: string, content: string, tags: string[], image?: string, isAnonymous: boolean = false) => {
    // Data Sanitization
    const sanitizedImage = image || null; // Convert undefined to null for SQL
    const sanitizedTags = Array.isArray(tags) ? tags : []; // Ensure tags is array
    
    // Determine Author Details (Mask if anonymous)
    const authorName = isAnonymous ? '匿名同學' : user.name;
    const avatarData = isAnonymous ? {
        color: 'bg-gray-500', // Distinct gray for anon
        image: null,
        frame: null,
        nameColor: null
    } : {
        color: user.avatarColor || 'bg-gray-400',
        image: user.avatarImage || null,
        frame: user.avatarFrame || null,
        nameColor: user.nameColor || null
    };

    const { error } = await supabase.from('questions').insert([{
        title,
        content,
        image: sanitizedImage,
        author_name: authorName,
        author_student_id: user.studentId, // Keep real ID for moderation/ownership
        author_avatar_data: avatarData,
        tags: sanitizedTags,
        status: 'open',
        views: 0
    }]);
    
    if (error) {
        console.error("Supabase create question failed. Error object:", error);
        throw error;
    }
};

export const deleteQuestion = async (id: number) => {
    await supabase.from('replies').delete().eq('question_id', id);
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) throw error;
};

export const createReply = async (user: User, questionId: number, content: string, image?: string, isAnonymous: boolean = false) => {
    // Mask logic for anonymous replies
    const authorName = isAnonymous ? '匿名同學' : user.name;
    const avatarData = isAnonymous ? {
        color: 'bg-gray-500',
        image: null,
        frame: null,
        nameColor: null
    } : {
        color: user.avatarColor,
        image: user.avatarImage,
        frame: user.avatarFrame,
        nameColor: user.nameColor
    };

    const { error } = await supabase.from('replies').insert([{
        question_id: questionId,
        content,
        image,
        author_name: authorName,
        author_student_id: user.studentId,
        author_avatar_data: avatarData
    }]);

    if (error) {
        console.error("Reply creation failed:", error);
        throw error;
    }

    // --- Auto Notification Logic ---
    try {
        // 1. Get Question Author
        const { data: qData } = await supabase
            .from('questions')
            .select('author_student_id, title')
            .eq('id', questionId)
            .single();
        
        // Don't notify if replying to self or if target ID is missing (anonymous legacy)
        if (qData && qData.author_student_id && qData.author_student_id !== user.studentId) {
            const replierName = isAnonymous ? '有人' : user.name;
            // 2. Create Notification
            await createNotification(
                qData.author_student_id,
                'reply',
                '您的問題有新回覆',
                `${replierName} 回覆了您的問題：${qData.title.substring(0, 15)}...`,
                questionId.toString()
            );
        }
    } catch (notifError) {
        console.error("Notification creation failed (non-critical)", notifError);
        // Do not throw, allow the reply to succeed even if notif fails
    }
};

export const deleteReply = async (id: number) => {
    const { error } = await supabase.from('replies').delete().eq('id', id);
    if (error) throw error;
};

export const markBestAnswer = async (questionId: number, replyId: number) => {
    const { error: rError } = await supabase
        .from('replies')
        .update({ is_best_answer: true })
        .eq('id', replyId);
    if (rError) throw rError;

    const { error: qError } = await supabase
        .from('questions')
        .update({ status: 'solved' })
        .eq('id', questionId);
    if (qError) throw qError;
};

// --- Resources ---

export const fetchResources = async (): Promise<Resource[]> => {
    const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        images: r.images || [],
        tags: r.tags || [],
        author: r.author_name,
        date: new Date(r.created_at).toLocaleDateString(),
        likes: r.likes || 0,
        likedBy: r.liked_by || [],
        authorAvatarColor: r.author_avatar_data?.color || 'bg-gray-400',
        authorAvatarImage: r.author_avatar_data?.image,
        authorAvatarFrame: r.author_avatar_data?.frame,
        authorNameColor: r.author_avatar_data?.nameColor,
    }));
};

export const createResource = async (user: User, title: string, description: string, tags: string[], images: string[]) => {
    const avatarData = {
        color: user.avatarColor,
        image: user.avatarImage,
        frame: user.avatarFrame,
        nameColor: user.nameColor
    };

    const { error } = await supabase.from('resources').insert([{
        title,
        description,
        images,
        tags,
        author_name: user.name,
        author_student_id: user.studentId,
        author_avatar_data: avatarData,
        likes: 0,
        liked_by: []
    }]);

    if (error) throw error;
};

export const deleteResource = async (id: number) => {
    const { error } = await supabase.from('resources').delete().eq('id', id);
    if (error) throw error;
};

export const updateResourceLikes = async (id: number, likes: number, likedBy: string[]) => {
    const { error } = await supabase
        .from('resources')
        .update({ likes, liked_by: likedBy })
        .eq('id', id);
    if (error) console.error("Error updating likes:", error);
};

// --- Exams ---

export const fetchExams = async (): Promise<Exam[]> => {
    const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('date', { ascending: true });

    if (error) throw error;
    
    return data.map((e: any) => ({
        id: e.id,
        subject: e.subject,
        title: e.title,
        date: e.date,
        time: e.time,
        author: e.author_name
    }));
};

export const createExam = async (user: User, subject: string, title: string, date: string, time: string) => {
    const { error } = await supabase.from('exams').insert([{
        subject, title, date, time, author_name: user.name
    }]);
    if (error) throw error;
};

export const deleteExam = async (id: number) => {
    const { error } = await supabase.from('exams').delete().eq('id', id);
    if (error) throw error;
};

// --- Moderation ---

export const banUser = async (studentId: string) => {
    const { error } = await supabase
        .from('users')
        .update({ is_banned: true })
        .eq('student_id', studentId);
    if (error) throw error;
};

export const unbanUser = async (studentId: string) => {
    const { error } = await supabase
        .from('users')
        .update({ is_banned: false })
        .eq('student_id', studentId);
    if (error) throw error;
};

// --- Class Leaderboard ---

export const fetchClassLeaderboard = async (): Promise<LeaderboardEntry[] & { blackMarketCoins?: number }> => {
    const { data, error } = await supabase
        .from('users')
        .select('name, student_id, points, lifetime_points, black_market_coins, avatar_color, avatar_image, avatar_frame, consecutive_check_in_days, last_check_in_date')
        .eq('is_banned', false)
        .limit(1000);

    if (error) {
        console.error("Error fetching leaderboard:", error);
        return [];
    }

    const uniqueMap = new Map();
    data.forEach((u: any) => {
        if (!uniqueMap.has(u.student_id)) {
            uniqueMap.set(u.student_id, u);
        }
    });

    const uniqueData = Array.from(uniqueMap.values());

    // UPDATED SORTING: Sort by 'points' (Current Wealth) instead of 'lifetime_points'
    uniqueData.sort((a: any, b: any) => {
        return b.points - a.points;
    });

    return uniqueData.map((u: any, index: number) => ({
        rank: index + 1,
        name: u.name,
        studentId: u.student_id,
        points: u.points, // Display Current Points on Leaderboard
        blackMarketCoins: u.black_market_coins || 0, 
        level: calculateLevel(u.lifetime_points ?? u.points), // Level still based on XP
        avatarColor: u.avatar_color || 'bg-gray-400',
        avatarImage: u.avatar_image,
        avatarFrame: u.avatar_frame,
        checkInStreak: u.consecutive_check_in_days || 0,
        lastCheckInDate: u.last_check_in_date
    }));
};

// --- Black Market Transfer ---
export const transferBlackCoins = async (senderId: string, receiverId: string, amount: number) => {
    // Attempt to call RPC first
    try {
        const { error } = await supabase.rpc('transfer_bmc', {
            sender_id: senderId,
            receiver_id: receiverId,
            amount: amount
        });
        if (error) throw error;
        return true;
    } catch (e: any) {
        console.warn("RPC Failed, trying client-side fallback:", e.message);
        
        // Fallback: Client-side update (Not recommended for prod security, but works for prototype if RLS allows)
        if (amount <= 0) throw new Error("Invalid amount");

        // 1. Fetch Sender
        const { data: sender, error: sErr } = await supabase.from('users').select('black_market_coins').eq('student_id', senderId).single();
        if(sErr || !sender) throw new Error("Sender not found");
        if((sender.black_market_coins || 0) < amount) throw new Error("Insufficient funds");

        // 2. Fetch Receiver
        const { data: receiver, error: rErr } = await supabase.from('users').select('black_market_coins').eq('student_id', receiverId).single();
        if(rErr || !receiver) throw new Error("Receiver not found");

        // 3. Perform Updates
        const { error: updErr1 } = await supabase.from('users')
            .update({ black_market_coins: (sender.black_market_coins || 0) - amount })
            .eq('student_id', senderId);
        if(updErr1) throw updErr1;

        const { error: updErr2 } = await supabase.from('users')
            .update({ black_market_coins: (receiver.black_market_coins || 0) + amount })
            .eq('student_id', receiverId);
        if(updErr2) throw updErr2;

        return true;
    }
};

// --- PK Leaderboard (Updated) ---

export const fetchPkLeaderboard = async (mode: 'CLASSIC' | 'OVERLOAD' = 'CLASSIC'): Promise<LeaderboardEntry[]> => {
    const ratingColumn = mode === 'OVERLOAD' ? 'pk_rating_overload' : 'pk_rating';
    
    const { data, error } = await supabase
        .from('users')
        .select(`name, student_id, ${ratingColumn}, avatar_color, avatar_image, avatar_frame`)
        .eq('is_banned', false)
        .order(ratingColumn, { ascending: false })
        .limit(50);

    if (error) {
        console.error("Error fetching PK leaderboard:", error);
        return [];
    }

    return data.map((u: any, index: number) => ({
        rank: index + 1,
        name: u.name,
        studentId: u.student_id,
        points: u[ratingColumn] || 0, 
        level: 0, 
        avatarColor: u.avatar_color || 'bg-gray-400',
        avatarImage: u.avatar_image,
        avatarFrame: u.avatar_frame,
    }));
};

// --- Game System (Updated for Multiple Games) ---

export const submitGameScore = async (user: User, score: number, gameId: string = 'word_challenge') => {
    const avatarData = {
        color: user.avatarColor,
        frame: user.avatarFrame,
        gameId: gameId // Ensure gameId is saved in JSONB metadata
    };

    const { error } = await supabase.from('game_scores').insert([{
        student_id: user.studentId,
        name: user.name,
        score: score,
        avatar_data: avatarData
    }]);

    if (error) {
        console.error("Score submit failed", error);
        throw error;
    }
};

export const fetchGameLeaderboard = async (gameId: string = 'word_challenge'): Promise<GameLeaderboardEntry[]> => {
    const now = new Date();
    const day = now.getDay(); 
    const diff = now.getDate() - (day === 0 ? 6 : day - 1);
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    // Fetch all scores for the week
    const { data, error } = await supabase
        .from('game_scores')
        .select('*')
        .gte('created_at', startOfWeek.toISOString()) 
        .order('score', { ascending: false });

    if (error) {
        console.error("Error fetching game leaderboard:", error);
        return [];
    }

    // Filter by gameId in memory (since we store it in JSONB avatar_data)
    // Default to 'word_challenge' if gameId is missing in data (backward compatibility)
    const validData = data.filter((row: any) => {
        const rowGameId = row.avatar_data?.gameId || 'word_challenge';
        return rowGameId === gameId;
    });

    const uniqueEntries: Record<string, any> = {};
    const studentIds = new Set<string>();
    
    validData.forEach((entry: any) => {
        if (!uniqueEntries[entry.student_id] || entry.score > uniqueEntries[entry.student_id].score) {
            uniqueEntries[entry.student_id] = entry;
            studentIds.add(entry.student_id);
        }
    });

    const sortedEntries = Object.values(uniqueEntries).sort((a: any, b: any) => b.score - a.score).slice(0, 10);
    
    if (sortedEntries.length > 0) {
        // Fetch up-to-date avatar info
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('student_id, avatar_color, avatar_image, avatar_frame')
            .in('student_id', Array.from(studentIds));
            
        if (!userError && userData) {
            sortedEntries.forEach((entry: any) => {
                const userProfile = userData.find((u: any) => u.student_id === entry.student_id);
                if (userProfile) {
                    // Update visual data but keep the score/gameId context
                    entry.avatar_data = {
                        ...entry.avatar_data,
                        color: userProfile.avatar_color,
                        image: userProfile.avatar_image,
                        frame: userProfile.avatar_frame
                    };
                }
            });
        }
    }

    return sortedEntries.map((entry: any, index: number) => ({
        rank: index + 1,
        name: entry.name,
        score: entry.score,
        avatarColor: entry.avatar_data?.color || 'bg-gray-400',
        avatarFrame: entry.avatar_data?.frame
    }));
};

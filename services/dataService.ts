
import { supabase } from './supabaseClient';
import { Question, Resource, Exam, User, GameLeaderboardEntry, LeaderboardEntry } from '../types';
import { calculateLevel } from './levelService';
import { createNotification } from './notificationService';

// --- Questions (Optimized Pagination) ---

export const fetchQuestions = async (page: number = 0, pageSize: number = 10): Promise<Question[]> => {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    // Optimized: Exclude 'image' (base64) from list view
    const { data, error } = await supabase
        .from('questions')
        .select(`
            id, title, content, author_name, author_student_id, created_at, tags, status, views, author_avatar_data,
            replies:replies(count)
        `)
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Supabase fetch questions failed:', error);
        throw error;
    }

    return data.map((q: any) => ({
        id: q.id,
        title: q.title,
        content: q.content, 
        image: null, 
        author: q.author_name,
        date: new Date(q.created_at).toLocaleDateString(),
        tags: q.tags || [],
        status: q.status,
        replyCount: q.replies ? q.replies[0].count : 0,
        views: q.views,
        authorAvatarColor: q.author_avatar_data?.color || 'bg-gray-400',
        authorAvatarImage: q.author_avatar_data?.image,
        authorAvatarFrame: q.author_avatar_data?.frame,
        authorNameColor: q.author_avatar_data?.nameColor,
        isAnonymous: q.author_name === '匿名同學', 
        replies: [] 
    }));
};

export const fetchQuestionDetail = async (id: number): Promise<Question | null> => {
    const { data, error } = await supabase
        .from('questions')
        .select(`*, replies (*)`)
        .eq('id', id)
        .single();

    if (error) return null;

    // Increment View Count (Fire and forget)
    supabase.rpc('increment_view_count', { row_id: id }).then();

    return {
        id: data.id,
        title: data.title,
        content: data.content,
        image: data.image,
        author: data.author_name,
        date: new Date(data.created_at).toLocaleDateString(),
        tags: data.tags || [],
        status: data.status,
        replyCount: data.replies ? data.replies.length : 0,
        views: data.views + 1,
        authorAvatarColor: data.author_avatar_data?.color || 'bg-gray-400',
        authorAvatarImage: data.author_avatar_data?.image,
        authorAvatarFrame: data.author_avatar_data?.frame,
        authorNameColor: data.author_avatar_data?.nameColor,
        isAnonymous: data.author_name === '匿名同學', 
        replies: (data.replies || []).map((r: any) => ({
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
            isAnonymous: r.author_name === '匿名同學'
        })).sort((a: any, b: any) => {
            if (a.isBestAnswer) return -1;
            if (b.isBestAnswer) return 1;
            return 0;
        })
    };
};

export const createQuestion = async (user: User, title: string, content: string, tags: string[], image?: string, isAnonymous: boolean = false) => {
    const avatarData = {
        color: isAnonymous ? 'bg-gray-500' : user.avatarColor,
        image: isAnonymous ? null : user.avatarImage,
        frame: isAnonymous ? null : user.avatarFrame,
        nameColor: isAnonymous ? null : user.nameColor
    };

    const { error } = await supabase
        .from('questions')
        .insert([{
            title, content, tags, image,
            author_name: isAnonymous ? '匿名同學' : user.name,
            author_student_id: user.studentId,
            author_avatar_data: avatarData,
            status: 'open',
            views: 0
        }]);
    if (error) throw error;
};

export const deleteQuestion = async (id: number) => {
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) throw error;
};

// --- Replies ---

export const createReply = async (user: User, questionId: number, content: string, image?: string, isAnonymous: boolean = false) => {
    const avatarData = {
        color: isAnonymous ? 'bg-gray-500' : user.avatarColor,
        image: isAnonymous ? null : user.avatarImage,
        frame: isAnonymous ? null : user.avatarFrame,
        nameColor: isAnonymous ? null : user.nameColor
    };

    const { error } = await supabase
        .from('replies')
        .insert([{
            question_id: questionId,
            content, image,
            author_name: isAnonymous ? '匿名同學' : user.name,
            author_student_id: user.studentId,
            author_avatar_data: avatarData,
            is_best_answer: false
        }]);
    
    if (error) throw error;

    // Notification Logic
    // 1. Get Question Author
    const { data: q } = await supabase.from('questions').select('author_student_id, title').eq('id', questionId).single();
    if (q && q.author_student_id !== user.studentId) {
        createNotification(q.author_student_id, 'reply', '新的回答', `${isAnonymous ? '有人' : user.name} 回答了你的問題：${q.title}`, questionId.toString());
    }
};

export const deleteReply = async (id: number) => {
    const { error } = await supabase.from('replies').delete().eq('id', id);
    if (error) throw error;
};

export const markBestAnswer = async (questionId: number, replyId: number) => {
    // 1. Mark question as solved
    await supabase.from('questions').update({ status: 'solved' }).eq('id', questionId);
    // 2. Mark reply
    await supabase.from('replies').update({ is_best_answer: true }).eq('id', replyId);
    
    // 3. Reward logic (Optional: Add points to solver)
    const { data: reply } = await supabase.from('replies').select('author_student_id').eq('id', replyId).single();
    if (reply) {
        // RPC call to add points safely would be better, but simplified here:
        // We assume admin/system logic handles rewards elsewhere or via notification
        createNotification(reply.author_student_id, 'system', '最佳解答', `你的回答被選為最佳解答！獲得 30 PT`);
    }
};

// --- Resources ---

export const fetchResources = async (): Promise<Resource[]> => {
    const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) return [];

    return data.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        tags: r.tags || [],
        images: r.images || [],
        author: r.author_name,
        authorAvatarColor: r.author_avatar_data?.color || 'bg-gray-400',
        authorAvatarImage: r.author_avatar_data?.image,
        authorAvatarFrame: r.author_avatar_data?.frame,
        authorNameColor: r.author_avatar_data?.nameColor,
        date: new Date(r.created_at).toLocaleDateString(),
        likes: r.likes || 0,
        likedBy: r.liked_by || []
    }));
};

export const createResource = async (user: User, title: string, description: string, tags: string[], images: string[]) => {
    const avatarData = {
        color: user.avatarColor,
        image: user.avatarImage,
        frame: user.avatarFrame,
        nameColor: user.nameColor
    };

    const { error } = await supabase
        .from('resources')
        .insert([{
            title, description, tags, images,
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
    await supabase
        .from('resources')
        .update({ likes, liked_by: likedBy })
        .eq('id', id);
};

// --- Exams ---

export const fetchExams = async (): Promise<Exam[]> => {
    const { data, error } = await supabase
        .from('exams')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0]) // Only future/today exams
        .order('date', { ascending: true });

    if (error) return [];

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
    const { error } = await supabase
        .from('exams')
        .insert([{
            subject, title, date, time,
            author_name: user.name,
            author_student_id: user.studentId
        }]);
    if (error) throw error;
};

export const deleteExam = async (id: number) => {
    const { error } = await supabase.from('exams').delete().eq('id', id);
    if (error) throw error;
};

// --- Users / Moderation ---

export const banUser = async (studentId: string) => {
    await supabase.from('users').update({ is_banned: true }).eq('student_id', studentId);
};

export const unbanUser = async (studentId: string) => {
    await supabase.from('users').update({ is_banned: false }).eq('student_id', studentId);
};

// --- Leaderboard ---

export const fetchClassLeaderboard = async (): Promise<LeaderboardEntry[]> => {
    // Limit to top 50 to improve performance
    const { data, error } = await supabase
        .from('users')
        .select('name, student_id, points, avatar_color, avatar_image, avatar_frame, last_check_in_date, consecutive_check_in_days, black_market_coins, is_stealth')
        .eq('is_banned', false)
        .order('points', { ascending: false })
        .limit(50);

    if (error) return [];

    // Filter stealth users
    const filtered = data.filter((u: any) => !u.is_stealth);

    return filtered.map((u: any, index: number) => ({
        rank: index + 1,
        name: u.name,
        studentId: u.student_id,
        points: u.points,
        level: calculateLevel(u.points),
        avatarColor: u.avatar_color,
        avatarImage: u.avatar_image,
        avatarFrame: u.avatar_frame,
        checkInStreak: u.consecutive_check_in_days,
        lastCheckInDate: u.last_check_in_date,
        blackMarketCoins: u.black_market_coins
    }));
};

// --- Game Leaderboards ---

export const fetchGameLeaderboard = async (gameId: string): Promise<GameLeaderboardEntry[]> => {
    const { data, error } = await supabase
        .from('game_scores')
        .select('score, user:users(name, avatar_color, avatar_frame)')
        .eq('game_id', gameId)
        .order('score', { ascending: false })
        .limit(10);

    if (error) return [];

    return data.map((entry: any, index: number) => ({
        rank: index + 1,
        name: entry.user?.name || 'Unknown',
        score: entry.score,
        avatarColor: entry.user?.avatar_color || 'bg-gray-500',
        avatarFrame: entry.user?.avatar_frame
    }));
};

export const submitGameScore = async (user: User, score: number, gameId: string) => {
    // Check if better score exists
    const { data: existing } = await supabase
        .from('game_scores')
        .select('score')
        .eq('user_id', user.studentId)
        .eq('game_id', gameId)
        .single();

    if (existing) {
        if (score > existing.score) {
            await supabase
                .from('game_scores')
                .update({ score, updated_at: new Date() })
                .eq('user_id', user.studentId)
                .eq('game_id', gameId);
        }
    } else {
        await supabase
            .from('game_scores')
            .insert([{
                user_id: user.studentId,
                game_id: gameId,
                score
            }]);
    }
};

export const fetchPkLeaderboard = async (mode: 'CLASSIC' | 'OVERLOAD'): Promise<LeaderboardEntry[]> => {
    const sortField = mode === 'OVERLOAD' ? 'pk_rating_overload' : 'pk_rating';
    
    const { data, error } = await supabase
        .from('users')
        .select(`name, student_id, ${sortField}, avatar_color, avatar_image, avatar_frame, points`)
        .eq('is_banned', false)
        .order(sortField, { ascending: false })
        .limit(20);

    if (error) return [];

    return data.map((u: any, index: number) => ({
        rank: index + 1,
        name: u.name,
        studentId: u.student_id,
        // Map rating to 'points' for generic leaderboard component compatibility
        points: u[sortField] || 0, 
        level: calculateLevel(u.points), // True level based on total PT
        avatarColor: u.avatar_color,
        avatarImage: u.avatar_image,
        avatarFrame: u.avatar_frame
    }));
};

// --- Black Market Optimized Functions ---

export const fetchBlackMarketStats = async () => {
    // 1. Try RPC (Server-side calculation) - Fastest
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_black_market_stats');
    if (!rpcError && rpcData) {
        return rpcData;
    }

    // 2. Fallback: Optimized Client-side Fetch
    // Fetch only coins column for sum
    const { data: allCoins } = await supabase.from('users').select('black_market_coins');
    const total = allCoins?.reduce((sum, u) => sum + (u.black_market_coins || 0), 0) || 0;

    // Fetch top 3 with minimal fields
    const { data: top } = await supabase
        .from('users')
        .select('name, student_id, black_market_coins, avatar_color, avatar_image, avatar_frame')
        .eq('is_banned', false)
        .gt('black_market_coins', 0)
        .order('black_market_coins', { ascending: false })
        .limit(3);

    return {
        totalSupply: total,
        topHolders: top || []
    };
};

export const fetchUserListLite = async () => {
    // FIX: Must include 'inventory' for firewall check logic in the UI
    // Excluding avatar_image to reduce size, but we need other props
    const { data, error } = await supabase
        .from('users')
        .select('name, student_id, black_market_coins, avatar_color, avatar_frame, level, is_stealth, inventory, points')
        .eq('is_banned', false)
        .order('black_market_coins', { ascending: false })
        .limit(100); 
    
    if (error) throw error;
    
    return data.map((u: any) => ({
        ...u,
        studentId: u.student_id,
        avatarColor: u.avatar_color,
        blackMarketCoins: u.black_market_coins,
        avatarFrame: u.avatar_frame,
        isStealth: u.is_stealth,
        inventory: typeof u.inventory === 'string' ? JSON.parse(u.inventory) : (u.inventory || [])
    }));
};

export const transferBlackCoins = async (fromId: string, toId: string, amount: number) => {
    if (amount <= 0) throw new Error("Invalid amount");

    // This ideally should be a DB Transaction (RPC)
    
    // 1. Deduct from Sender
    const { data: sender, error: fetchErr } = await supabase.from('users').select('black_market_coins').eq('student_id', fromId).single();
    if(fetchErr || !sender || (sender.black_market_coins < amount)) throw new Error("Insufficient funds");

    const { error: subErr } = await supabase.rpc('decrement_bmc', { row_id: fromId, amount });
    if(subErr) {
        // Fallback if RPC missing
        await supabase.from('users').update({ black_market_coins: sender.black_market_coins - amount }).eq('student_id', fromId);
    }

    // 2. Add to Receiver (Taxed)
    const tax = Math.ceil(amount * 0.1);
    const receive = amount - tax;
    
    const { error: addErr } = await supabase.rpc('increment_bmc', { row_id: toId, amount: receive });
    if(addErr) {
        const { data: receiver } = await supabase.from('users').select('black_market_coins').eq('student_id', toId).single();
        if(receiver) {
             await supabase.from('users').update({ black_market_coins: receiver.black_market_coins + receive }).eq('student_id', toId);
        }
    }
};

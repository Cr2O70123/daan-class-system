
import { supabase } from './supabaseClient';
import { Question, Resource, Exam, User, GameLeaderboardEntry, LeaderboardEntry } from '../types';
import { calculateLevel } from './levelService';

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
        }))
    }));
};

export const createQuestion = async (user: User, title: string, content: string, tags: string[], image?: string) => {
    // Data Sanitization
    const sanitizedImage = image || null; // Convert undefined to null for SQL
    const sanitizedTags = Array.isArray(tags) ? tags : []; // Ensure tags is array
    
    const avatarData = {
        color: user.avatarColor || 'bg-gray-400',
        image: user.avatarImage || null,
        frame: user.avatarFrame || null,
        nameColor: user.nameColor || null
    };

    const { error } = await supabase.from('questions').insert([{
        title,
        content,
        image: sanitizedImage,
        author_name: user.name,
        author_student_id: user.studentId,
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

export const createReply = async (user: User, questionId: number, content: string, image?: string) => {
    const avatarData = {
        color: user.avatarColor,
        image: user.avatarImage,
        frame: user.avatarFrame,
        nameColor: user.nameColor
    };

    const { error } = await supabase.from('replies').insert([{
        question_id: questionId,
        content,
        image,
        author_name: user.name,
        author_student_id: user.studentId,
        author_avatar_data: avatarData
    }]);

    if (error) throw error;
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

// --- Class Leaderboard (Real Data) ---

export const fetchClassLeaderboard = async (): Promise<LeaderboardEntry[]> => {
    const { data, error } = await supabase
        .from('users')
        .select('name, student_id, points, level, avatar_color, avatar_image, avatar_frame, consecutive_check_in_days, last_check_in_date')
        .eq('is_banned', false)
        .order('points', { ascending: false })
        .limit(100);

    if (error) {
        console.error("Error fetching leaderboard:", error);
        return [];
    }

    return data.map((u: any, index: number) => ({
        rank: index + 1,
        name: u.name,
        studentId: u.student_id,
        points: u.points,
        level: calculateLevel(u.points), // Recalculate just in case
        avatarColor: u.avatar_color || 'bg-gray-400',
        avatarImage: u.avatar_image,
        avatarFrame: u.avatar_frame,
        checkInStreak: u.consecutive_check_in_days || 0,
        lastCheckInDate: u.last_check_in_date
    }));
};

// --- Game System ---

export const submitGameScore = async (user: User, score: number) => {
    const avatarData = {
        color: user.avatarColor,
        frame: user.avatarFrame
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

export const fetchGameLeaderboard = async (): Promise<GameLeaderboardEntry[]> => {
    // Calculate start of the current week (Monday)
    const now = new Date();
    const day = now.getDay(); // 0 (Sun) to 6 (Sat)
    // If Sunday (0), subtract 6 days to get previous Monday. 
    // If Monday (1) to Saturday (6), subtract (day - 1).
    const diff = now.getDate() - (day === 0 ? 6 : day - 1);
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
        .from('game_scores')
        .select('*')
        .gte('created_at', startOfWeek.toISOString()) // Re-enabled weekly filter
        .order('score', { ascending: false })
        .limit(100);

    if (error) {
        console.error("Error fetching game leaderboard:", error);
        return [];
    }

    // Deduplication: Keep only highest score per student
    const uniqueEntries: Record<string, GameLeaderboardEntry> = {};
    
    data.forEach((entry: any) => {
        if (!uniqueEntries[entry.student_id] || entry.score > uniqueEntries[entry.student_id].score) {
            uniqueEntries[entry.student_id] = {
                rank: 0,
                name: entry.name,
                score: entry.score,
                avatarColor: entry.avatar_data?.color || 'bg-gray-400',
                avatarFrame: entry.avatar_data?.frame
            };
        }
    });

    // Sort and take top 10
    const sorted = Object.values(uniqueEntries).sort((a, b) => b.score - a.score).slice(0, 10);
    
    return sorted.map((entry, index) => ({
        ...entry,
        rank: index + 1
    }));
};

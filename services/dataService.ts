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
        // DETAILED LOGGING for debugging
        console.error("Supabase create question failed. Error object:", error);
        console.error("Payload was:", {
            title, content, image: sanitizedImage ? 'BASE64_IMAGE_PRESENT' : 'NULL', tags: sanitizedTags, user: user.name
        });
        throw error;
    }
};

export const deleteQuestion = async (id: number) => {
    // Delete replies associated first (if cascade not set in DB)
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

// --- Class Leaderboard (Real Data - Real-time from Users table) ---

export const fetchClassLeaderboard = async (): Promise<LeaderboardEntry[]> => {
    const { data, error } = await supabase
        .from('users')
        .select('name, student_id, points, avatar_color, avatar_image, avatar_frame, consecutive_check_in_days, last_check_in_date')
        .eq('is_banned', false) // Exclude banned users
        .order('points', { ascending: false })
        .limit(100); // Top 100 students

    if (error) {
        console.error("Error fetching leaderboard:", error);
        return [];
    }

    return data.map((u: any, index: number) => ({
        rank: index + 1,
        name: u.name,
        studentId: u.student_id,
        points: u.points,
        level: calculateLevel(u.points),
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
    // 1. Calculate Start of Week (Monday 00:00:00)
    const now = new Date();
    const day = now.getDay();
    // JavaScript getDay(): Sunday=0, Monday=1...
    // We want Monday to be the start. 
    // If today is Sunday (0), we go back 6 days. If Monday (1), go back 0 days.
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    // 2. Fetch scores created AFTER the start of the week
    const { data, error } = await supabase
        .from('game_scores')
        .select('*')
        .gte('created_at', startOfWeek.toISOString()) // Weekly Filter
        .order('score', { ascending: false });

    if (error) {
        console.error("Error fetching game leaderboard:", error);
        return [];
    }

    // 3. Deduplication: Keep only highest score per student for this week
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

    // 4. Sort and take top 10
    const sorted = Object.values(uniqueEntries).sort((a, b) => b.score - a.score).slice(0, 10);
    
    return sorted.map((entry, index) => ({
        ...entry,
        rank: index + 1
    }));
};
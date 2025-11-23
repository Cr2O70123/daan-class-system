import { supabase } from './supabaseClient';
import { Question, Resource, Exam, Reply, User } from '../types';
import { INITIAL_QUESTIONS, INITIAL_RESOURCES, INITIAL_EXAMS } from './mockData';

// --- Questions ---

export const fetchQuestions = async (): Promise<Question[]> => {
    try {
        const { data, error } = await supabase
            .from('questions')
            .select(`
                *,
                replies (*)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('Supabase fetch questions failed, using mock data:', error);
            return INITIAL_QUESTIONS;
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
            // Map Avatar Data
            authorAvatarColor: q.author_avatar_data?.color || 'bg-gray-400',
            authorAvatarImage: q.author_avatar_data?.image,
            authorAvatarFrame: q.author_avatar_data?.frame,
            authorNameColor: q.author_avatar_data?.nameColor,
            // Map Replies
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
    } catch (e) {
        console.warn('Exception fetching questions, using mock data', e);
        return INITIAL_QUESTIONS;
    }
};

export const createQuestion = async (user: User, title: string, content: string, tags: string[], image?: string) => {
    const avatarData = {
        color: user.avatarColor,
        image: user.avatarImage,
        frame: user.avatarFrame,
        nameColor: user.nameColor
    };

    const { error } = await supabase.from('questions').insert([{
        title,
        content,
        image,
        author_name: user.name,
        author_student_id: user.studentId,
        author_avatar_data: avatarData,
        tags: tags,
        status: 'open',
        views: 0
    }]);
    
    if (error) {
        console.error('Error creating question:', error);
        throw error;
    }
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

    if (error) {
        console.error('Error creating reply:', error);
        throw error;
    }
};

export const markBestAnswer = async (questionId: number, replyId: number) => {
    // 1. Mark reply as best
    const { error: rError } = await supabase
        .from('replies')
        .update({ is_best_answer: true })
        .eq('id', replyId);
    
    if (rError) {
        console.error('Error marking best reply:', rError);
        throw rError;
    }

    // 2. Mark question as solved
    const { error: qError } = await supabase
        .from('questions')
        .update({ status: 'solved' })
        .eq('id', questionId);

    if (qError) throw qError;
};

// --- Resources ---

export const fetchResources = async (): Promise<Resource[]> => {
    try {
        const { data, error } = await supabase
            .from('resources')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('Supabase fetch resources failed, using mock data:', error);
            return INITIAL_RESOURCES;
        }

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
            // Avatar Data
            authorAvatarColor: r.author_avatar_data?.color || 'bg-gray-400',
            authorAvatarImage: r.author_avatar_data?.image,
            authorAvatarFrame: r.author_avatar_data?.frame,
            authorNameColor: r.author_avatar_data?.nameColor,
        }));
    } catch (e) {
        console.warn('Exception fetching resources, using mock data', e);
        return INITIAL_RESOURCES;
    }
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

export const updateResourceLikes = async (id: number, likes: number, likedBy: string[]) => {
    const { error } = await supabase
        .from('resources')
        .update({ likes, liked_by: likedBy })
        .eq('id', id);
        
    if (error) console.error("Error updating likes:", error);
};

// --- Exams ---

export const fetchExams = async (): Promise<Exam[]> => {
    try {
        const { data, error } = await supabase
            .from('exams')
            .select('*')
            .order('date', { ascending: true });

        if (error) {
            console.warn('Supabase fetch exams failed, using mock data:', error);
            return INITIAL_EXAMS;
        }
        
        return data.map((e: any) => ({
            id: e.id,
            subject: e.subject,
            title: e.title,
            date: e.date,
            time: e.time,
            author: e.author_name
        }));
    } catch (e) {
        return INITIAL_EXAMS;
    }
};

export const createExam = async (user: User, subject: string, title: string, date: string, time: string) => {
    const { error } = await supabase.from('exams').insert([{
        subject, title, date, time, author_name: user.name
    }]);
    if (error) throw error;
};
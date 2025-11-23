
import { User } from '../types';
import { calculateLevel } from './levelService';
import { supabase } from './supabaseClient';

// Standard Login (Hybrid: Try DB, fallback to Mock)
export const mockLogin = async (name: string, studentId: string): Promise<User> => {
    
    // 1. 嘗試從 Supabase 獲取使用者資料 (如果有建立 Table)
    /*
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('student_id', studentId)
        .single();
    
    if (data) {
        // Return DB user
        return transformDbUserToAppUser(data);
    }
    */

    // 2. 目前階段維持 Mock 邏輯 (但已經引入了 Supabase 客戶端準備對接)
    const savedAvatar = localStorage.getItem(`avatar_${studentId}`);
    const savedHeartsData = localStorage.getItem(`hearts_${studentId}`);
    
    const isAdmin = name.toLowerCase() === 'admin';
    const initialPoints = isAdmin ? 999999 : 100;

    let hearts = 3;
    let lastReset = new Date().toDateString();

    if (savedHeartsData) {
        const parsed = JSON.parse(savedHeartsData);
        if (parsed.lastReset === new Date().toDateString()) {
            hearts = parsed.hearts;
            lastReset = parsed.lastReset;
        }
    }

    return {
        name,
        studentId,
        avatarColor: 'bg-purple-500',
        avatarImage: savedAvatar || undefined,
        points: initialPoints,
        level: calculateLevel(initialPoints),
        isAdmin: isAdmin,
        inventory: [],
        settings: {
            darkMode: false,
            notifications: true,
            fontSize: 'medium'
        },
        hearts,
        lastHeartReset: lastReset
    };
};

export const saveUserHeartState = (user: User) => {
    localStorage.setItem(`hearts_${user.studentId}`, JSON.stringify({
        hearts: user.hearts,
        lastReset: user.lastHeartReset
    }));
    
    // Future: Sync with Supabase
    // supabase.from('users').update({ hearts: user.hearts }).eq('student_id', user.studentId);
};

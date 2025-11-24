import { User } from '../types';
import { calculateLevel } from './levelService';
import { supabase } from './supabaseClient';

export const login = async (name: string, studentId: string): Promise<User> => {
    const isAdmin = name === 'admin1204'; 
    
    // 1. Try to fetch user from Supabase
    let { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('student_id', studentId)
        .single();
    
    // PGRST116 is the error code for "Row not found" (which is expected for new users)
    if (error && error.code !== 'PGRST116') { 
        console.error('Supabase Auth Error:', error);
        throw new Error(`DB_ERROR: ${error.message}`);
    }

    // 2. If user not found, create new one
    if (!user) {
        const initialPoints = isAdmin ? 999999 : 100;
        
        const newUserPayload = {
            student_id: studentId,
            name: name,
            points: initialPoints,
            hearts: 3,
            last_heart_reset: new Date().toDateString(),
            inventory: [],
            avatar_image: null,
            is_banned: false
        };

        const { data: createdUser, error: createError } = await supabase
            .from('users')
            .insert([newUserPayload])
            .select()
            .single();
            
        if (createError) {
            console.error('Error creating user in DB:', createError);
            throw new Error(`CREATE_USER_FAILED: ${createError.message}`);
        }
        user = createdUser;
    }

    // Check Ban Status
    if (user.is_banned) {
        throw new Error("ACCOUNT_BANNED");
    }

    // 3. Transform DB user to App User
    let inventory: string[] = [];
    if (user.inventory) {
        if (typeof user.inventory === 'string') {
            try { inventory = JSON.parse(user.inventory); } catch(e) {}
        } else {
            inventory = user.inventory;
        }
    }

    const appUser: User = {
        name: user.name,
        studentId: user.student_id,
        avatarColor: user.avatar_color || 'bg-purple-500', 
        avatarImage: user.avatar_image || undefined,
        avatarFrame: user.avatar_frame || undefined,
        points: user.points,
        level: calculateLevel(user.points),
        isAdmin: isAdmin, 
        inventory: inventory,
        settings: user.settings || { darkMode: false, notifications: true, fontSize: 'medium' },
        nameColor: user.name_color || undefined,
        hearts: user.hearts ?? 3,
        lastHeartReset: user.last_heart_reset || new Date().toDateString(),
        isBanned: user.is_banned,
        banExpiresAt: user.ban_expires_at
    };

    // Persist session
    localStorage.setItem('student_id', studentId);
    
    return appUser;
};

export const checkSession = async (): Promise<User | null> => {
    const storedId = localStorage.getItem('student_id');
    
    if (!storedId) return null;

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('student_id', storedId)
        .single();

    if (error) {
        // If offline or other error, return null to force re-login or handle gracefully
        console.error("Session check error:", error);
        return null;
    }

    if (!user || user.is_banned) {
        localStorage.removeItem('student_id');
        return null;
    }

    let inventory: string[] = [];
    if (user.inventory) {
        if (typeof user.inventory === 'string') {
            try { inventory = JSON.parse(user.inventory); } catch(e) {}
        } else {
            inventory = user.inventory;
        }
    }
    
    const isAdmin = user.name === 'admin1204';

    return {
        name: user.name,
        studentId: user.student_id,
        avatarColor: user.avatar_color || 'bg-purple-500',
        avatarImage: user.avatar_image || undefined,
        avatarFrame: user.avatar_frame || undefined,
        points: user.points,
        level: calculateLevel(user.points),
        isAdmin: isAdmin,
        inventory: inventory,
        settings: user.settings || { darkMode: false, notifications: true, fontSize: 'medium' },
        nameColor: user.name_color || undefined,
        hearts: user.hearts ?? 3,
        lastHeartReset: user.last_heart_reset || new Date().toDateString(),
        isBanned: user.is_banned,
        banExpiresAt: user.ban_expires_at
    };
};

export const logout = () => {
    localStorage.removeItem('student_id');
};

export const updateUserInDb = async (user: User) => {
    const updatePayload = {
        points: user.points,
        hearts: user.hearts,
        last_heart_reset: user.lastHeartReset,
        avatar_image: user.avatarImage,
        avatar_frame: user.avatarFrame, 
        name_color: user.nameColor,     
        inventory: user.inventory,
        avatar_color: user.avatarColor,
        settings: user.settings
    };

    const { error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('student_id', user.studentId);
        
    if (error) {
        console.error('Error updating user:', error);
        throw new Error(error.message || "Unknown DB Error");
    }
    // Return true to indicate success for await calls
    return true;
};
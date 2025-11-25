
import { User } from '../types';
import { calculateLevel } from './levelService';
import { supabase } from './supabaseClient';

// Generate Daily Passcode: DAAN-XXXX (Random 4 digits seeded by date)
export const getDailyPasscode = () => {
    const today = new Date().toDateString(); // e.g., "Mon Nov 06 2023"
    
    // Simple hash function to generate a seed from the date string
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
        const char = today.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    // Map hash to a 4-digit number (1000 - 9999)
    const randomCode = (Math.abs(hash) % 9000) + 1000;
    
    return `DAAN-${randomCode}`;
};

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
            lifetime_points: initialPoints, // Initialize XP same as starting points
            hearts: 3,
            last_heart_reset: new Date().toDateString(),
            inventory: [],
            avatar_image: null,
            is_banned: false,
            consecutive_check_in_days: 0,
            last_check_in_date: null
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

    // Use lifetime_points for level calculation if available, otherwise fallback to points
    const xp = user.lifetime_points ?? user.points;

    const appUser: User = {
        name: user.name,
        studentId: user.student_id,
        avatarColor: user.avatar_color || 'bg-purple-500', 
        avatarImage: user.avatar_image || undefined,
        avatarFrame: user.avatar_frame || undefined,
        points: user.points,
        lifetimePoints: xp, // Store XP
        level: calculateLevel(xp), // Calculate level based on XP
        isAdmin: isAdmin, 
        inventory: inventory,
        settings: user.settings || { darkMode: false, notifications: true, fontSize: 'medium' },
        nameColor: user.name_color || undefined,
        hearts: user.hearts ?? 3, // Default to 3 if null
        lastHeartReset: user.last_heart_reset || new Date().toDateString(),
        
        // Check-in
        lastCheckInDate: user.last_check_in_date,
        checkInStreak: user.consecutive_check_in_days || 0,

        isBanned: user.is_banned,
        banExpiresAt: user.ban_expires_at,

        // Push
        pushClientId: user.push_client_id
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
    
    // Use lifetime_points for level calculation if available, otherwise fallback to points
    const xp = user.lifetime_points ?? user.points;

    return {
        name: user.name,
        studentId: user.student_id,
        avatarColor: user.avatar_color || 'bg-purple-500',
        avatarImage: user.avatar_image || undefined,
        avatarFrame: user.avatar_frame || undefined,
        points: user.points,
        lifetimePoints: xp,
        level: calculateLevel(xp),
        isAdmin: isAdmin,
        inventory: inventory,
        settings: user.settings || { darkMode: false, notifications: true, fontSize: 'medium' },
        nameColor: user.name_color || undefined,
        hearts: user.hearts ?? 3,
        lastHeartReset: user.last_heart_reset || new Date().toDateString(),
        
        // Check-in
        lastCheckInDate: user.last_check_in_date,
        checkInStreak: user.consecutive_check_in_days || 0,

        isBanned: user.is_banned,
        banExpiresAt: user.ban_expires_at,

        pushClientId: user.push_client_id
    };
};

export const logout = () => {
    localStorage.removeItem('student_id');
};

export const updateUserInDb = async (user: User) => {
    if (!user.studentId) {
        throw new Error("Missing student ID");
    }

    const updatePayload = {
        points: user.points,
        lifetime_points: user.lifetimePoints, // Ensure XP is saved
        hearts: user.hearts,
        last_heart_reset: user.lastHeartReset,
        avatar_image: user.avatarImage,
        avatar_frame: user.avatarFrame, 
        name_color: user.nameColor,     
        inventory: user.inventory,
        avatar_color: user.avatarColor,
        settings: user.settings,
        
        // Check-in
        last_check_in_date: user.lastCheckInDate,
        consecutive_check_in_days: user.checkInStreak,

        // Push
        push_client_id: user.pushClientId
    };

    const { error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('student_id', user.studentId);
        
    if (error) {
        console.error('Error updating user:', error);
        // Specifically check for column errors
        if (error.message.includes('column') && error.message.includes('hearts')) {
             throw new Error("資料庫缺少 hearts 欄位，請執行 SQL 更新");
        }
        throw new Error(error.message);
    }
    return true;
};

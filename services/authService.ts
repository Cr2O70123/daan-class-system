
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
    // 0. Emergency Ban List Removed

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
            black_market_coins: 0, // Initial BMC
            // Removed lifetime_points
            hearts: 0, // Legacy field, might be unused now but kept for DB schema
            daily_plays: 0, // New field
            last_heart_reset: new Date().toDateString(), // Using this for daily reset
            inventory: [],
            avatar_image: null,
            profile_background_image: null,
            is_banned: false,
            consecutive_check_in_days: 0,
            last_check_in_date: null,
            pk_rating: 0, // Default PK Rating
            pk_rating_overload: 0 // Default Overload PK Rating
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

    // Ban Check Removed - Allowing login even if flagged in DB

    // 3. Transform DB user to App User
    let inventory: string[] = [];
    if (user.inventory) {
        if (typeof user.inventory === 'string') {
            try { inventory = JSON.parse(user.inventory); } catch(e) {}
        } else {
            inventory = user.inventory;
        }
    }

    // Level calculation now strictly based on current points
    const xp = user.points;

    const appUser: User = {
        name: user.name,
        studentId: user.student_id,
        avatarColor: user.avatar_color || 'bg-purple-500', 
        avatarImage: user.avatar_image || undefined,
        avatarFrame: user.avatar_frame || undefined,
        profileBackgroundImage: user.profile_background_image || undefined,
        points: user.points,
        blackMarketCoins: user.black_market_coins || 0, // Load BMC
        level: calculateLevel(xp), // Calculate level based on current points
        isAdmin: isAdmin, 
        inventory: inventory,
        settings: user.settings || { darkMode: false, notifications: true, fontSize: 'medium' },
        nameColor: user.name_color || undefined,
        
        // Game System
        dailyPlays: user.daily_plays || 0,
        lastDailyReset: user.last_heart_reset || new Date().toDateString(), // Mapping DB column
        
        // Check-in
        lastCheckInDate: user.last_check_in_date,
        checkInStreak: user.consecutive_check_in_days || 0,

        // Personalization
        lastNicknameChange: user.last_nickname_change,

        isBanned: false, // Force unbanned state in app
        banExpiresAt: user.ban_expires_at,

        // Push
        pushClientId: user.push_client_id,
        
        // PK Rating
        pkRating: user.pkRating || user.pk_rating || 0,
        pkRatingOverload: user.pkRatingOverload || user.pk_rating_overload || 0
    };

    // Persist session
    localStorage.setItem('student_id', studentId);
    
    return appUser;
};

export const checkSession = async (): Promise<User | null> => {
    const storedId = localStorage.getItem('student_id');
    
    if (!storedId) return null;

    // Emergency Ban List Check Removed

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('student_id', storedId)
        .single();

    if (error) {
        console.error("Session check error:", error);
        return null;
    }

    // Removed user.is_banned check to allow banned users back in
    if (!user) {
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
    
    // Level calculation now strictly based on current points
    const xp = user.points;

    return {
        name: user.name,
        studentId: user.student_id,
        avatarColor: user.avatar_color || 'bg-purple-500',
        avatarImage: user.avatar_image || undefined,
        avatarFrame: user.avatar_frame || undefined,
        profileBackgroundImage: user.profile_background_image || undefined,
        points: user.points,
        blackMarketCoins: user.black_market_coins || 0, // Load BMC
        level: calculateLevel(xp),
        isAdmin: isAdmin,
        inventory: inventory,
        settings: user.settings || { darkMode: false, notifications: true, fontSize: 'medium' },
        nameColor: user.name_color || undefined,
        
        dailyPlays: user.daily_plays || 0,
        lastDailyReset: user.last_heart_reset || new Date().toDateString(),
        
        lastCheckInDate: user.last_check_in_date,
        checkInStreak: user.consecutive_check_in_days || 0,

        lastNicknameChange: user.last_nickname_change,

        isBanned: false, // Force unbanned
        banExpiresAt: user.ban_expires_at,

        pushClientId: user.push_client_id,
        
        pkRating: user.pk_rating || 0,
        pkRatingOverload: user.pk_rating_overload || 0
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
        name: user.name,
        points: user.points,
        black_market_coins: user.blackMarketCoins, // Save BMC
        // Removed lifetime_points
        
        // Game Limits (Mapped to DB columns)
        daily_plays: user.dailyPlays,
        last_heart_reset: user.lastDailyReset,
        
        avatar_image: user.avatarImage,
        avatar_frame: user.avatarFrame, 
        name_color: user.nameColor, 
        profile_background_image: user.profileBackgroundImage, 
        inventory: user.inventory,
        avatar_color: user.avatarColor,
        settings: user.settings,
        
        // Check-in
        last_check_in_date: user.lastCheckInDate,
        consecutive_check_in_days: user.checkInStreak,

        // Personalization
        last_nickname_change: user.lastNicknameChange,

        // Push
        push_client_id: user.pushClientId,
        
        // PK Rating (Updated for respective modes)
        pk_rating: user.pkRating,
        pk_rating_overload: user.pkRatingOverload
    };

    const { error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('student_id', user.studentId);
        
    if (error) {
        console.error('Error updating user:', error);
        throw new Error(error.message);
    }
    return true;
};

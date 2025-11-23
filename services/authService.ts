import { User } from '../types';
import { calculateLevel } from './levelService';
import { supabase } from './supabaseClient';

export const login = async (name: string, studentId: string): Promise<User> => {
    
    try {
        // 1. Try to fetch user from Supabase
        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('student_id', studentId)
            .single();
        
        // Handle case where connection succeeds but user not found (PGRST116)
        if (error && error.code !== 'PGRST116') { 
            console.warn('Supabase Auth Error, falling back to mock user:', error);
            throw new Error("DB_CONNECTION_FAILED");
        }

        // 2. If user not found, create new one
        if (!user) {
            const isAdmin = name.toLowerCase() === 'admin';
            const initialPoints = isAdmin ? 999999 : 100;
            
            const newUserPayload = {
                student_id: studentId,
                name: name,
                points: initialPoints,
                hearts: 3,
                last_heart_reset: new Date().toDateString(),
                inventory: [],
                avatar_image: null,
            };

            const { data: createdUser, error: createError } = await supabase
                .from('users')
                .insert([newUserPayload])
                .select()
                .single();
                
            if (createError) {
                console.warn('Error creating user in DB, falling back to mock:', createError);
                throw new Error("DB_CREATE_FAILED");
            }
            user = createdUser;
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

        return {
            name: user.name,
            studentId: user.student_id,
            avatarColor: user.avatar_color || 'bg-purple-500', 
            avatarImage: user.avatar_image || undefined,
            avatarFrame: user.avatar_frame || undefined,
            points: user.points,
            level: calculateLevel(user.points),
            isAdmin: user.name.toLowerCase() === 'admin',
            inventory: inventory,
            settings: user.settings || { darkMode: false, notifications: true, fontSize: 'medium' },
            nameColor: user.name_color || undefined,
            hearts: user.hearts ?? 3,
            lastHeartReset: user.last_heart_reset || new Date().toDateString()
        };

    } catch (e) {
        console.warn("Using Fallback Mock User due to DB Error");
        // Fallback Mock User to allow app usage without DB setup
        const isAdmin = name.toLowerCase() === 'admin';
        return {
            name: name,
            studentId: studentId,
            avatarColor: 'bg-purple-500',
            points: isAdmin ? 999999 : 100,
            level: 1,
            isAdmin: isAdmin,
            inventory: [],
            hearts: 3,
            lastHeartReset: new Date().toDateString()
        };
    }
};

export const updateUserInDb = async (user: User) => {
    // Sync critical stats back to DB
    const updatePayload = {
        points: user.points,
        hearts: user.hearts,
        last_heart_reset: user.lastHeartReset,
        avatar_image: user.avatarImage,
        avatar_frame: user.avatarFrame, 
        name_color: user.nameColor,     
        inventory: user.inventory,
        avatar_color: user.avatarColor
    };

    const { error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('student_id', user.studentId);
        
    if (error) console.error('Error updating user:', error);
};
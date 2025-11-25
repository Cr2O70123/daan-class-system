
import { supabase } from './supabaseClient';
import { Notification, User } from '../types';
import { updateUserInDb } from './authService';

// --- HBuilderX / UniPush Integration ---

export const registerPushClientId = async (user: User) => {
    // Check if running inside HBuilderX (plus environment)
    // @ts-ignore
    if (window.plus) {
        try {
            // @ts-ignore
            const info = window.plus.push.getClientInfo();
            const cid = info.clientid;

            if (cid && cid !== user.pushClientId) {
                console.log("Registering Push CID:", cid);
                const updatedUser = { ...user, pushClientId: cid };
                await updateUserInDb(updatedUser);
                return updatedUser;
            }
        } catch (e) {
            console.error("Failed to get push client info", e);
        }
    } else {
        console.log("Not in HBuilderX environment, skipping push registration.");
    }
    return user;
};

// --- Notification Data Operations ---

export const fetchNotifications = async (studentId: string): Promise<Notification[]> => {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', studentId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error("Error fetching notifications", error);
        return [];
    }

    return data.map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        type: n.type,
        title: n.title,
        content: n.content,
        link: n.link,
        isRead: n.is_read,
        createdAt: new Date(n.created_at).toLocaleString()
    }));
};

export const markNotificationRead = async (id: number) => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
    if (error) throw error;
};

export const markAllNotificationsRead = async (studentId: string) => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', studentId)
        .eq('is_read', false);
    if (error) throw error;
};

export const deleteNotification = async (id: number) => {
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

export const createNotification = async (
    targetStudentId: string, 
    type: 'reply' | 'system' | 'rank' | 'checkin', 
    title: string, 
    content: string, 
    link?: string
) => {
    const { error } = await supabase
        .from('notifications')
        .insert([{
            user_id: targetStudentId,
            type,
            title,
            content,
            link,
            is_read: false
        }]);
    
    if (error) console.error("Failed to create notification", error);
};

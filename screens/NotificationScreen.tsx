
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, CheckCircle, Trash2, MessageCircle, Info, Trophy, Calendar } from 'lucide-react';
import { Notification, User } from '../types';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '../services/notificationService';

interface NotificationScreenProps {
  user: User;
  onBack: () => void;
  onNotificationClick: (notif: Notification) => void;
}

export const NotificationScreen: React.FC<NotificationScreenProps> = ({ user, onBack, onNotificationClick }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const data = await fetchNotifications(user.studentId);
    setNotifications(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRead = async (id: number) => {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      await markNotificationRead(id);
  };

  const handleReadAll = async () => {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      await markAllNotificationsRead(user.studentId);
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
      e.stopPropagation();
      setNotifications(prev => prev.filter(n => n.id !== id));
      await deleteNotification(id);
  };

  const getIcon = (type: string) => {
      switch(type) {
          case 'reply': return <MessageCircle size={18} className="text-blue-500" />;
          case 'rank': return <Trophy size={18} className="text-yellow-500" />;
          case 'checkin': return <Calendar size={18} className="text-green-500" />;
          default: return <Info size={18} className="text-gray-500" />;
      }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-4 pt-safe shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
            </button>
            <h1 className="font-bold text-lg text-gray-800 dark:text-white">通知中心</h1>
          </div>
          <button 
            onClick={handleReadAll}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-full"
          >
            全部已讀
          </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
              <div className="text-center py-10 text-gray-400 text-sm">載入中...</div>
          ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Bell size={40} className="mb-4 opacity-50" />
                  <p>目前沒有新通知</p>
              </div>
          ) : (
              notifications.map(n => (
                  <div 
                    key={n.id}
                    onClick={() => {
                        handleRead(n.id);
                        if (n.link) onNotificationClick(n);
                    }}
                    className={`p-4 rounded-xl border flex gap-3 transition-all active:scale-[0.99] cursor-pointer relative ${
                        n.isRead 
                            ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 opacity-80' 
                            : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800 shadow-sm'
                    }`}
                  >
                      {/* Unread Dot */}
                      {!n.isRead && (
                          <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500"></div>
                      )}

                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600`}>
                          {getIcon(n.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-bold mb-1 truncate pr-4 ${n.isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-800 dark:text-white'}`}>
                              {n.title}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                              {n.content}
                          </p>
                          <span className="text-[10px] text-gray-400">{n.createdAt}</span>
                      </div>

                      <button 
                        onClick={(e) => handleDelete(n.id, e)}
                        className="self-end text-gray-300 hover:text-red-500 p-2"
                      >
                          <Trash2 size={16} />
                      </button>
                  </div>
              ))
          )}
      </div>
    </div>
  );
};

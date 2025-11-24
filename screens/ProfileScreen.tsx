import React, { useState, useRef } from 'react';
import { User, Question, Resource } from '../types';
import { LogOut, Moon, FileText, Camera, Trophy, BookOpen, MessageCircle, HelpCircle, X, Trash2, ShieldAlert } from 'lucide-react';
import { calculateProgress } from '../services/levelService';

interface ProfileScreenProps {
  user: User;
  setUser: (user: User) => void;
  onNavigateToModeration: () => void;
  onNavigateToLeaderboard: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  
  userQuestions: Question[];
  userReplies: Question[];
  userResources: Resource[];
  
  onDeleteQuestion: (id: number) => void;
  onDeleteReply: (id: number) => void;
  onDeleteResource: (id: number) => void;
}

const getFrameStyle = (frameId?: string) => {
    switch(frameId) {
      case 'frame_gold': return 'ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]';
      case 'frame_neon': return 'ring-4 ring-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]';
      case 'frame_fire': return 'ring-4 ring-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]';
      case 'frame_pixel': return 'ring-4 ring-purple-500 border-4 border-dashed border-white';
      default: return 'ring-4 ring-white dark:ring-gray-800 shadow-xl';
    }
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ 
    user, 
    setUser, 
    onNavigateToModeration, 
    onNavigateToLeaderboard,
    onLogout, 
    isDarkMode, 
    toggleDarkMode,
    userQuestions,
    userReplies,
    userResources,
    onDeleteQuestion,
    onDeleteReply,
    onDeleteResource
}) => {
  const [avatarImage, setAvatarImage] = useState<string | undefined>(user.avatarImage);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'questions' | 'answers' | 'resources'>('questions');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const progressPercent = calculateProgress(user.points);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarImage(reader.result as string);
        setUser({ ...user, avatarImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const renderHistoryList = () => {
    if (activeHistoryTab === 'questions') {
      if (userQuestions.length === 0) return <p className="text-center text-xs text-gray-400 py-4">尚無提問記錄</p>;
      return (
        <div className="space-y-2">
          {userQuestions.map(q => (
            <div key={q.id} className="text-sm p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex justify-between items-center text-gray-700 dark:text-gray-300">
              <span className="truncate flex-1">{q.title}</span>
              <button 
                onClick={() => onDeleteQuestion(q.id)}
                className="text-gray-400 hover:text-red-500 p-1 ml-2 transition-colors"
                title="刪除"
              >
                  <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      );
    }
    if (activeHistoryTab === 'answers') {
      if (userReplies.length === 0) return <p className="text-center text-xs text-gray-400 py-4">尚無回答記錄</p>;
      return (
        <div className="space-y-2">
          {userReplies.map(q => {
            const myReplies = q.replies.filter(r => r.author === user.name);
            return myReplies.map(r => (
                 <div key={`reply_${r.id}`} className="text-sm p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex justify-between items-center text-gray-700 dark:text-gray-300">
                    <div className="truncate flex-1">
                        <span className="text-gray-400 text-xs mr-2">Re: {q.title}</span>
                        <span>{r.content.substring(0, 20)}...</span>
                    </div>
                    <button 
                        onClick={() => onDeleteReply(r.id)}
                        className="text-gray-400 hover:text-red-500 p-1 ml-2 transition-colors"
                        title="刪除"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ));
          })}
        </div>
      );
    }
    if (activeHistoryTab === 'resources') {
      if (userResources.length === 0) return <p className="text-center text-xs text-gray-400 py-4">尚無分享記錄</p>;
      return (
        <div className="space-y-2">
          {userResources.map(r => (
            <div key={r.id} className="text-sm p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex justify-between items-center text-gray-700 dark:text-gray-300">
              <span className="truncate flex-1">{r.title}</span>
              <button 
                onClick={() => onDeleteResource(r.id)}
                className="text-gray-400 hover:text-red-500 p-1 ml-2 transition-colors"
                title="刪除"
              >
                  <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="pb-24">
      {/* Privacy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <FileText className="text-blue-500" /> 隱私權政策
                    </h3>
                    <button onClick={() => setShowPrivacyModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>
                <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    <p>歡迎使用「電子三乙功課系統」（以下簡稱本服務）。</p>
                    <h4 className="font-bold text-gray-800 dark:text-gray-200">1. 資料收集</h4>
                    <p>本服務僅收集您主動提供的姓名、學號與發問內容。所有資料僅用於班級內部學術交流。</p>
                    <h4 className="font-bold text-gray-800 dark:text-gray-200">2. 資料使用</h4>
                    <p>您的積分、排名與發問紀錄將公開顯示於班級排行榜與首頁。</p>
                </div>
                <button onClick={() => setShowPrivacyModal(false)} className="w-full mt-6 bg-blue-600 text-white font-bold py-3 px-4 rounded-xl">我了解了</button>
            </div>
        </div>
      )}

      {/* Header Profile Section - Added pt-safe */}
      <div className="bg-white dark:bg-gray-800 pb-6 rounded-b-[2rem] shadow-sm mb-6 overflow-hidden transition-colors pt-safe">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 h-32 relative">
            <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent"></div>
        </div>
        
        <div className="px-6 relative">
            <div className="flex flex-col items-center -mt-12">
                {/* Avatar */}
                <div className="mb-3 relative group cursor-pointer w-24 h-24" onClick={() => fileInputRef.current?.click()}>
                    <div className={`w-full h-full rounded-full ${user.avatarColor} text-white text-4xl font-bold flex items-center justify-center ${getFrameStyle(user.avatarFrame)} overflow-hidden bg-cover bg-center`}>
                        {avatarImage ? (
                            <img src={avatarImage} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                            user.name.charAt(0) || 'U'
                        )}
                    </div>
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                        <Camera className="text-white drop-shadow-md" size={32} />
                    </div>
                </div>
                
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                
                <h2 className={`text-xl font-bold mt-2 ${user.nameColor || 'text-gray-800 dark:text-white'}`}>{user.name}</h2>
                <div className="flex items-center gap-2 mt-1 mb-2">
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-bold">
                        Lv.{user.level}
                    </span>
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-0.5 rounded-full">{user.studentId}</span>
                    {user.isAdmin && <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-full font-bold">管理員</span>}
                </div>

                {/* Level Progress */}
                <div className="w-full max-w-[200px] mb-4">
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>EXP</span>
                        <span>{user.points % 500} / 500</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                </div>
                
                {/* Stats & Actions Grid */}
                <div className={`grid ${user.isAdmin ? 'grid-cols-3' : 'grid-cols-2'} gap-4 w-full mt-2`}>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-3 text-center">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{user.points}</div>
                        <div className="text-xs text-blue-400 dark:text-blue-300 font-bold">目前積分</div>
                    </div>
                    <button onClick={onNavigateToLeaderboard} className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-3 text-center hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors">
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 flex items-center justify-center gap-1">
                            <Trophy size={20} />
                        </div>
                        <div className="text-xs text-yellow-500 dark:text-yellow-300 font-bold">班級榜單</div>
                    </button>
                    
                    {/* Admin Button - Only visible if isAdmin is true */}
                    {user.isAdmin && (
                         <button onClick={onNavigateToModeration} className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-3 text-center hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400 flex items-center justify-center gap-1">
                                <ShieldAlert size={20} />
                            </div>
                            <div className="text-xs text-red-500 dark:text-red-300 font-bold">管理後台</div>
                        </button>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="px-4 space-y-4">
            {/* History Tabs Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                <div className="flex border-b border-gray-100 dark:border-gray-700">
                    <button 
                        onClick={() => setActiveHistoryTab('questions')}
                        className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1 transition-colors ${activeHistoryTab === 'questions' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <HelpCircle size={14} /> 提問 ({userQuestions.length})
                    </button>
                    <button 
                        onClick={() => setActiveHistoryTab('answers')}
                        className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1 transition-colors ${activeHistoryTab === 'answers' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <MessageCircle size={14} /> 回答 ({userReplies.reduce((acc, q) => acc + q.replies.filter(r=>r.author === user.name).length, 0)})
                    </button>
                    <button 
                        onClick={() => setActiveHistoryTab('resources')}
                        className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1 transition-colors ${activeHistoryTab === 'resources' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <BookOpen size={14} /> 資源 ({userResources.length})
                    </button>
                </div>
                
                <div className="p-4 max-h-60 overflow-y-auto">
                   {renderHistoryList()}
                </div>
            </div>

            {/* Settings Components */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                 <div className="p-4 border-b border-gray-50 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                     <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">應用程式設定</h3>
                 </div>
                 <div className="p-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-600 dark:text-gray-300"><Moon size={18} /></div>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">夜間模式</span>
                    </div>
                    <button 
                        onClick={toggleDarkMode}
                        className={`w-12 h-7 rounded-full transition-colors relative px-1 flex items-center ${isDarkMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                 </div>
                 <div 
                    onClick={() => setShowPrivacyModal(true)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                 >
                     <div className="flex items-center gap-3">
                        <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-600 dark:text-gray-300"><FileText size={18} /></div>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">隱私權政策</span>
                     </div>
                 </div>
            </div>

            <div className="text-center pt-4">
                <button 
                    onClick={onLogout}
                    className="text-gray-400 text-xs flex items-center justify-center gap-1 mx-auto hover:text-red-500 transition-colors py-2"
                >
                    <LogOut size={12} /> 登出帳號
                </button>
                <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-2">v2.4.0 Build 20251131</p>
            </div>
      </div>
    </div>
  );
};
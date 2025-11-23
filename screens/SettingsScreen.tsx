import React, { useState } from 'react';
import { User } from '../types';
import { RefreshCw, Save, Check } from 'lucide-react';

interface SettingsScreenProps {
  user: User;
  setUser: (user: User) => void;
}

const AVATAR_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500', 'bg-emerald-500',
  'bg-teal-500', 'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 
  'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ user, setUser }) => {
  const [name, setName] = useState(user.name);
  const [isSaved, setIsSaved] = useState(false);

  const handleRandomAvatar = () => {
    const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    setUser({ ...user, avatarColor: randomColor });
  };

  const handleSave = () => {
    setUser({ ...user, name });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="p-4">
      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        
        {/* Header Gradient */}
        <div className="bg-gradient-to-b from-blue-600 to-purple-600 p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-1">編輯個人資料</h2>
          <p className="text-blue-100 text-sm">自訂你的名稱與專屬頭像</p>
        </div>

        {/* Avatar Section */}
        <div className="px-6 pb-6">
          <div className="flex flex-col items-center -mt-10 mb-6">
            <div className={`w-24 h-24 rounded-full ${user.avatarColor} text-white text-4xl font-bold flex items-center justify-center ring-4 ring-white shadow-md mb-3 transition-colors duration-300`}>
              {user.name.charAt(0) || '0'}
            </div>
            <button 
              onClick={handleRandomAvatar}
              className="text-blue-600 text-xs flex items-center gap-1 font-medium hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-full"
            >
              <RefreshCw size={12} />
              隨機更換樣式
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-gray-600 text-sm font-bold mb-2">顯示名稱</label>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 text-gray-800 border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                placeholder="輸入你的名字"
              />
            </div>

            <div>
              <label className="block text-gray-600 text-sm font-bold mb-2">學號 (不可修改)</label>
              <input 
                type="text"
                value={user.studentId || 'Jj'}
                disabled
                className="w-full bg-gray-100 text-gray-400 rounded-lg p-3 border border-gray-200 cursor-not-allowed select-none"
              />
            </div>

            <button 
              onClick={handleSave}
              className={`w-full font-bold py-3 px-4 rounded-lg mt-4 flex items-center justify-center gap-2 transition-all duration-300 ${
                isSaved 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSaved ? <Check size={18} /> : <Save size={18} />}
              {isSaved ? '已儲存' : '儲存變更'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
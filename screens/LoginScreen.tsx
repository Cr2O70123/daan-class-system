
import React, { useState } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (name: string, studentId: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !studentId) {
      setError('請填寫姓名與學號');
      return;
    }

    setIsLoading(true);
    try {
        await onLogin(name, studentId);
    } catch (e: any) {
        setError(e.message || '登入失敗');
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-[-20%] right-[-20%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-purple-600/20 rounded-full blur-3xl"></div>

      <div className="w-full max-w-sm relative z-10">
        
        {/* Logo Area */}
        <div className="flex flex-col items-center mb-10 text-white animate-in slide-in-from-top duration-700">
          <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(37,99,235,0.5)] rotate-3 hover:rotate-6 transition-transform duration-500 border border-white/10">
            <BookOpen size={48} className="text-white drop-shadow-md" />
          </div>
          <h1 className="text-3xl font-black tracking-wider mb-2">電子三乙</h1>
          <p className="text-blue-200 text-sm tracking-[0.3em] uppercase font-medium">Class System v2.0</p>
        </div>

        {/* Form Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 space-y-6 animate-in zoom-in duration-500">
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-wider ml-1">姓名 (Name)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="請輸入真實姓名"
                className="w-full bg-black/20 text-white placeholder-gray-500 border border-white/10 rounded-xl px-4 py-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-wider ml-1">學號 (Student ID)</label>
              <input
                type="text"
                inputMode="numeric"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="例如: 910xxx"
                className="w-full bg-black/20 text-white placeholder-gray-500 border border-white/10 rounded-xl px-4 py-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm flex items-center justify-center animate-in fade-in slide-in-from-bottom-2">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/30 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
                <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>登入中...</span>
                </>
            ) : (
                <span>進入系統</span>
            )}
          </button>
        </div>

        <p className="text-center text-gray-500 text-xs mt-8">
          © 2025 Class 3B. All rights reserved.
        </p>
      </div>
    </div>
  );
};

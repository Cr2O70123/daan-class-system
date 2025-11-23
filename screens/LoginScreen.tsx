import React, { useState } from 'react';
import { BookOpen, ShieldCheck } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (name: string, studentId: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name || !studentId || !passcode) {
      setError('請填寫所有欄位');
      return;
    }
    // Admin override or standard check
    if (name.toLowerCase() !== 'admin' && passcode.toUpperCase() !== 'DAAN-E3Y') {
      setError('驗證碼錯誤');
      return;
    }
    // If name is admin, we allow it (App.tsx handles the infinite points/role)
    // Or if passcode is correct
    
    onLogin(name, studentId);
  };

  return (
    <div className="min-h-screen bg-blue-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        
        {/* Logo Area */}
        <div className="flex flex-col items-center mb-8 text-white">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
            <BookOpen size={40} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-wider">電子三乙功課系統</h1>
          <p className="text-blue-200 text-sm mt-1 tracking-widest">班級專屬 • 資源共享</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-2xl p-6 space-y-4">
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">姓名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="請輸入真實姓名"
              className="w-full bg-gray-600 text-white placeholder-gray-400 border-none rounded-md px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">學號</label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g. 910xxx"
              className="w-full bg-gray-600 text-white placeholder-gray-400 border-none rounded-md px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">驗證碼</label>
            <input
              type="text"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="請輸入驗證碼"
              className="w-full bg-gray-600 text-white placeholder-gray-400 border-none rounded-md px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {/* Hint removed as requested */}
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 text-xs p-2 rounded text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-all mt-2"
          >
            <ShieldCheck size={18} className="mr-2" />
            驗證並登入
          </button>
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          僅限本班同學使用 • 違者必究
        </p>
      </div>
    </div>
  );
};
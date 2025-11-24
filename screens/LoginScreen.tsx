import React, { useState } from 'react';
import { BookOpen, ShieldCheck } from 'lucide-react';
import { getDailyPasscode } from '../services/authService';

interface LoginScreenProps {
  onLogin: (name: string, studentId: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name || !studentId) {
      setError('請填寫姓名與學號');
      return;
    }

    // Admin Override: admin1204 grants access without standard passcode
    if (name === 'admin1204') {
        onLogin(name, studentId);
        return;
    }

    if (!passcode) {
        setError('請填寫驗證碼');
        return;
    }

    const dailyCode = getDailyPasscode();
    
    // Check against dynamic daily code
    if (passcode.toUpperCase() !== dailyCode) {
      setError('驗證碼錯誤 (請詢問今日代碼)');
      return;
    }
    
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
          <p className="text-blue-200 text-sm mt-1 tracking-widest">內部測試中!</p>
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
              placeholder="請輸入今日驗證碼"
              className="w-full bg-gray-600 text-white placeholder-gray-400 border-none rounded-md px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />
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
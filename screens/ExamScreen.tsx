import React, { useState } from 'react';
import { Calendar, Clock, Plus, AlertCircle, Trash2 } from 'lucide-react';
import { Exam } from '../types';

interface ExamScreenProps {
  exams: Exam[];
  onAddExam: (subject: string, title: string, date: string, time: string) => void;
  onDeleteExam: (id: number) => void; // Optional: Allow deleting
}

const SUBJECTS = ['電子學', '基本電學', '數位邏輯', '微處理機', '程式設計', '國文', '英文', '數學', '其他'];

export const ExamScreen: React.FC<ExamScreenProps> = ({ exams, onAddExam, onDeleteExam }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const getDaysRemaining = (dateStr: string) => {
    const examDate = new Date(dateStr);
    const today = new Date();
    // Reset time to compare dates only
    today.setHours(0,0,0,0);
    examDate.setHours(0,0,0,0);
    
    const diffTime = examDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleSubmit = () => {
    if (!title || !date || !time) return;
    onAddExam(subject, title, date, time);
    setTitle('');
    setDate('');
    setTime('');
    setIsModalOpen(false);
  };

  // Sort exams by date
  const sortedExams = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="pb-24 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header - Added pt-safe */}
      <div className="bg-white dark:bg-gray-800 p-6 pt-safe rounded-b-[2rem] shadow-sm mb-6 border-b border-gray-100 dark:border-gray-700">
        <div className="mt-2">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-1">
                <Calendar className="text-red-500" /> 近期考試
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">掌握時間，輕鬆應對</p>
        </div>
      </div>

      {/* List */}
      <div className="px-4 space-y-4">
        {sortedExams.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
                <p>目前沒有考試安排，太棒了！</p>
            </div>
        ) : (
            sortedExams.map(exam => {
                const daysLeft = getDaysRemaining(exam.date);
                let urgencyColor = 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30';
                let textColor = 'text-blue-600 dark:text-blue-400';
                
                if (daysLeft < 0) {
                    urgencyColor = 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60';
                    textColor = 'text-gray-500';
                } else if (daysLeft <= 3) {
                    urgencyColor = 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30';
                    textColor = 'text-red-600 dark:text-red-400';
                } else if (daysLeft <= 7) {
                    urgencyColor = 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/30';
                    textColor = 'text-orange-600 dark:text-orange-400';
                }

                return (
                    <div key={exam.id} className={`p-4 rounded-2xl border ${urgencyColor} shadow-sm flex items-center justify-between`}>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-gray-700 ${textColor}`}>
                                    {exam.subject}
                                </span>
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <Clock size={10} /> {exam.date} {exam.time}
                                </span>
                            </div>
                            <h3 className={`font-bold text-lg ${daysLeft < 0 ? 'line-through text-gray-400' : 'text-gray-800 dark:text-white'}`}>
                                {exam.title}
                            </h3>
                        </div>
                        <div className="text-center pl-4 border-l border-gray-200 dark:border-gray-700/50 ml-2">
                            {daysLeft < 0 ? (
                                <span className="text-xs font-bold text-gray-400 block w-12">已結束</span>
                            ) : (
                                <>
                                    <span className={`text-2xl font-bold block leading-none ${textColor}`}>{daysLeft}</span>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase">天後</span>
                                </>
                            )}
                        </div>
                    </div>
                );
            })
        )}
      </div>

      {/* Add Button */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 bg-red-500 hover:bg-red-600 text-white w-14 h-14 rounded-full shadow-lg shadow-red-500/30 flex items-center justify-center transition-transform active:scale-90 z-40"
      >
        <Plus size={32} />
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">新增考試行程</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">科目</label>
                        <div className="flex flex-wrap gap-2">
                            {SUBJECTS.map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSubject(s)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${subject === s ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                         <label className="text-xs font-bold text-gray-500 mb-1 block">考試內容 / 範圍</label>
                         <input 
                            type="text"
                            placeholder="例如：Ch1-Ch3 隨堂考"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 outline-none"
                         />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">日期</label>
                            <input 
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">時間</label>
                            <input 
                                type="time"
                                value={time}
                                onChange={e => setTime(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 outline-none text-sm"
                            />
                        </div>
                    </div>
                    
                    <div className="flex gap-3 mt-6">
                        <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold text-gray-600 dark:text-gray-300">取消</button>
                        <button onClick={handleSubmit} disabled={!title || !date || !time} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold disabled:opacity-50">新增</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
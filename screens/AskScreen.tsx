

import React, { useState, useRef } from 'react';
import { AlertTriangle, Image as ImageIcon, Send, X, Ghost } from 'lucide-react';
import { Question, User } from '../types';

interface AskScreenProps {
  user: User;
  onPostQuestion: (question: Omit<Question, 'id' | 'replies' | 'views' | 'date'>, isAnonymous: boolean) => void;
  onImageClick?: (url: string) => void;
}

const SUBJECTS = ['電子學', '基本電學', '數位邏輯', '微處理機', '程式設計', '國文', '英文', '數學', '其他'];

export const AskScreen: React.FC<AskScreenProps> = ({ user, onPostQuestion, onImageClick }) => {
  const [selectedSubject, setSelectedSubject] = useState('電子學');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [useAnonymous, setUseAnonymous] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check inventory for Anonymous Card
  const anonCardCount = user.inventory.filter(item => item === 'card_anon').length;
  const canUseAnonymous = anonCardCount > 0;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 800; // Max width constraint to reduce size

          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              // Compress to JPEG with 0.7 quality
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
              setImage(compressedDataUrl);
          }
        };
        if (event.target?.result) {
            img.src = event.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = () => {
    if (!title.trim() || !content.trim()) return;
    
    onPostQuestion({
      title,
      content,
      image: image || undefined,
      author: user.name, // Will be overridden in App.tsx/dataService if anonymous
      tags: [selectedSubject],
      status: 'open',
      replyCount: 0,
      authorAvatarColor: user.avatarColor
    }, useAnonymous);
    
    // Reset form
    setTitle('');
    setContent('');
    setImage(null);
    setSelectedSubject('電子學');
    setUseAnonymous(false);
  };

  const handleToggleAnonymous = () => {
      if (canUseAnonymous) {
          setUseAnonymous(!useAnonymous);
      } else {
          alert("您沒有「匿名發問卡」，請前往商店購買。");
      }
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      
      {/* Warning Alert */}
      <div className="bg-red-50 border border-red-100 rounded-xl p-4">
        <div className="flex items-center space-x-2 text-red-600 font-bold mb-2">
          <AlertTriangle size={18} />
          <span>發言規則提醒</span>
        </div>
        <ul className="text-xs text-red-800 space-y-1 list-disc list-inside opacity-80">
          <li>禁止使用髒話、人身攻擊或不雅字眼。</li>
          <li>禁止張貼作弊答案或違反學術倫理的內容。</li>
          <li>禁止無意義灌水，請專注於課業討論。</li>
          <li>違規者將被扣分並可能停權處理。</li>
        </ul>
      </div>

      {/* Subject Selection */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-3">選擇科目</label>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((subject) => (
            <button
              key={subject}
              onClick={() => setSelectedSubject(subject)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-100 active:scale-95 ${
                selectedSubject === subject
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200 ring-2 ring-blue-100'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-blue-300'
              }`}
            >
              {subject}
            </button>
          ))}
        </div>
      </div>

      {/* Title Input */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">問題標題</label>
        <input 
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例如：基本電學 戴維寧定理問題..."
          className="w-full bg-white text-gray-800 placeholder-gray-400 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
        />
      </div>

      {/* Content Input */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">詳細說明</label>
        <textarea 
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="請詳細描述你的問題，或貼上程式碼..."
          className="w-full bg-white text-gray-800 placeholder-gray-400 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
        />
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">上傳圖片 (選填)</label>
        
        {image ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200 inline-block cursor-zoom-in" onClick={() => onImageClick && onImageClick(image)}>
                <img src={image} alt="Preview" className="max-h-48 w-full object-contain bg-gray-50" />
                <button 
                    onClick={(e) => { e.stopPropagation(); setImage(null); }}
                    className="absolute top-2 right-2 bg-gray-900/70 text-white p-1 rounded-full hover:bg-gray-900 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        ) : (
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-400 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-500 transition-colors cursor-pointer bg-white group"
            >
                <ImageIcon size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium">點擊上傳題目圖片</span>
            </div>
        )}
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleImageUpload}
        />
      </div>
      
      {/* Anonymous Toggle Card */}
      <div 
        onClick={handleToggleAnonymous}
        className={`rounded-xl p-4 border transition-all cursor-pointer flex items-center justify-between ${
            useAnonymous 
            ? 'bg-gray-800 border-gray-700 text-white shadow-lg shadow-gray-400/50' 
            : canUseAnonymous
                ? 'bg-white border-gray-200 hover:border-gray-300'
                : 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
        }`}
      >
          <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${useAnonymous ? 'bg-gray-700' : 'bg-gray-100 text-gray-500'}`}>
                  <Ghost size={20} />
              </div>
              <div>
                  <div className={`font-bold text-sm ${useAnonymous ? 'text-white' : 'text-gray-700'}`}>使用匿名發問卡</div>
                  <div className={`text-xs ${useAnonymous ? 'text-gray-400' : 'text-gray-500'}`}>
                      {canUseAnonymous ? `剩餘數量: ${anonCardCount}` : '您尚未擁有此道具'}
                  </div>
              </div>
          </div>
          
          <div className={`w-12 h-6 rounded-full p-1 transition-colors ${useAnonymous ? 'bg-green-500' : 'bg-gray-300'}`}>
              <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${useAnonymous ? 'translate-x-6' : 'translate-x-0'}`}></div>
          </div>
      </div>
      
      {/* Hint Prompt */}
      {canUseAnonymous && !useAnonymous && (
          <div className="text-center text-xs text-blue-500 font-medium animate-pulse">
              💡 提示：您可以使用匿名卡隱藏身分
          </div>
      )}

      {/* Submit Button */}
      <button 
        onClick={handlePost}
        disabled={!title.trim() || !content.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
      >
        <Send size={18} />
        <span>發布問題</span>
      </button>

    </div>
  );
};
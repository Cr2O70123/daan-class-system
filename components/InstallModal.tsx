import React from 'react';
import { X, MoreVertical, Download } from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
          <div className="flex items-center space-x-2">
            <Download size={20} />
            <span className="font-bold text-lg">安裝 APP</span>
          </div>
          <button onClick={onClose} className="hover:bg-blue-700 rounded-full p-1">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 dark:text-gray-300 text-center mb-6 leading-relaxed">
            將「電子三乙功課系統」加入主畫面，即可獲得像 APP 一樣的全螢幕體驗！
          </p>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center justify-center">
              🤖 Android 安裝教學
            </h3>
            <ol className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold mr-3 text-xs">1</span>
                <span>點擊瀏覽器右上角的 <span className="font-bold text-gray-800 dark:text-white">選單按鈕</span> <MoreVertical size={14} className="inline align-middle"/></span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold mr-3 text-xs">2</span>
                <span>選擇 <span className="font-bold text-gray-800 dark:text-white">安裝應用程式</span> 或 <span className="font-bold text-gray-800 dark:text-white">加入主畫面</span></span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold mr-3 text-xs">3</span>
                <span>確認安裝</span>
              </li>
            </ol>
          </div>

          <button 
            onClick={onClose}
            className="w-full mt-6 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};
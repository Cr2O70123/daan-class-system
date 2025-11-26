
import React, { useState } from 'react';
import { ArrowLeft, Binary, Hash, FileDigit, Delete } from 'lucide-react';

interface BaseConverterScreenProps {
  onBack: () => void;
}

export const BaseConverterScreen: React.FC<BaseConverterScreenProps> = ({ onBack }) => {
  const [dec, setDec] = useState('');
  const [bin, setBin] = useState('');
  const [hex, setHex] = useState('');
  const [oct, setOct] = useState('');

  const handleDecChange = (val: string) => {
      if (val === '') { clearAll(); return; }
      if (!/^\d*$/.test(val)) return;
      
      const num = parseInt(val, 10);
      setDec(val);
      setBin(num.toString(2));
      setHex(num.toString(16).toUpperCase());
      setOct(num.toString(8));
  };

  const handleBinChange = (val: string) => {
      if (val === '') { clearAll(); return; }
      if (!/^[01]*$/.test(val)) return;

      const num = parseInt(val, 2);
      setBin(val);
      setDec(num.toString(10));
      setHex(num.toString(16).toUpperCase());
      setOct(num.toString(8));
  };

  const handleHexChange = (val: string) => {
      if (val === '') { clearAll(); return; }
      if (!/^[0-9A-Fa-f]*$/.test(val)) return;

      const num = parseInt(val, 16);
      setHex(val.toUpperCase());
      setDec(num.toString(10));
      setBin(num.toString(2));
      setOct(num.toString(8));
  };

  const clearAll = () => {
      setDec('');
      setBin('');
      setHex('');
      setOct('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="bg-white dark:bg-gray-800 p-4 pt-safe shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
            </button>
            <h1 className="font-bold text-lg text-gray-800 dark:text-white">工程計算機 (Base Converter)</h1>
        </div>
        <button onClick={clearAll} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
            <Delete size={18} />
        </button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        
        {/* Decimal */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-900/30 focus-within:ring-2 ring-blue-500 transition-all">
            <div className="flex items-center gap-2 mb-2">
                <div className="bg-blue-100 dark:bg-blue-900/50 p-1.5 rounded-lg text-blue-600 dark:text-blue-400">
                    <Hash size={16} />
                </div>
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Decimal (十進制)</span>
            </div>
            <input 
                type="text" 
                inputMode="numeric"
                value={dec}
                onChange={e => handleDecChange(e.target.value)}
                placeholder="0"
                className="w-full bg-transparent text-3xl font-black text-gray-800 dark:text-white outline-none font-mono"
            />
        </div>

        {/* Binary */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-green-100 dark:border-green-900/30 focus-within:ring-2 ring-green-500 transition-all">
            <div className="flex items-center gap-2 mb-2">
                <div className="bg-green-100 dark:bg-green-900/50 p-1.5 rounded-lg text-green-600 dark:text-green-400">
                    <Binary size={16} />
                </div>
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Binary (二進制)</span>
            </div>
            <textarea 
                value={bin}
                onChange={e => handleBinChange(e.target.value)}
                placeholder="0"
                rows={2}
                className="w-full bg-transparent text-2xl font-bold text-gray-800 dark:text-white outline-none font-mono resize-none"
            />
        </div>

        {/* Hex */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-purple-100 dark:border-purple-900/30 focus-within:ring-2 ring-purple-500 transition-all">
            <div className="flex items-center gap-2 mb-2">
                <div className="bg-purple-100 dark:bg-purple-900/50 p-1.5 rounded-lg text-purple-600 dark:text-purple-400">
                    <FileDigit size={16} />
                </div>
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Hexadecimal (十六進制)</span>
            </div>
            <input 
                type="text" 
                value={hex}
                onChange={e => handleHexChange(e.target.value)}
                placeholder="0"
                className="w-full bg-transparent text-3xl font-black text-gray-800 dark:text-white outline-none font-mono uppercase"
            />
        </div>

        {/* ASCII Preview (Extra) */}
        {dec && parseInt(dec) >= 32 && parseInt(dec) <= 126 && (
            <div className="text-center animate-in fade-in slide-in-from-bottom-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">ASCII Char</span>
                <div className="text-6xl font-black text-gray-800 dark:text-white mt-2">
                    {String.fromCharCode(parseInt(dec))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

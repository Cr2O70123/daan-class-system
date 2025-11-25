
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calculator, RotateCcw, Zap } from 'lucide-react';

interface OhmsLawScreenProps {
  onBack: () => void;
}

export const OhmsLawScreen: React.FC<OhmsLawScreenProps> = ({ onBack }) => {
  const [v, setV] = useState(''); // Voltage
  const [i, setI] = useState(''); // Current
  const [r, setR] = useState(''); // Resistance
  const [p, setP] = useState(''); // Power

  // Calculate based on inputs
  useEffect(() => {
    const valV = parseFloat(v);
    const valI = parseFloat(i);
    const valR = parseFloat(r);
    const valP = parseFloat(p);

    // Count how many inputs are valid numbers
    const inputs = [!isNaN(valV), !isNaN(valI), !isNaN(valR), !isNaN(valP)];
    const count = inputs.filter(Boolean).length;

    // We need exactly 2 inputs to calculate the rest
    if (count !== 2) return;

    // Logic: V=IR, P=IV, P=I^2R, P=V^2/R
    
    // Case 1: Given V and I
    if (!isNaN(valV) && !isNaN(valI)) {
      if (r === '') setR((valV / valI).toFixed(2));
      if (p === '') setP((valV * valI).toFixed(2));
    }
    // Case 2: Given V and R
    else if (!isNaN(valV) && !isNaN(valR)) {
      if (i === '') setI((valV / valR).toFixed(2));
      if (p === '') setP((Math.pow(valV, 2) / valR).toFixed(2));
    }
    // Case 3: Given V and P
    else if (!isNaN(valV) && !isNaN(valP)) {
      if (i === '') setI((valP / valV).toFixed(2));
      if (r === '') setR((Math.pow(valV, 2) / valP).toFixed(2));
    }
    // Case 4: Given I and R
    else if (!isNaN(valI) && !isNaN(valR)) {
      if (v === '') setV((valI * valR).toFixed(2));
      if (p === '') setP((Math.pow(valI, 2) * valR).toFixed(2));
    }
    // Case 5: Given I and P
    else if (!isNaN(valI) && !isNaN(valP)) {
      if (v === '') setV((valP / valI).toFixed(2));
      if (r === '') setR((valP / Math.pow(valI, 2)).toFixed(2));
    }
    // Case 6: Given R and P
    else if (!isNaN(valR) && !isNaN(valP)) {
      if (v === '') setV(Math.sqrt(valP * valR).toFixed(2));
      if (i === '') setI(Math.sqrt(valP / valR).toFixed(2));
    }

  }, [v, i, r, p]);

  const handleReset = () => {
    setV('');
    setI('');
    setR('');
    setP('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="bg-white dark:bg-gray-800 p-4 pt-safe shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
            </button>
            <h1 className="font-bold text-lg text-gray-800 dark:text-white">歐姆定律計算機</h1>
        </div>
        <button onClick={handleReset} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
            <RotateCcw size={18} />
        </button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white mb-6 shadow-lg shadow-blue-500/20">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 p-2 rounded-lg">
                    <Calculator size={24} />
                </div>
                <div>
                    <h2 className="font-bold text-lg">電學小幫手</h2>
                    <p className="text-blue-100 text-xs">輸入任意 2 個數值，自動計算其餘項目</p>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-center text-sm font-mono opacity-80">
                <div className="bg-white/10 rounded p-1">V = I × R</div>
                <div className="bg-white/10 rounded p-1">P = I × V</div>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
            {/* Voltage */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm focus-within:ring-2 ring-blue-500 transition-all">
                <label className="text-xs font-bold text-gray-400 block mb-1">電壓 (Voltage, V)</label>
                <div className="flex items-center">
                    <span className="text-xl font-bold text-blue-600 w-8">V</span>
                    <input 
                        type="number" 
                        value={v}
                        onChange={(e) => setV(e.target.value)}
                        placeholder="0"
                        className="flex-1 bg-transparent text-2xl font-black text-gray-800 dark:text-white outline-none text-right"
                    />
                    <span className="text-sm font-bold text-gray-400 ml-2 w-4">V</span>
                </div>
            </div>

            {/* Current */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm focus-within:ring-2 ring-green-500 transition-all">
                <label className="text-xs font-bold text-gray-400 block mb-1">電流 (Current, I)</label>
                <div className="flex items-center">
                    <span className="text-xl font-bold text-green-600 w-8">I</span>
                    <input 
                        type="number" 
                        value={i}
                        onChange={(e) => setI(e.target.value)}
                        placeholder="0"
                        className="flex-1 bg-transparent text-2xl font-black text-gray-800 dark:text-white outline-none text-right"
                    />
                    <span className="text-sm font-bold text-gray-400 ml-2 w-4">A</span>
                </div>
            </div>

            {/* Resistance */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm focus-within:ring-2 ring-orange-500 transition-all">
                <label className="text-xs font-bold text-gray-400 block mb-1">電阻 (Resistance, R)</label>
                <div className="flex items-center">
                    <span className="text-xl font-bold text-orange-600 w-8">R</span>
                    <input 
                        type="number" 
                        value={r}
                        onChange={(e) => setR(e.target.value)}
                        placeholder="0"
                        className="flex-1 bg-transparent text-2xl font-black text-gray-800 dark:text-white outline-none text-right"
                    />
                    <span className="text-sm font-bold text-gray-400 ml-2 w-4">Ω</span>
                </div>
            </div>

            {/* Power */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm focus-within:ring-2 ring-red-500 transition-all">
                <label className="text-xs font-bold text-gray-400 block mb-1">功率 (Power, P)</label>
                <div className="flex items-center">
                    <span className="text-xl font-bold text-red-600 w-8">P</span>
                    <input 
                        type="number" 
                        value={p}
                        onChange={(e) => setP(e.target.value)}
                        placeholder="0"
                        className="flex-1 bg-transparent text-2xl font-black text-gray-800 dark:text-white outline-none text-right"
                    />
                    <span className="text-sm font-bold text-gray-400 ml-2 w-4">W</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { ArrowLeft, ToggleLeft, ToggleRight, Lightbulb, Zap } from 'lucide-react';

interface LogicGateScreenProps {
  onBack: () => void;
}

type GateType = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR';

export const LogicGateScreen: React.FC<LogicGateScreenProps> = ({ onBack }) => {
  const [gate, setGate] = useState<GateType>('AND');
  const [inputA, setInputA] = useState(false);
  const [inputB, setInputB] = useState(false);

  const calculateOutput = () => {
      switch(gate) {
          case 'AND': return inputA && inputB;
          case 'OR': return inputA || inputB;
          case 'NOT': return !inputA; // Ignores B
          case 'NAND': return !(inputA && inputB);
          case 'NOR': return !(inputA || inputB);
          case 'XOR': return inputA !== inputB;
          default: return false;
      }
  };

  const output = calculateOutput();

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="bg-white dark:bg-gray-800 p-4 pt-safe shadow-sm flex items-center gap-2">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
        </button>
        <h1 className="font-bold text-lg text-gray-800 dark:text-white">邏輯閘實驗室</h1>
      </div>

      <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center">
        
        {/* Gate Selector */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 w-full">
            {(['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR'] as GateType[]).map(g => (
                <button
                    key={g}
                    onClick={() => setGate(g)}
                    className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${
                        gate === g 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-none' 
                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                    }`}
                >
                    {g}
                </button>
            ))}
        </div>

        {/* Circuit Visualizer */}
        <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 mb-8 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${output ? 'from-green-400 to-green-600' : 'from-gray-300 to-gray-400'}`}></div>
            
            <div className="flex justify-between items-center mb-8">
                {/* Inputs */}
                <div className="flex flex-col gap-6">
                    <button onClick={() => setInputA(!inputA)} className="flex items-center gap-2">
                        <div className={`w-12 h-6 rounded-full p-1 transition-colors ${inputA ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${inputA ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </div>
                        <span className="font-mono font-bold text-gray-600 dark:text-gray-300">A={inputA ? 1 : 0}</span>
                    </button>

                    {gate !== 'NOT' && (
                        <button onClick={() => setInputB(!inputB)} className="flex items-center gap-2">
                            <div className={`w-12 h-6 rounded-full p-1 transition-colors ${inputB ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${inputB ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </div>
                            <span className="font-mono font-bold text-gray-600 dark:text-gray-300">B={inputB ? 1 : 0}</span>
                        </button>
                    )}
                </div>

                {/* Gate Symbol (Text Representation for simplicity/accessibility) */}
                <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border-2 border-indigo-100 dark:border-indigo-800 flex flex-col items-center justify-center">
                    <Zap size={32} className="text-indigo-500 mb-1" />
                    <span className="font-black text-indigo-700 dark:text-indigo-300">{gate}</span>
                </div>
            </div>

            {/* Output */}
            <div className="flex flex-col items-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${output ? 'bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.6)]' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <Lightbulb size={40} className={`${output ? 'text-white fill-white' : 'text-gray-400 dark:text-gray-600'}`} />
                </div>
                <div className="mt-4 font-mono text-xl font-bold text-gray-800 dark:text-white">
                    OUTPUT = {output ? 1 : 0}
                </div>
            </div>
        </div>

        {/* Truth Table */}
        <div className="w-full max-w-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 ml-2">Truth Table</h3>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-700/50 p-2 text-xs font-bold text-gray-500 dark:text-gray-400 text-center">
                    <div>Input A</div>
                    <div>Input B</div>
                    <div>Output</div>
                </div>
                {/* Simple Truth Table Logic */}
                {[0, 1].map(a => (
                    gate === 'NOT' ? (
                        a === 0 || a === 1 ? ( // Only show A=0, A=1 lines for NOT
                             <div key={a} className={`grid grid-cols-3 p-3 border-t border-gray-100 dark:border-gray-700 text-center text-sm font-mono ${inputA === !!a ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                <div className={inputA === !!a ? 'font-bold text-blue-600' : 'text-gray-600 dark:text-gray-400'}>{a}</div>
                                <div className="text-gray-300">-</div>
                                <div className={inputA === !!a ? 'font-bold text-blue-600' : 'text-gray-600 dark:text-gray-400'}>{!a ? 1 : 0}</div>
                            </div>
                        ) : null
                    ) : (
                        [0, 1].map(b => {
                            // Calculate hypothetical output for table
                            let res = false;
                            const ba = !!a; const bb = !!b;
                            switch(gate) {
                                case 'AND': res = ba && bb; break;
                                case 'OR': res = ba || bb; break;
                                case 'NAND': res = !(ba && bb); break;
                                case 'NOR': res = !(ba || bb); break;
                                case 'XOR': res = ba !== bb; break;
                            }
                            const isActive = inputA === !!a && inputB === !!b;
                            
                            return (
                                <div key={`${a}-${b}`} className={`grid grid-cols-3 p-3 border-t border-gray-100 dark:border-gray-700 text-center text-sm font-mono ${isActive ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                    <div className={isActive ? 'font-bold text-blue-600' : 'text-gray-600 dark:text-gray-400'}>{a}</div>
                                    <div className={isActive ? 'font-bold text-blue-600' : 'text-gray-600 dark:text-gray-400'}>{b}</div>
                                    <div className={isActive ? 'font-bold text-blue-600' : 'text-gray-600 dark:text-gray-400'}>{res ? 1 : 0}</div>
                                </div>
                            );
                        })
                    )
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};

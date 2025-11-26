
import React, { useState } from 'react';
import { ArrowLeft, ToggleLeft, ToggleRight, Lightbulb, Cpu, ChevronRight, List, Grid, ChevronsRight } from 'lucide-react';

interface LogicGateScreenProps {
  onBack: () => void;
}

// Circuit Definition Type
type CircuitDef = {
    id: string;
    name: string;
    category: 'Basic' | 'Arithmetic' | 'Data' | 'Advanced';
    description: string;
    inputs: string[];
    outputs: string[];
    calculate: (inputs: number[]) => number[];
};

// Complex Logic Calculations
const CIRCUITS: CircuitDef[] = [
    // --- BASIC GATES ---
    {
        id: 'AND', name: 'AND Gate', category: 'Basic', description: '所有輸入為 1 時輸出 1',
        inputs: ['A', 'B'], outputs: ['Y'],
        calculate: ([a, b]) => [a & b]
    },
    {
        id: 'OR', name: 'OR Gate', category: 'Basic', description: '任一輸入為 1 時輸出 1',
        inputs: ['A', 'B'], outputs: ['Y'],
        calculate: ([a, b]) => [a | b]
    },
    {
        id: 'NOT', name: 'NOT Gate', category: 'Basic', description: '反轉輸入訊號',
        inputs: ['A'], outputs: ['Y'],
        calculate: ([a]) => [a ? 0 : 1]
    },
    {
        id: 'NAND', name: 'NAND Gate', category: 'Basic', description: 'AND 的反向',
        inputs: ['A', 'B'], outputs: ['Y'],
        calculate: ([a, b]) => [!(a & b) ? 1 : 0]
    },
    {
        id: 'XOR', name: 'XOR Gate', category: 'Basic', description: '輸入不同時輸出 1',
        inputs: ['A', 'B'], outputs: ['Y'],
        calculate: ([a, b]) => [a ^ b]
    },

    // --- ARITHMETIC ---
    {
        id: 'HALF_ADD', name: 'Half Adder (半加器)', category: 'Arithmetic', description: '兩個位元的加法，輸出和與進位',
        inputs: ['A', 'B'], outputs: ['Sum', 'Cout'],
        calculate: ([a, b]) => [a ^ b, a & b]
    },
    {
        id: 'FULL_ADD', name: 'Full Adder (全加器)', category: 'Arithmetic', description: '包含進位輸入的三位元加法',
        inputs: ['A', 'B', 'Cin'], outputs: ['Sum', 'Cout'],
        calculate: ([a, b, cin]) => {
            const sum = a ^ b ^ cin;
            const cout = (a & b) | (cin & (a ^ b));
            return [sum, cout];
        }
    },
    {
        id: 'HALF_SUB', name: 'Half Subtractor (半減器)', category: 'Arithmetic', description: 'A - B，輸出差值與借位',
        inputs: ['A', 'B'], outputs: ['Diff', 'Bout'],
        calculate: ([a, b]) => [a ^ b, (a ^ 1) & b]
    },
    {
        id: 'FULL_SUB', name: 'Full Subtractor (全減器)', category: 'Arithmetic', description: 'A - B - Bin',
        inputs: ['A', 'B', 'Bin'], outputs: ['Diff', 'Bout'],
        calculate: ([a, b, bin]) => {
            const diff = a ^ b ^ bin;
            const bout = ((a ^ 1) & b) | (((a ^ b) ^ 1) & bin); // Simplified boolean algebra
            return [diff, bout];
        }
    },

    // --- DATA PROCESSING ---
    {
        id: 'MUX_2_1', name: '2-to-1 MUX (多工器)', category: 'Data', description: '根據選擇線 S 輸出 I0 或 I1',
        inputs: ['I0', 'I1', 'S'], outputs: ['Y'],
        calculate: ([i0, i1, s]) => [s ? i1 : i0]
    },
    {
        id: 'DEMUX_1_2', name: '1-to-2 DEMUX (解多工器)', category: 'Data', description: '將輸入分配至 O0 或 O1',
        inputs: ['In', 'S'], outputs: ['O0', 'O1'],
        calculate: ([inp, s]) => [s ? 0 : inp, s ? inp : 0]
    },
    {
        id: 'DECODER_2_4', name: '2-to-4 Decoder (解碼器)', category: 'Data', description: '二進制輸入轉換為對應輸出線',
        inputs: ['A', 'B'], outputs: ['D0', 'D1', 'D2', 'D3'],
        calculate: ([a, b]) => {
            const val = (a << 1) | b; // A is MSB
            return [val===0?1:0, val===1?1:0, val===2?1:0, val===3?1:0];
        }
    },
    {
        id: 'ENCODER_4_2', name: '4-to-2 Encoder (優先編碼)', category: 'Data', description: '最高位優先編碼 (D3>D2>D1>D0)',
        inputs: ['D0', 'D1', 'D2', 'D3'], outputs: ['A', 'B', 'V'], // V=Valid
        calculate: ([d0, d1, d2, d3]) => {
            if (d3) return [1, 1, 1];
            if (d2) return [1, 0, 1];
            if (d1) return [0, 1, 1];
            if (d0) return [0, 0, 1];
            return [0, 0, 0];
        }
    },

    // --- ADVANCED (IC) ---
    {
        id: 'BCD_7SEG', name: 'BCD to 7-Seg (IC 7447)', category: 'Advanced', description: '將 BCD 碼轉換為七段顯示器訊號 (共陽極模擬)',
        inputs: ['D', 'C', 'B', 'A'], // 8421
        outputs: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        calculate: ([d, c, b, a]) => {
            const val = d*8 + c*4 + b*2 + a*1;
            // 7-segment map (1 = ON)
            //   a
            // f   b
            //   g
            // e   c
            //   d
            switch(val) {
                case 0: return [1,1,1,1,1,1,0]; // 0
                case 1: return [0,1,1,0,0,0,0]; // 1
                case 2: return [1,1,0,1,1,0,1]; // 2
                case 3: return [1,1,1,1,0,0,1]; // 3
                case 4: return [0,1,1,0,0,1,1]; // 4
                case 5: return [1,0,1,1,0,1,1]; // 5
                case 6: return [1,0,1,1,1,1,1]; // 6
                case 7: return [1,1,1,0,0,0,0]; // 7
                case 8: return [1,1,1,1,1,1,1]; // 8
                case 9: return [1,1,1,1,0,1,1]; // 9
                default: return [0,0,0,0,0,0,0]; // Blank for >9
            }
        }
    }
];

export const LogicGateScreen: React.FC<LogicGateScreenProps> = ({ onBack }) => {
  const [selectedCircuitId, setSelectedCircuitId] = useState<string>('AND');
  const [inputs, setInputs] = useState<number[]>([0, 0, 0, 0]); // Max 4 inputs support
  const [showMenu, setShowMenu] = useState(false);

  const circuit = CIRCUITS.find(c => c.id === selectedCircuitId) || CIRCUITS[0];
  
  // Reset inputs when changing circuit
  const handleSelect = (id: string) => {
      setSelectedCircuitId(id);
      setInputs([0, 0, 0, 0]);
      setShowMenu(false);
  };

  const toggleInput = (index: number) => {
      const newInputs = [...inputs];
      newInputs[index] = newInputs[index] ? 0 : 1;
      setInputs(newInputs);
  };

  const activeInputs = inputs.slice(0, circuit.inputs.length);
  const outputs = circuit.calculate(activeInputs);

  // Group circuits by category
  const categories = ['Basic', 'Arithmetic', 'Data', 'Advanced'];

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col">
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-4 pt-safe shadow-sm flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
            </button>
            <h1 className="font-bold text-lg text-gray-800 dark:text-white">數位邏輯實驗室</h1>
        </div>
        <button 
            onClick={() => setShowMenu(!showMenu)}
            className={`p-2 rounded-full transition-colors ${showMenu ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
        >
            <List size={20} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
          
          {/* Sidebar Menu (Overlay on Mobile, Side on Desktop) */}
          <div className={`
              absolute inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-10 transform transition-transform duration-300
              ${showMenu ? 'translate-x-0' : '-translate-x-full'}
          `}>
              <div className="p-4 h-full overflow-y-auto">
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">選擇電路模組</h2>
                  {categories.map(cat => (
                      <div key={cat} className="mb-6">
                          <h3 className="text-sm font-black text-indigo-600 dark:text-indigo-400 mb-2 px-2">{cat} Logic</h3>
                          <div className="space-y-1">
                              {CIRCUITS.filter(c => c.category === cat).map(c => (
                                  <button
                                      key={c.id}
                                      onClick={() => handleSelect(c.id)}
                                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCircuitId === c.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                  >
                                      {c.name}
                                  </button>
                              ))}
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col p-6 overflow-y-auto w-full" onClick={() => showMenu && setShowMenu(false)}>
              
              {/* Circuit Info Card */}
              <div className="mb-8 text-center animate-in fade-in">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-2">
                      <Cpu size={12} /> {circuit.category}
                  </div>
                  <h2 className="text-3xl font-black text-gray-800 dark:text-white mb-2">{circuit.name}</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{circuit.description}</p>
              </div>

              {/* Visualizer */}
              <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 min-h-[300px]">
                  
                  {/* Inputs Column */}
                  <div className="flex flex-col gap-4 items-end">
                      {circuit.inputs.map((label, idx) => (
                          <div key={idx} className="flex items-center gap-3 animate-in slide-in-from-left duration-300" style={{animationDelay: `${idx*100}ms`}}>
                              <span className="text-sm font-bold font-mono text-gray-500 dark:text-gray-400">{label}</span>
                              <button 
                                  onClick={() => toggleInput(idx)}
                                  className={`w-16 h-8 rounded-full p-1 transition-all duration-300 flex items-center ${inputs[idx] ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] justify-end' : 'bg-gray-300 dark:bg-gray-700 justify-start'}`}
                              >
                                  <div className="w-6 h-6 bg-white rounded-full shadow-sm flex items-center justify-center text-xs font-bold text-gray-800">
                                      {inputs[idx]}
                                  </div>
                              </button>
                          </div>
                      ))}
                  </div>

                  {/* Central Processing Block */}
                  <div className="relative w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-gray-800 to-black rounded-2xl flex items-center justify-center shadow-2xl border border-gray-700 z-0">
                      {/* Wires In */}
                      <div className="absolute -left-8 top-0 h-full flex flex-col justify-center gap-4">
                          {circuit.inputs.map((_, idx) => (
                              <div key={idx} className={`w-8 h-1 transition-colors ${inputs[idx] ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]' : 'bg-gray-700'}`}></div>
                          ))}
                      </div>
                      
                      {/* Logic Icon */}
                      <Cpu size={48} className="text-gray-600" />
                      <div className="absolute bottom-2 text-[10px] text-gray-500 font-mono font-bold tracking-widest">IC-74XX</div>

                      {/* Wires Out */}
                      <div className="absolute -right-8 top-0 h-full flex flex-col justify-center gap-4">
                          {circuit.outputs.map((_, idx) => (
                              <div key={idx} className={`w-8 h-1 transition-colors ${outputs[idx] ? 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]' : 'bg-gray-700'}`}></div>
                          ))}
                      </div>
                  </div>

                  {/* Outputs Column */}
                  <div className="flex flex-col gap-4 items-start">
                      {/* Special 7-Segment Display for BCD */}
                      {circuit.id === 'BCD_7SEG' ? (
                          <div className="bg-black p-4 rounded-lg border-4 border-gray-700 shadow-inner">
                              {/* 7 Segment SVG */}
                              <svg width="60" height="100" viewBox="0 0 60 100" className="drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]">
                                  {/* a */}
                                  <path d="M 10 10 L 50 10 L 45 15 L 15 15 Z" fill={outputs[0] ? '#ff0000' : '#330000'} />
                                  {/* b */}
                                  <path d="M 50 10 L 55 15 L 55 45 L 50 50 L 45 45 L 45 15 Z" fill={outputs[1] ? '#ff0000' : '#330000'} />
                                  {/* c */}
                                  <path d="M 50 50 L 55 55 L 55 85 L 50 90 L 45 85 L 45 55 Z" fill={outputs[2] ? '#ff0000' : '#330000'} />
                                  {/* d */}
                                  <path d="M 10 90 L 50 90 L 45 85 L 15 85 Z" fill={outputs[3] ? '#ff0000' : '#330000'} />
                                  {/* e */}
                                  <path d="M 10 50 L 15 55 L 15 85 L 10 90 L 5 85 L 5 55 Z" fill={outputs[4] ? '#ff0000' : '#330000'} />
                                  {/* f */}
                                  <path d="M 10 10 L 15 15 L 15 45 L 10 50 L 5 45 L 5 15 Z" fill={outputs[5] ? '#ff0000' : '#330000'} />
                                  {/* g */}
                                  <path d="M 10 50 L 50 50 L 45 55 L 15 55 L 15 45 L 45 45 Z" fill={outputs[6] ? '#ff0000' : '#330000'} />
                              </svg>
                          </div>
                      ) : (
                          circuit.outputs.map((label, idx) => (
                              <div key={idx} className="flex items-center gap-3 animate-in slide-in-from-right duration-300" style={{animationDelay: `${idx*100}ms`}}>
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${outputs[idx] ? 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.6)] scale-110' : 'bg-gray-200 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700'}`}>
                                      <Lightbulb size={20} className={outputs[idx] ? 'text-white fill-white' : 'text-gray-400'} />
                                  </div>
                                  <div>
                                      <div className="text-xl font-black font-mono text-gray-800 dark:text-white leading-none mb-1">{outputs[idx]}</div>
                                      <span className="text-xs font-bold text-gray-400">{label}</span>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>

              </div>

              {/* Truth Table Mini View */}
              <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-2 text-xs font-bold text-center text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Current State Logic
                  </div>
                  <div className="flex divide-x divide-gray-200 dark:divide-gray-700">
                      <div className="flex-1 p-3 flex justify-center gap-2 bg-green-50/50 dark:bg-green-900/10">
                          {circuit.inputs.map((l, i) => (
                              <div key={l} className="text-center">
                                  <div className="text-[10px] text-gray-400 mb-1">{l}</div>
                                  <div className={`font-mono font-bold ${inputs[i] ? 'text-green-600' : 'text-gray-400'}`}>{inputs[i]}</div>
                              </div>
                          ))}
                      </div>
                      <div className="p-3 flex items-center text-gray-400">
                          <ChevronsRight size={16} />
                      </div>
                      <div className="flex-1 p-3 flex justify-center gap-2 bg-blue-50/50 dark:bg-blue-900/10">
                          {circuit.outputs.map((l, i) => (
                              <div key={l} className="text-center">
                                  <div className="text-[10px] text-gray-400 mb-1">{l}</div>
                                  <div className={`font-mono font-bold ${outputs[i] ? 'text-blue-600' : 'text-gray-400'}`}>{outputs[i]}</div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

          </div>
      </div>
    </div>
  );
};

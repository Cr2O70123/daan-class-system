
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, List, ZoomIn, ZoomOut, Maximize, Layers, Cpu, Activity, RotateCw, Move, Lightbulb } from 'lucide-react';

interface LogicGateScreenProps {
  onBack: () => void;
}

// --- Logic & Types ---

type CircuitDef = {
    id: string;
    name: string;
    category: 'Basic' | 'Arithmetic' | 'Data' | 'Advanced';
    description: string;
    inputs: string[];
    outputs: string[];
    calculate: (inputs: number[]) => number[];
    // SVG Renderers for different modes
    renderGate?: (inputs: number[], outputs: number[]) => React.ReactNode;
};

// --- Circuit Definitions ---

const CIRCUITS: CircuitDef[] = [
    // --- BASIC GATES ---
    {
        id: 'AND', name: 'AND Gate', category: 'Basic', description: '所有輸入為 1 時輸出 1',
        inputs: ['A', 'B'], outputs: ['Y'],
        calculate: ([a, b]) => [a & b],
        renderGate: (i, o) => <GateSymbol type="AND" />
    },
    {
        id: 'OR', name: 'OR Gate', category: 'Basic', description: '任一輸入為 1 時輸出 1',
        inputs: ['A', 'B'], outputs: ['Y'],
        calculate: ([a, b]) => [a | b],
        renderGate: (i, o) => <GateSymbol type="OR" />
    },
    {
        id: 'NOT', name: 'NOT Gate', category: 'Basic', description: '反轉輸入訊號',
        inputs: ['A'], outputs: ['Y'],
        calculate: ([a]) => [a ? 0 : 1],
        renderGate: (i, o) => <GateSymbol type="NOT" />
    },
    {
        id: 'NAND', name: 'NAND Gate', category: 'Basic', description: 'AND 的反向',
        inputs: ['A', 'B'], outputs: ['Y'],
        calculate: ([a, b]) => [!(a & b) ? 1 : 0],
        renderGate: (i, o) => <GateSymbol type="NAND" />
    },
    {
        id: 'XOR', name: 'XOR Gate', category: 'Basic', description: '輸入不同時輸出 1',
        inputs: ['A', 'B'], outputs: ['Y'],
        calculate: ([a, b]) => [a ^ b],
        renderGate: (i, o) => <GateSymbol type="XOR" />
    },

    // --- ARITHMETIC ---
    {
        id: 'HALF_ADD', name: 'Half Adder (半加器)', category: 'Arithmetic', description: '兩個位元加法，輸出 Sum 與 Carry',
        inputs: ['A', 'B'], outputs: ['Sum', 'Cout'],
        calculate: ([a, b]) => [a ^ b, a & b],
        renderGate: (i, o) => (
            <svg viewBox="0 0 200 150" className="w-full h-full">
                {/* Wires */}
                <path d="M 20 40 L 60 40 L 60 100 L 100 100" stroke="#555" fill="none" strokeWidth="2" /> {/* B to AND */}
                <path d="M 20 20 L 80 20 L 80 80 L 100 80" stroke="#555" fill="none" strokeWidth="2" /> {/* A to AND */}
                <path d="M 60 40 L 100 40" stroke="#555" fill="none" strokeWidth="2" /> {/* B to XOR */}
                <path d="M 80 20 L 100 20" stroke="#555" fill="none" strokeWidth="2" /> {/* A to XOR */}
                
                {/* Gates */}
                <g transform="translate(100, 10)"><GateSymbol type="XOR" size={0.6}/></g>
                <g transform="translate(100, 70)"><GateSymbol type="AND" size={0.6}/></g>
                
                {/* Out Wires */}
                <path d="M 160 35 L 180 35" stroke={o[0] ? '#3b82f6' : '#555'} strokeWidth="3" />
                <path d="M 160 95 L 180 95" stroke={o[1] ? '#3b82f6' : '#555'} strokeWidth="3" />
                
                {/* Labels */}
                <text x="185" y="40" fontSize="10" fill="#fff">S</text>
                <text x="185" y="100" fontSize="10" fill="#fff">C</text>
            </svg>
        )
    },
    {
        id: 'FULL_ADD', name: 'Full Adder (全加器)', category: 'Arithmetic', description: '包含進位輸入的三位元加法',
        inputs: ['Cin', 'A', 'B'], outputs: ['Sum', 'Cout'],
        calculate: ([cin, a, b]) => {
            const sum = a ^ b ^ cin;
            const cout = (a & b) | (cin & (a ^ b));
            return [sum, cout];
        }
    },
    {
        id: 'COMPARATOR_2BIT', name: '2-Bit Comparator', category: 'Arithmetic', description: '比較兩個 2 位元數字 A 與 B',
        inputs: ['A1', 'A0', 'B1', 'B0'], outputs: ['A>B', 'A=B', 'A<B'],
        calculate: ([a1, a0, b1, b0]) => {
            const A = a1 * 2 + a0;
            const B = b1 * 2 + b0;
            return [A > B ? 1 : 0, A === B ? 1 : 0, A < B ? 1 : 0];
        }
    },

    // --- DATA PROCESSING ---
    {
        id: 'MUX_2_1', name: '2-to-1 MUX', category: 'Data', description: '數據選擇器：根據 S 選擇 I0 或 I1',
        inputs: ['I0', 'I1', 'S'], outputs: ['Y'],
        calculate: ([i0, i1, s]) => [s ? i1 : i0],
        renderGate: (i, o) => (
            <svg viewBox="0 0 200 150" className="w-full h-full">
                {/* Logic: (I0 AND NOT S) OR (I1 AND S) */}
                <g transform="translate(40, 10)"><GateSymbol type="NOT" size={0.3}/></g> {/* NOT S */}
                <g transform="translate(80, -10)"><GateSymbol type="AND" size={0.4}/></g> {/* Top AND */}
                <g transform="translate(80, 50)"><GateSymbol type="AND" size={0.4}/></g> {/* Bot AND */}
                <g transform="translate(140, 20)"><GateSymbol type="OR" size={0.4}/></g>  {/* OR */}
                
                {/* Wires (Simplified) */}
                <path d="M 10 20 L 80 20" stroke="#555" strokeWidth="1"/> {/* I0 */}
                <path d="M 10 80 L 80 80" stroke="#555" strokeWidth="1"/> {/* I1 */}
                <path d="M 10 50 L 40 50" stroke="#555" strokeWidth="1"/> {/* S */}
                <path d="M 120 10 L 140 35" stroke="#555" strokeWidth="1"/>
                <path d="M 120 70 L 140 45" stroke="#555" strokeWidth="1"/>
                <path d="M 180 40 L 190 40" stroke={o[0] ? '#3b82f6' : '#555'} strokeWidth="2"/>
            </svg>
        )
    },
    {
        id: 'DECODER_3_8', name: '3-to-8 Decoder', category: 'Data', description: '將 3 位元二進制解碼為 8 條輸出線',
        inputs: ['A2', 'A1', 'A0'], 
        outputs: ['Y0', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7'],
        calculate: ([a2, a1, a0]) => {
            const val = a2*4 + a1*2 + a0;
            const out = Array(8).fill(0);
            out[val] = 1;
            return out;
        }
    },
    {
        id: 'MAJORITY', name: 'Majority Function', category: 'Advanced', description: '當過半數輸入為 1 時輸出 1',
        inputs: ['A', 'B', 'C'], outputs: ['Y'],
        calculate: ([a, b, c]) => [(a+b+c) >= 2 ? 1 : 0]
    },
    {
        id: 'BCD_7SEG', name: 'BCD to 7-Seg', category: 'Advanced', description: 'BCD 轉七段顯示器 (IC 7447)',
        inputs: ['D', 'C', 'B', 'A'], // 8421
        outputs: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        calculate: ([d, c, b, a]) => {
            const val = d*8 + c*4 + b*2 + a*1;
            // 7-segment map (1 = ON)
            switch(val) {
                case 0: return [1,1,1,1,1,1,0]; 
                case 1: return [0,1,1,0,0,0,0]; 
                case 2: return [1,1,0,1,1,0,1]; 
                case 3: return [1,1,1,1,0,0,1]; 
                case 4: return [0,1,1,0,0,1,1]; 
                case 5: return [1,0,1,1,0,1,1]; 
                case 6: return [1,0,1,1,1,1,1]; 
                case 7: return [1,1,1,0,0,0,0]; 
                case 8: return [1,1,1,1,1,1,1]; 
                case 9: return [1,1,1,1,0,1,1]; 
                default: return [0,0,0,0,0,0,0]; 
            }
        }
    }
];

// --- Helper Components ---

const GateSymbol = ({ type, size = 1 }: { type: string, size?: number }) => {
    const s = size; 
    // Standard IEEE Shapes (Approx)
    return (
        <g transform={`scale(${s})`}>
            {type === 'AND' && (
                <path d="M 10 10 L 50 10 Q 90 10 90 50 Q 90 90 50 90 L 10 90 Z" fill="#1f2937" stroke="#9ca3af" strokeWidth="2" />
            )}
            {type === 'OR' && (
                <path d="M 10 10 Q 40 50 10 90 Q 90 90 100 50 Q 90 10 10 10 Z" fill="#1f2937" stroke="#9ca3af" strokeWidth="2" />
            )}
            {type === 'NOT' && (
                <>
                    <path d="M 10 10 L 70 50 L 10 90 Z" fill="#1f2937" stroke="#9ca3af" strokeWidth="2" />
                    <circle cx="76" cy="50" r="6" fill="#1f2937" stroke="#9ca3af" strokeWidth="2" />
                </>
            )}
            {type === 'NAND' && (
                <>
                    <path d="M 10 10 L 50 10 Q 90 10 90 50 Q 90 90 50 90 L 10 90 Z" fill="#1f2937" stroke="#9ca3af" strokeWidth="2" />
                    <circle cx="96" cy="50" r="6" fill="#1f2937" stroke="#9ca3af" strokeWidth="2" />
                </>
            )}
            {type === 'XOR' && (
                <>
                    <path d="M 20 10 Q 50 50 20 90 Q 100 90 110 50 Q 100 10 20 10 Z" fill="#1f2937" stroke="#9ca3af" strokeWidth="2" />
                    <path d="M 5 10 Q 35 50 5 90" fill="none" stroke="#9ca3af" strokeWidth="2" />
                </>
            )}
            {/* Pins */}
            {type !== 'NOT' && (
                <>
                    <line x1="0" y1="25" x2="10" y2="25" stroke="#6b7280" strokeWidth="2" />
                    <line x1="0" y1="75" x2="10" y2="75" stroke="#6b7280" strokeWidth="2" />
                </>
            )}
            {type === 'NOT' && <line x1="0" y1="50" x2="10" y2="50" stroke="#6b7280" strokeWidth="2" />}
            <line x1={type.includes('N') ? '102' : type === 'XOR' ? '110' : '90'} y1="50" x2={type === 'XOR' ? '120' : '100'} y2="50" stroke="#6b7280" strokeWidth="2" />
        </g>
    );
};

// --- Main Screen Component ---

export const LogicGateScreen: React.FC<LogicGateScreenProps> = ({ onBack }) => {
  const [selectedCircuitId, setSelectedCircuitId] = useState<string>('AND');
  const [inputs, setInputs] = useState<number[]>([0, 0, 0, 0]); 
  const [showMenu, setShowMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'IC' | 'GATE'>('IC');
  const [scale, setScale] = useState(1);
  const [isLandscape, setIsLandscape] = useState(false);

  const circuit = CIRCUITS.find(c => c.id === selectedCircuitId) || CIRCUITS[0];
  const activeInputs = inputs.slice(0, circuit.inputs.length);
  const outputs = circuit.calculate(activeInputs);

  // Pan & Zoom state
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = (id: string) => {
      setSelectedCircuitId(id);
      setInputs([0, 0, 0, 0]);
      setShowMenu(false);
      setScale(1); // Reset zoom
  };

  const toggleInput = (index: number) => {
      const newInputs = [...inputs];
      newInputs[index] = newInputs[index] ? 0 : 1;
      setInputs(newInputs);
  };

  const categories = ['Basic', 'Arithmetic', 'Data', 'Advanced'];

  return (
    <div className={`fixed inset-0 z-50 bg-gray-900 flex flex-col ${isLandscape ? 'rotate-0 md:rotate-0' : ''}`}>
      
      {/* Header */}
      <div className="bg-gray-800 p-4 pt-safe shadow-md flex items-center justify-between z-20 border-b border-gray-700">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-700 rounded-full transition-colors">
                <ArrowLeft size={20} className="text-gray-300" />
            </button>
            <div className="flex flex-col">
                <h1 className="font-bold text-base text-white leading-none">{circuit.name}</h1>
                <span className="text-[10px] text-gray-400 mt-1">{circuit.category}</span>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => setIsLandscape(!isLandscape)} className="p-2 bg-gray-700 rounded-full text-gray-300 hidden md:flex">
                <RotateCw size={18} />
            </button>
            <button 
                onClick={() => setViewMode(viewMode === 'IC' ? 'GATE' : 'IC')}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all"
            >
                {viewMode === 'IC' ? <Cpu size={14} /> : <Activity size={14} />}
                {viewMode === 'IC' ? 'IC 視圖' : '邏輯閘'}
            </button>
            <button 
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 bg-gray-700 rounded-full text-white hover:bg-gray-600"
            >
                <List size={20} />
            </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
          
          {/* Sidebar Menu (Drawer) */}
          <div className={`
              absolute inset-y-0 right-0 w-64 bg-gray-800 border-l border-gray-700 z-30 transform transition-transform duration-300 shadow-2xl
              ${showMenu ? 'translate-x-0' : 'translate-x-full'}
          `}>
              <div className="p-4 h-full overflow-y-auto">
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">選擇電路模組</h2>
                  {categories.map(cat => (
                      <div key={cat} className="mb-4">
                          <h3 className="text-sm font-bold text-indigo-400 mb-2 px-2">{cat}</h3>
                          <div className="space-y-1">
                              {CIRCUITS.filter(c => c.category === cat).map(c => (
                                  <button
                                      key={c.id}
                                      onClick={() => handleSelect(c.id)}
                                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedCircuitId === c.id ? 'bg-indigo-900/50 text-white border border-indigo-500/50' : 'text-gray-400 hover:bg-gray-700'}`}
                                  >
                                      {c.name}
                                  </button>
                              ))}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
          {showMenu && <div className="absolute inset-0 bg-black/50 z-20" onClick={() => setShowMenu(false)}></div>}

          {/* Main Workspace (Flex Row for 3 Columns) */}
          <div className="flex-1 flex flex-row h-full relative bg-[#0f1117]">
              
              {/* 1. Inputs Column (Scrollable) */}
              <div className="w-20 md:w-24 bg-gray-800/50 border-r border-gray-800 flex flex-col items-center py-6 overflow-y-auto z-10 shadow-xl gap-4">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Inputs</div>
                  {circuit.inputs.map((label, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1 animate-in slide-in-from-left duration-300" style={{animationDelay: `${idx*50}ms`}}>
                          <button 
                              onClick={() => toggleInput(idx)}
                              className={`w-12 h-16 rounded-lg border-b-4 active:border-b-0 active:translate-y-1 transition-all flex flex-col items-center justify-center gap-2 ${inputs[idx] ? 'bg-green-600 border-green-800 shadow-[0_0_15px_rgba(22,163,74,0.4)]' : 'bg-gray-700 border-gray-900'}`}
                          >
                              <div className={`w-2 h-2 rounded-full ${inputs[idx] ? 'bg-white animate-pulse' : 'bg-gray-900'}`}></div>
                              <span className="text-xl font-black text-white font-mono">{inputs[idx]}</span>
                          </button>
                          <span className="text-xs font-bold text-gray-400 font-mono">{label}</span>
                      </div>
                  ))}
              </div>

              {/* 2. Central Visualizer (Pan & Zoom Canvas) */}
              <div className="flex-1 relative overflow-hidden cursor-move" ref={containerRef}>
                  {/* Background Grid */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none" 
                       style={{ 
                           backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', 
                           backgroundSize: '20px 20px' 
                       }}
                  ></div>

                  {/* Controls Overlay */}
                  <div className="absolute bottom-4 left-4 flex gap-2 z-10">
                      <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700 border border-gray-700"><ZoomOut size={18}/></button>
                      <div className="bg-gray-800 px-3 py-2 rounded-lg text-xs text-gray-300 font-mono border border-gray-700">{Math.round(scale * 100)}%</div>
                      <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700 border border-gray-700"><ZoomIn size={18}/></button>
                      <button onClick={() => setScale(1)} className="p-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700 border border-gray-700"><Maximize size={18}/></button>
                  </div>

                  {/* The Circuit Content - Centered & Scaled */}
                  <div className="w-full h-full flex items-center justify-center overflow-auto p-10">
                      <div 
                        className="transition-transform duration-200 ease-out origin-center"
                        style={{ transform: `scale(${scale})` }}
                      >
                          {viewMode === 'GATE' && circuit.renderGate ? (
                              /* GATE VIEW */
                              <div className="w-[400px] h-[300px] bg-gray-800 rounded-xl border-2 border-gray-700 p-6 relative shadow-2xl">
                                  <div className="absolute top-2 left-2 text-[10px] text-gray-500 font-mono">LOGIC DIAGRAM</div>
                                  {circuit.renderGate(activeInputs, outputs)}
                              </div>
                          ) : (
                              /* IC VIEW (Black Box) */
                              <div className="w-64 h-64 bg-gradient-to-br from-gray-800 to-black rounded-xl border-2 border-gray-700 shadow-2xl relative flex items-center justify-center">
                                  {/* Screws */}
                                  <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-gray-700 flex items-center justify-center"><div className="w-3 h-0.5 bg-black rotate-45"></div></div>
                                  <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-gray-700 flex items-center justify-center"><div className="w-3 h-0.5 bg-black rotate-45"></div></div>
                                  <div className="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-gray-700 flex items-center justify-center"><div className="w-3 h-0.5 bg-black rotate-45"></div></div>
                                  <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-gray-700 flex items-center justify-center"><div className="w-3 h-0.5 bg-black rotate-45"></div></div>

                                  {/* Wires In (Left) */}
                                  <div className="absolute -left-8 h-full flex flex-col justify-center gap-6 py-8">
                                      {circuit.inputs.map((_, idx) => (
                                          <div key={idx} className="flex items-center">
                                              <div className={`w-8 h-1 ${inputs[idx] ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-gray-600'}`}></div>
                                              <div className="w-2 h-2 rounded-full bg-gray-500 -ml-1"></div>
                                          </div>
                                      ))}
                                  </div>

                                  {/* Wires Out (Right) */}
                                  <div className="absolute -right-8 h-full flex flex-col justify-center gap-6 py-8">
                                      {circuit.outputs.map((_, idx) => (
                                          <div key={idx} className="flex items-center justify-end">
                                              <div className="w-2 h-2 rounded-full bg-gray-500 -mr-1"></div>
                                              <div className={`w-8 h-1 ${outputs[idx] ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-gray-600'}`}></div>
                                          </div>
                                      ))}
                                  </div>

                                  {/* IC Label */}
                                  <div className="text-center">
                                      <Cpu size={48} className="text-gray-600 mx-auto mb-2" />
                                      <div className="text-2xl font-black text-white tracking-widest font-mono">{circuit.name.split(' ')[0]}</div>
                                      <div className="text-xs text-gray-500 font-mono mt-1">74LSXX SERIES</div>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              {/* 3. Outputs Column (Scrollable) */}
              <div className="w-20 md:w-24 bg-gray-800/50 border-l border-gray-800 flex flex-col items-center py-6 overflow-y-auto z-10 shadow-xl gap-4">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Outputs</div>
                  
                  {/* Special Display for 7-Segment */}
                  {circuit.id === 'BCD_7SEG' ? (
                      <div className="bg-black p-2 rounded border border-gray-700 mb-4">
                          <svg width="40" height="60" viewBox="0 0 60 100">
                              <path d="M 10 10 L 50 10 L 45 15 L 15 15 Z" fill={outputs[0] ? '#ff0000' : '#330000'} />
                              <path d="M 50 10 L 55 15 L 55 45 L 50 50 L 45 45 L 45 15 Z" fill={outputs[1] ? '#ff0000' : '#330000'} />
                              <path d="M 50 50 L 55 55 L 55 85 L 50 90 L 45 85 L 45 55 Z" fill={outputs[2] ? '#ff0000' : '#330000'} />
                              <path d="M 10 90 L 50 90 L 45 85 L 15 85 Z" fill={outputs[3] ? '#ff0000' : '#330000'} />
                              <path d="M 10 50 L 15 55 L 15 85 L 10 90 L 5 85 L 5 55 Z" fill={outputs[4] ? '#ff0000' : '#330000'} />
                              <path d="M 10 10 L 15 15 L 15 45 L 10 50 L 5 45 L 5 15 Z" fill={outputs[5] ? '#ff0000' : '#330000'} />
                              <path d="M 10 50 L 50 50 L 45 55 L 15 55 L 15 45 L 45 45 Z" fill={outputs[6] ? '#ff0000' : '#330000'} />
                          </svg>
                      </div>
                  ) : (
                      circuit.outputs.map((label, idx) => (
                          <div key={idx} className="flex flex-col items-center gap-1 animate-in slide-in-from-right duration-300" style={{animationDelay: `${idx*50}ms`}}>
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${outputs[idx] ? 'bg-blue-500 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.6)] scale-110' : 'bg-gray-800 border-gray-700'}`}>
                                  <Lightbulb size={20} className={outputs[idx] ? 'text-white fill-white' : 'text-gray-600'} />
                              </div>
                              <div className="text-center">
                                  <div className="text-lg font-black text-white font-mono leading-none">{outputs[idx]}</div>
                                  <span className="text-[10px] font-bold text-gray-400 font-mono">{label}</span>
                              </div>
                          </div>
                      ))
                  )}
              </div>

          </div>
      </div>
    </div>
  );
};

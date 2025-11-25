
import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Trophy, Crown, Grid3X3, Zap } from 'lucide-react';
import { User, GameResult } from '../types';
import { submitGameScore } from '../services/dataService';

// --- Constants & Types ---
const BOARD_SIZE = 8;

// Different colors for different visual flair
const BLOCK_COLORS = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-400', 
    'bg-green-500', 'bg-emerald-400', 'bg-teal-500', 
    'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500'
];

type Shape = {
    matrix: number[][]; // 1 for block, 0 for empty
    id: string;
    color: string;
};

// Define shapes (matrices)
const SHAPE_DEFINITIONS: number[][][] = [
    [[1]], // Dot
    [[1, 1]], // H-Line 2
    [[1], [1]], // V-Line 2
    [[1, 1, 1]], // H-Line 3
    [[1], [1], [1]], // V-Line 3
    [[1, 1, 1, 1]], // H-Line 4
    [[1], [1], [1], [1]], // V-Line 4
    [[1, 1], [1, 1]], // Square 2x2
    [[1, 1, 1], [1, 1, 1], [1, 1, 1]], // Square 3x3
    [[1, 1, 0], [0, 1, 1]], // Z
    [[0, 1, 1], [1, 1, 0]], // S
    [[1, 1, 1], [0, 1, 0]], // T
    [[1, 0], [1, 0], [1, 1]], // L
    [[0, 1], [0, 1], [1, 1]], // J
    [[1, 1], [1, 0]], // Small L
];

interface BlockBlastScreenProps {
  user: User;
  onBack: () => void;
  onFinish: (result: GameResult) => void;
  onUpdateHearts: (hearts: number) => void;
}

// Sound Helper
const playSound = (type: 'place' | 'clear' | 'gameover' | 'select' | 'combo') => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;

        switch(type) {
            case 'select':
                osc.frequency.setValueAtTime(400, now);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
                break;
            case 'place':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'clear':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;
            case 'combo':
                osc.type = 'square';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
                osc.frequency.setValueAtTime(1200, now + 0.1); // Arpeggio effect
                osc.frequency.exponentialRampToValueAtTime(1800, now + 0.4);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;
            case 'gameover':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(50, now + 1);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0, now + 1);
                osc.start(now);
                osc.stop(now + 1);
                break;
        }
    } catch(e) {}
};

export const BlockBlastScreen: React.FC<BlockBlastScreenProps> = ({ user, onBack, onFinish, onUpdateHearts }) => {
    // --- State ---
    const [grid, setGrid] = useState<(string | null)[][]>(
        Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
    );
    const [score, setScore] = useState(0);
    const [dockShapes, setDockShapes] = useState<(Shape | null)[]>([null, null, null]);
    const [selectedShapeIndex, setSelectedShapeIndex] = useState<number | null>(null);
    const [gameOver, setGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    
    // Animation States
    const [clearingRows, setClearingRows] = useState<number[]>([]);
    const [clearingCols, setClearingCols] = useState<number[]>([]);
    const [comboCount, setComboCount] = useState(0);

    // --- Helpers ---
    
    const generateNewShapes = () => {
        const newShapes: Shape[] = [];
        for (let i = 0; i < 3; i++) {
            const def = SHAPE_DEFINITIONS[Math.floor(Math.random() * SHAPE_DEFINITIONS.length)];
            const color = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
            newShapes.push({
                matrix: def,
                id: Math.random().toString(36).substr(2, 9),
                color
            });
        }
        return newShapes;
    };

    const startGame = () => {
        if (user.hearts <= 0) {
            alert("今日遊玩次數已達上限！");
            return;
        }
        onUpdateHearts(user.hearts - 1);
        
        setGrid(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
        setScore(0);
        setComboCount(0);
        setGameOver(false);
        setGameStarted(true);
        setDockShapes(generateNewShapes());
        setSelectedShapeIndex(null);
    };

    const checkGameOver = useCallback((currentGrid: (string | null)[][], currentDock: (Shape | null)[]) => {
        // If all shapes used, not game over (will regenerate)
        const availableShapes = currentDock.filter(s => s !== null);
        if (availableShapes.length === 0) return false;

        // Check if ANY available shape fits ANYWHERE
        for (const shape of availableShapes) {
            if (!shape) continue;
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    if (canPlace(currentGrid, shape.matrix, r, c)) {
                        return false; // Found a valid move
                    }
                }
            }
        }
        return true; // No moves left
    }, []);

    const canPlace = (currentGrid: (string | null)[][], matrix: number[][], r: number, c: number) => {
        for (let i = 0; i < matrix.length; i++) {
            for (let j = 0; j < matrix[i].length; j++) {
                if (matrix[i][j] === 1) {
                    const newR = r + i;
                    const newC = c + j;
                    // Check bounds
                    if (newR >= BOARD_SIZE || newC >= BOARD_SIZE) return false;
                    // Check overlap
                    if (currentGrid[newR][newC] !== null) return false;
                }
            }
        }
        return true;
    };

    const handleGridClick = async (r: number, c: number) => {
        if (selectedShapeIndex === null || gameOver) return;
        
        const shape = dockShapes[selectedShapeIndex];
        if (!shape) return;

        if (canPlace(grid, shape.matrix, r, c)) {
            // 1. Place logic
            playSound('place');
            const newGrid = grid.map(row => [...row]);
            let blocksPlaced = 0;

            for (let i = 0; i < shape.matrix.length; i++) {
                for (let j = 0; j < shape.matrix[i].length; j++) {
                    if (shape.matrix[i][j] === 1) {
                        newGrid[r + i][c + j] = shape.color;
                        blocksPlaced++;
                    }
                }
            }

            // Update dock
            const newDock = [...dockShapes];
            newDock[selectedShapeIndex] = null;
            setDockShapes(newDock);
            setSelectedShapeIndex(null);

            // 2. Check Lines
            const rowsToClear: number[] = [];
            const colsToClear: number[] = [];

            // Check Rows
            for (let i = 0; i < BOARD_SIZE; i++) {
                if (newGrid[i].every(cell => cell !== null)) rowsToClear.push(i);
            }
            // Check Cols
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (newGrid.every(row => row[j] !== null)) colsToClear.push(j);
            }

            const linesCleared = rowsToClear.length + colsToClear.length;
            
            // Score Calculation
            let moveScore = blocksPlaced; // +1 per block placed
            if (linesCleared > 0) {
                // Combo logic
                const newCombo = comboCount + 1;
                setComboCount(newCombo);
                moveScore += (linesCleared * 10) * newCombo; // 10 points per line * combo
                
                // Trigger animation
                setClearingRows(rowsToClear);
                setClearingCols(colsToClear);
                playSound(linesCleared > 1 || newCombo > 1 ? 'combo' : 'clear');

                // Wait for animation then clear
                setTimeout(() => {
                    const finalGrid = newGrid.map(row => [...row]);
                    
                    rowsToClear.forEach(rowIndex => {
                        for(let c=0; c<BOARD_SIZE; c++) finalGrid[rowIndex][c] = null;
                    });
                    colsToClear.forEach(colIndex => {
                        for(let r=0; r<BOARD_SIZE; r++) finalGrid[r][colIndex] = null;
                    });

                    setGrid(finalGrid);
                    setClearingRows([]);
                    setClearingCols([]);
                    
                    // Regenerate shapes if empty
                    let nextDock = newDock;
                    if (newDock.every(s => s === null)) {
                        nextDock = generateNewShapes();
                        setDockShapes(nextDock);
                    }
                    
                    // Check Game Over after clearing
                    if (checkGameOver(finalGrid, nextDock)) {
                        handleGameOver(score + moveScore);
                    } else {
                        setScore(prev => prev + moveScore);
                    }

                }, 400); // Animation duration
            } else {
                setComboCount(0);
                setGrid(newGrid);
                
                // Regenerate shapes if empty
                let nextDock = newDock;
                if (newDock.every(s => s === null)) {
                    nextDock = generateNewShapes();
                    setDockShapes(nextDock);
                }

                // Check Game Over without clearing
                if (checkGameOver(newGrid, nextDock)) {
                    handleGameOver(score + moveScore);
                } else {
                    setScore(prev => prev + moveScore);
                }
            }
        } else {
            // Invalid placement visual feedback could go here
        }
    };

    const handleGameOver = (finalScore: number) => {
        playSound('gameover');
        setGameOver(true);
        setScore(finalScore);
    };

    const handleSubmitScore = async () => {
        try {
            await submitGameScore(user, score);
            await onFinish({ score, maxCombo: 0, correctCount: 0 }); // Reuse types loosely
            onBack();
        } catch(e) {
            alert("上傳失敗");
            onBack();
        }
    };

    // --- Render Helpers ---

    // Render a preview of a shape (for dock)
    const renderShapePreview = (shape: Shape, size = 16) => {
        const rows = shape.matrix.length;
        const cols = shape.matrix[0].length;
        return (
            <div 
                style={{ 
                    display: 'grid', 
                    gridTemplateRows: `repeat(${rows}, ${size}px)`,
                    gridTemplateColumns: `repeat(${cols}, ${size}px)`,
                    gap: '2px'
                }}
            >
                {shape.matrix.map((row, r) => 
                    row.map((cell, c) => (
                        <div 
                            key={`${r}-${c}`} 
                            className={`rounded-sm ${cell ? shape.color : 'bg-transparent'}`}
                        ></div>
                    ))
                )}
            </div>
        );
    };

    // --- Main UI ---
    return (
        <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center">
            {/* Header */}
            <div className="w-full bg-gray-800 p-4 pt-safe flex justify-between items-center shadow-lg z-10">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-700 text-gray-300">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">SCORE</span>
                    <span className="text-2xl font-black text-white font-mono leading-none">{score}</span>
                </div>
                <div className="w-8">
                     {/* Placeholder for balance */}
                </div>
            </div>

            {!gameStarted ? (
                // --- Start Menu ---
                <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 w-full max-w-sm">
                    <div className="text-center space-y-2 animate-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-6 rotate-3 hover:rotate-6 transition-transform">
                            <Grid3X3 size={48} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-white">Block Blast</h1>
                        <p className="text-gray-400">方塊爆破：無盡消除</p>
                    </div>

                    <div className="bg-gray-800/50 p-6 rounded-2xl w-full border border-gray-700/50 backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <Trophy className="text-yellow-500" size={20} />
                            <span className="font-bold text-gray-200">規則說明</span>
                        </div>
                        <ul className="text-sm text-gray-400 space-y-2 list-disc list-inside">
                            <li>點選下方圖形，再點擊棋盤空格放置。</li>
                            <li>填滿整行或整列即可消除得分。</li>
                            <li>一次消除多行可獲得連擊加分！</li>
                            <li>無法放置任何圖形時遊戲結束。</li>
                        </ul>
                    </div>

                    <div className="w-full space-y-3">
                         <button 
                            onClick={startGame}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2 transition-transform active:scale-95"
                         >
                            <Zap size={20} className="fill-white" />
                            開始遊戲
                        </button>
                        <p className="text-center text-xs text-gray-500 font-medium">
                            消耗 1 愛心 • 剩餘: {user.hearts}
                        </p>
                    </div>
                </div>
            ) : (
                // --- Game Board ---
                <div className="flex-1 w-full max-w-md flex flex-col items-center justify-center p-4 relative">
                    
                    {/* The Grid */}
                    <div 
                        className="bg-gray-800 p-3 rounded-xl shadow-2xl relative"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
                            gap: '4px',
                            width: 'min(90vw, 360px)',
                            aspectRatio: '1/1'
                        }}
                    >
                        {grid.map((row, r) => 
                            row.map((cellColor, c) => {
                                const isClearing = clearingRows.includes(r) || clearingCols.includes(c);
                                return (
                                    <div 
                                        key={`${r}-${c}`}
                                        onClick={() => handleGridClick(r, c)}
                                        className={`
                                            rounded-md transition-all duration-300
                                            ${cellColor ? cellColor : 'bg-gray-700/50'}
                                            ${isClearing ? 'scale-0 opacity-0 bg-white' : 'scale-100 opacity-100'}
                                            ${selectedShapeIndex !== null && !cellColor ? 'cursor-pointer hover:bg-gray-600' : ''}
                                        `}
                                    ></div>
                                );
                            })
                        )}
                        
                        {/* Combo Text Popup */}
                        {comboCount > 1 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                <div className="text-4xl font-black text-yellow-400 drop-shadow-lg animate-bounce">
                                    {comboCount}x COMBO!
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Dock (Shapes) */}
                    <div className="mt-8 w-full flex justify-between items-center px-2 min-h-[100px]">
                        {dockShapes.map((shape, idx) => (
                            <div 
                                key={idx} 
                                className={`
                                    w-[30%] aspect-square flex items-center justify-center rounded-2xl transition-all duration-200
                                    ${shape ? 'bg-gray-800 border-2 shadow-lg cursor-pointer' : 'opacity-0 pointer-events-none'}
                                    ${selectedShapeIndex === idx 
                                        ? 'border-blue-500 bg-gray-700 -translate-y-2 shadow-blue-500/20' 
                                        : 'border-gray-700 hover:bg-gray-700/50'}
                                `}
                                onClick={() => {
                                    if (shape) {
                                        playSound('select');
                                        setSelectedShapeIndex(selectedShapeIndex === idx ? null : idx);
                                    }
                                }}
                            >
                                {shape && renderShapePreview(shape, 12)}
                            </div>
                        ))}
                    </div>

                    <p className="mt-4 text-xs text-gray-500 animate-pulse">
                        {selectedShapeIndex !== null ? '請點擊棋盤空格放置' : '請選擇下方圖形'}
                    </p>

                    {/* Game Over Overlay */}
                    {gameOver && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/90 backdrop-blur-sm rounded-xl">
                            <div className="bg-gray-800 p-8 rounded-3xl text-center shadow-2xl border border-gray-700 w-4/5 animate-in zoom-in">
                                <h2 className="text-2xl font-black text-white mb-2">無法移動!</h2>
                                <div className="text-5xl font-mono font-black text-blue-400 mb-6">{score}</div>
                                
                                <button 
                                    onClick={handleSubmitScore}
                                    className="w-full py-4 bg-white text-gray-900 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"
                                >
                                    <Crown size={20} className="text-yellow-500 fill-current" />
                                    領取獎勵 ({Math.floor(score/10)} PT)
                                </button>
                                <p className="text-xs text-gray-500 mt-3">每 10 分獲得 1 PT</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

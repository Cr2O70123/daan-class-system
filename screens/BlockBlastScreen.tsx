
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Trophy, Crown, Grid3X3, Zap } from 'lucide-react';
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
    const [gameOver, setGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    
    // Animation States
    const [clearingRows, setClearingRows] = useState<number[]>([]);
    const [clearingCols, setClearingCols] = useState<number[]>([]);
    const [comboCount, setComboCount] = useState(0);

    // --- Drag & Drop State ---
    const [draggingShape, setDraggingShape] = useState<{
        index: number;
        shape: Shape;
        x: number;
        y: number;
        // Offset from mouse pointer to shape center/top-left
        offsetX: number; 
        offsetY: number;
    } | null>(null);

    // Refs for coordinate calculation
    const gridRef = useRef<HTMLDivElement>(null);

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
    };

    const checkGameOver = useCallback((currentGrid: (string | null)[][], currentDock: (Shape | null)[]) => {
        const availableShapes = currentDock.filter(s => s !== null);
        if (availableShapes.length === 0) return false;

        // Check if ANY available shape fits ANYWHERE
        for (const shape of availableShapes) {
            if (!shape) continue;
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    if (canPlace(currentGrid, shape.matrix, r, c)) {
                        return false; 
                    }
                }
            }
        }
        return true; 
    }, []);

    const canPlace = (currentGrid: (string | null)[][], matrix: number[][], r: number, c: number) => {
        for (let i = 0; i < matrix.length; i++) {
            for (let j = 0; j < matrix[i].length; j++) {
                if (matrix[i][j] === 1) {
                    const newR = r + i;
                    const newC = c + j;
                    if (newR >= BOARD_SIZE || newC >= BOARD_SIZE) return false;
                    if (currentGrid[newR][newC] !== null) return false;
                }
            }
        }
        return true;
    };

    // --- Drag Logic ---

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent, index: number) => {
        if (gameOver) return;
        e.preventDefault(); // Prevent scroll on touch
        
        const shape = dockShapes[index];
        if (!shape) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        playSound('select');

        setDraggingShape({
            index,
            shape,
            x: clientX,
            y: clientY,
            offsetX: 0, // Simplified: Center on finger later or use drag logic
            offsetY: -50 // Shift up slightly so finger doesn't cover block
        });
    };

    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!draggingShape) return;
            // e.preventDefault(); // Aggressive scroll prevention if needed

            const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

            setDraggingShape(prev => prev ? { ...prev, x: clientX, y: clientY } : null);
        };

        const handleEnd = (e: MouseEvent | TouchEvent) => {
            if (!draggingShape) return;

            // Attempt to drop
            const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
            const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as MouseEvent).clientY;

            attemptDrop(clientX, clientY, draggingShape);
            setDraggingShape(null);
        };

        if (draggingShape) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchmove', handleMove, { passive: false });
            window.addEventListener('touchend', handleEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [draggingShape, grid]);

    const attemptDrop = (x: number, y: number, dragInfo: NonNullable<typeof draggingShape>) => {
        if (!gridRef.current) return;
        const rect = gridRef.current.getBoundingClientRect();
        
        // Calculate cell size
        const cellSize = rect.width / BOARD_SIZE;

        // Calculate drag shape offset (we dragged from center/top, adjust for drop)
        // Adjust for the offset we added visually (-50)
        const adjustedY = y + 50; 

        // Check if inside grid
        if (x < rect.left || x > rect.right || adjustedY < rect.top || adjustedY > rect.bottom) {
            return; // Dropped outside
        }

        // Calculate approximate Row/Col
        // We want to align the top-left block of the shape to the cell under the pointer
        // But usually it feels better if we center the shape under the pointer. 
        // Let's stick to Top-Left logic relative to the pointer for consistency with grid logic,
        // or refine: The pointer is roughly at the center of the dragged shape.
        
        // Approximate the top-left of the shape relative to the pointer
        const shapeWidth = dragInfo.shape.matrix[0].length * cellSize;
        const shapeHeight = dragInfo.shape.matrix.length * cellSize;
        
        const relativeX = (x - rect.left) - (shapeWidth / 2); // Center horizontally
        const relativeY = (adjustedY - rect.top) - (shapeHeight / 2); // Center vertically

        const c = Math.round(relativeX / cellSize);
        const r = Math.round(relativeY / cellSize);

        // Bounds check handled in canPlace
        if (canPlace(grid, dragInfo.shape.matrix, r, c)) {
            placeShape(r, c, dragInfo.shape, dragInfo.index);
        }
    };

    const placeShape = (r: number, c: number, shape: Shape, dockIndex: number) => {
        playSound('place');
        
        // 1. Place blocks
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

        // 2. Clear from Dock
        const newDock = [...dockShapes];
        newDock[dockIndex] = null;
        setDockShapes(newDock);

        // 3. Check Lines
        const rowsToClear: number[] = [];
        const colsToClear: number[] = [];
        for (let i = 0; i < BOARD_SIZE; i++) {
            if (newGrid[i].every(cell => cell !== null)) rowsToClear.push(i);
        }
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (newGrid.every(row => row[j] !== null)) colsToClear.push(j);
        }

        const linesCleared = rowsToClear.length + colsToClear.length;
        let moveScore = blocksPlaced;

        if (linesCleared > 0) {
            const newCombo = comboCount + 1;
            setComboCount(newCombo);
            moveScore += (linesCleared * 10) * newCombo;
            
            setClearingRows(rowsToClear);
            setClearingCols(colsToClear);
            playSound(linesCleared > 1 || newCombo > 1 ? 'combo' : 'clear');

            setTimeout(() => {
                const finalGrid = newGrid.map(row => [...row]);
                rowsToClear.forEach(ri => finalGrid[ri].fill(null));
                colsToClear.forEach(ci => { for(let row=0; row<BOARD_SIZE; row++) finalGrid[row][ci] = null; });

                setGrid(finalGrid);
                setClearingRows([]);
                setClearingCols([]);
                
                checkRegenAndGameOver(finalGrid, newDock, score + moveScore);
            }, 300);
        } else {
            setComboCount(0);
            setGrid(newGrid);
            checkRegenAndGameOver(newGrid, newDock, score + moveScore);
        }
    };

    const checkRegenAndGameOver = (currentGrid: (string|null)[][], currentDock: (Shape|null)[], newScore: number) => {
        let nextDock = currentDock;
        if (currentDock.every(s => s === null)) {
            nextDock = generateNewShapes();
            setDockShapes(nextDock);
        }
        setScore(newScore);
        
        if (checkGameOver(currentGrid, nextDock)) {
            handleGameOver(newScore);
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
            await onFinish({ score, maxCombo: 0, correctCount: 0 }); 
            onBack();
        } catch(e) {
            alert("上傳失敗");
            onBack();
        }
    };

    // --- Render Helpers ---

    const renderShapePreview = (shape: Shape, size = 16) => {
        const rows = shape.matrix.length;
        const cols = shape.matrix[0].length;
        return (
            <div 
                style={{ 
                    display: 'grid', 
                    gridTemplateRows: `repeat(${rows}, ${size}px)`,
                    gridTemplateColumns: `repeat(${cols}, ${size}px)`,
                    gap: '2px',
                    pointerEvents: 'none'
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

    // Calculate Grid Shadows for Dragging
    const renderDropPreview = () => {
        if (!draggingShape || !gridRef.current) return null;
        
        const rect = gridRef.current.getBoundingClientRect();
        const cellSize = rect.width / BOARD_SIZE;
        const adjustedY = draggingShape.y + 50;
        
        // Match drop logic calculation
        const shapeWidth = draggingShape.shape.matrix[0].length * cellSize;
        const shapeHeight = draggingShape.shape.matrix.length * cellSize;
        const relativeX = (draggingShape.x - rect.left) - (shapeWidth / 2); 
        const relativeY = (adjustedY - rect.top) - (shapeHeight / 2);
        
        const c = Math.round(relativeX / cellSize);
        const r = Math.round(relativeY / cellSize);
        
        // Validate
        if (!canPlace(grid, draggingShape.shape.matrix, r, c)) return null;

        // Render "Ghost" blocks
        const ghosts = [];
        for (let i = 0; i < draggingShape.shape.matrix.length; i++) {
            for (let j = 0; j < draggingShape.shape.matrix[i].length; j++) {
                if (draggingShape.shape.matrix[i][j] === 1) {
                    ghosts.push(
                        <div 
                            key={`ghost-${i}-${j}`}
                            className="absolute bg-gray-500/30 rounded-md border-2 border-white/30"
                            style={{
                                width: `${cellSize - 4}px`,
                                height: `${cellSize - 4}px`,
                                left: `${(c + j) * (cellSize)}px`, // approximate gap adjust if grid has gap
                                top: `${(r + i) * (cellSize)}px`,
                                margin: '2px' // to match grid gap
                            }}
                        />
                    );
                }
            }
        }
        return <div className="absolute inset-0 pointer-events-none">{ghosts}</div>;
    };

    // --- Main UI ---
    return (
        <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center select-none overflow-hidden touch-none">
            {/* Header */}
            <div className="w-full bg-gray-800 p-4 pt-safe flex justify-between items-center shadow-lg z-10">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-700 text-gray-300">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">SCORE</span>
                    <span className="text-2xl font-black text-white font-mono leading-none">{score}</span>
                </div>
                <div className="w-8"></div>
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
                            <li>拖曳下方圖形至棋盤空格放置。</li>
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
                        ref={gridRef}
                        className="bg-gray-800 p-1 rounded-xl shadow-2xl relative"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
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
                                        className={`
                                            m-[2px] rounded-md transition-all duration-300
                                            ${cellColor ? cellColor : 'bg-gray-700/50'}
                                            ${isClearing ? 'scale-0 opacity-0 bg-white' : 'scale-100 opacity-100'}
                                        `}
                                    ></div>
                                );
                            })
                        )}
                        
                        {/* Drag Preview Overlay */}
                        {renderDropPreview()}

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
                    <div className="mt-8 w-full flex justify-between items-center px-4 h-32">
                        {dockShapes.map((shape, idx) => (
                            <div 
                                key={idx} 
                                className={`
                                    w-[30%] aspect-square flex items-center justify-center rounded-2xl transition-all duration-200
                                    ${shape ? 'bg-gray-800 border-2 border-gray-700 shadow-lg cursor-grab active:cursor-grabbing' : 'opacity-0 pointer-events-none'}
                                    ${draggingShape?.index === idx ? 'opacity-0' : 'opacity-100'}
                                `}
                                onMouseDown={(e) => handleDragStart(e, idx)}
                                onTouchStart={(e) => handleDragStart(e, idx)}
                            >
                                {shape && renderShapePreview(shape, 10)}
                            </div>
                        ))}
                    </div>

                    <p className="mt-2 text-xs text-gray-500 animate-pulse">
                        拖曳圖形至棋盤
                    </p>

                    {/* Dragging Portal/Overlay */}
                    {draggingShape && (
                         <div 
                            className="fixed pointer-events-none z-[100]"
                            style={{
                                left: draggingShape.x,
                                top: draggingShape.y,
                                transform: `translate(-50%, calc(-50% - 50px)) scale(1.2)`, // Offset to match touch visually
                            }}
                         >
                             {renderShapePreview(draggingShape.shape, 20)}
                         </div>
                    )}

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

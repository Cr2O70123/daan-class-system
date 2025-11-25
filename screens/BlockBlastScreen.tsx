
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Trophy, Crown, Grid3X3, Zap, XCircle, RefreshCw } from 'lucide-react';
import { User, GameResult } from '../types';
import { submitGameScore } from '../services/dataService';

// --- Constants & Types ---
const BOARD_SIZE = 8;

// Neon/Vibrant Colors
const BLOCK_COLORS = [
    'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]', 
    'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]', 
    'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]', 
    'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]', 
    'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)]', 
    'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)]', 
    'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]', 
    'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)]', 
    'bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.6)]', 
    'bg-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.6)]', 
    'bg-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.6)]'
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
    [[1, 0, 0], [1, 0, 0], [1, 1, 1]], // Big L
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
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;
            case 'combo':
                osc.type = 'square';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.setValueAtTime(800, now + 0.1); 
                osc.frequency.setValueAtTime(1200, now + 0.2);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.4);
                osc.start(now);
                osc.stop(now + 0.4);
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

// Haptic Feedback Helper
const vibrate = (pattern: number | number[] = 10) => {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
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
    const [screenShake, setScreenShake] = useState(false);

    // Dynamic sizing for drag logic
    const [boardCellSize, setBoardCellSize] = useState(0);

    // --- Drag & Drop State ---
    const [draggingShape, setDraggingShape] = useState<{
        index: number;
        shape: Shape;
        x: number; // Viewport X
        y: number; // Viewport Y
    } | null>(null);

    // Refs for coordinate calculation
    const gridRef = useRef<HTMLDivElement>(null);

    // Update cell size on resize/init
    useEffect(() => {
        if (!gridRef.current) return;
        const updateSize = () => {
            if (gridRef.current) {
                const rect = gridRef.current.getBoundingClientRect();
                setBoardCellSize(rect.width / BOARD_SIZE);
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [gameStarted]);

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
        
        // Short delay to ensure DOM is ready for sizing
        setTimeout(() => {
             if (gridRef.current) {
                const rect = gridRef.current.getBoundingClientRect();
                setBoardCellSize(rect.width / BOARD_SIZE);
            }
        }, 100);
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
                    if (newR < 0 || newR >= BOARD_SIZE || newC < 0 || newC >= BOARD_SIZE) return false;
                    if (currentGrid[newR][newC] !== null) return false;
                }
            }
        }
        return true;
    };

    // --- Drag Logic ---

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent, index: number) => {
        if (gameOver) return;
        
        const shape = dockShapes[index];
        if (!shape) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        playSound('select');
        vibrate(20);

        setDraggingShape({
            index,
            shape,
            x: clientX,
            y: clientY,
        });
    };

    const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!draggingShape) return;
        e.preventDefault(); // Prevent scrolling on mobile while dragging

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
        
        // Direct state update can be heavy, but necessary for the portal position
        setDraggingShape(prev => prev ? { ...prev, x: clientX, y: clientY } : null);
    }, [draggingShape]);

    const handleDragEnd = useCallback((e: MouseEvent | TouchEvent) => {
        if (!draggingShape) return;

        // Get final position
        const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as MouseEvent).clientY;

        attemptDrop(clientX, clientY, draggingShape);
        setDraggingShape(null);
    }, [draggingShape, grid, boardCellSize]); // Include boardCellSize dependency

    useEffect(() => {
        if (draggingShape) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchmove', handleDragMove, { passive: false });
            window.addEventListener('touchend', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDragMove);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [draggingShape, handleDragMove, handleDragEnd]);

    const attemptDrop = (x: number, y: number, dragInfo: NonNullable<typeof draggingShape>) => {
        if (!gridRef.current || boardCellSize === 0) return;
        const rect = gridRef.current.getBoundingClientRect();
        
        // This MUST match the render portal's transform.
        // We offset Y by -100px so the finger doesn't cover the block.
        // x is center, y is offset center.
        const shapeVisualY = y - 100; 

        // We assume dragging by center of the whole shape bounding box
        const shapeWidth = dragInfo.shape.matrix[0].length * boardCellSize;
        const shapeHeight = dragInfo.shape.matrix.length * boardCellSize;
        
        // Calculate Top-Left of the shape in Grid Coordinates
        const relativeX = (x - rect.left) - (shapeWidth / 2);
        const relativeY = (shapeVisualY - rect.top) - (shapeHeight / 2);

        // Calculate Row/Col
        // Use Math.round to snap to nearest cell
        const c = Math.round(relativeX / boardCellSize);
        const r = Math.round(relativeY / boardCellSize);

        if (canPlace(grid, dragInfo.shape.matrix, r, c)) {
            placeShape(r, c, dragInfo.shape, dragInfo.index);
        }
    };

    const placeShape = (r: number, c: number, shape: Shape, dockIndex: number) => {
        playSound('place');
        vibrate(30);
        
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

        const newDock = [...dockShapes];
        newDock[dockIndex] = null;
        setDockShapes(newDock);

        // Check Lines
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
            moveScore += (linesCleared * 10) * newCombo; // Bonus
            
            setClearingRows(rowsToClear);
            setClearingCols(colsToClear);
            playSound(linesCleared > 1 || newCombo > 1 ? 'combo' : 'clear');
            vibrate(linesCleared * 50); // Stronger vibrate for clears
            
            // Trigger Shake
            setScreenShake(true);
            setTimeout(() => setScreenShake(false), 300);

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
        vibrate([100, 50, 100]);
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

    const renderShapePreview = (shape: Shape, blockSize: number) => {
        const rows = shape.matrix.length;
        const cols = shape.matrix[0].length;
        return (
            <div 
                style={{ 
                    display: 'grid', 
                    gridTemplateRows: `repeat(${rows}, ${blockSize}px)`,
                    gridTemplateColumns: `repeat(${cols}, ${blockSize}px)`,
                    gap: '2px', // Needs to match gap in main grid if possible, or scaled
                }}
            >
                {shape.matrix.map((row, r) => 
                    row.map((cell, c) => (
                        <div 
                            key={`${r}-${c}`} 
                            className={`rounded-[2px] ${cell ? shape.color : 'bg-transparent'}`}
                            style={{ 
                                boxShadow: cell ? 'inset 0 0 5px rgba(255,255,255,0.5)' : 'none',
                                opacity: cell ? 1 : 0
                            }}
                        ></div>
                    ))
                )}
            </div>
        );
    };

    const renderGhost = () => {
        if (!draggingShape || !gridRef.current || boardCellSize === 0) return null;
        
        const rect = gridRef.current.getBoundingClientRect();
        const adjustedY = draggingShape.y - 100; // Match portal offset

        const shapeWidth = draggingShape.shape.matrix[0].length * boardCellSize;
        const shapeHeight = draggingShape.shape.matrix.length * boardCellSize;
        
        const relativeX = (draggingShape.x - rect.left) - (shapeWidth / 2);
        const relativeY = (adjustedY - rect.top) - (shapeHeight / 2);

        const c = Math.round(relativeX / boardCellSize);
        const r = Math.round(relativeY / boardCellSize);

        if (!canPlace(grid, draggingShape.shape.matrix, r, c)) return null;

        const ghosts = [];
        for (let i = 0; i < draggingShape.shape.matrix.length; i++) {
            for (let j = 0; j < draggingShape.shape.matrix[i].length; j++) {
                if (draggingShape.shape.matrix[i][j] === 1) {
                    ghosts.push(
                        <div 
                            key={`ghost-${i}-${j}`}
                            className="absolute bg-white/30 rounded-md border-2 border-dashed border-white/60 box-border z-0"
                            style={{
                                width: `${boardCellSize}px`,
                                height: `${boardCellSize}px`,
                                left: `${(c + j) * boardCellSize}px`,
                                top: `${(r + i) * boardCellSize}px`,
                                padding: '2px' // offset margin if needed
                            }}
                        />
                    );
                }
            }
        }
        return <>{ghosts}</>;
    };

    // --- Main UI ---
    return (
        <div 
            className={`fixed inset-0 z-50 bg-[#1e1e2e] flex flex-col items-center select-none overflow-hidden transition-transform ${screenShake ? 'animate-[shake_0.3s_ease-in-out]' : ''}`} 
            style={{ touchAction: 'none' }}
        >
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translate(0, 0); }
                    25% { transform: translate(-5px, 5px); }
                    50% { transform: translate(5px, -5px); }
                    75% { transform: translate(-5px, -5px); }
                }
            `}</style>
            
            {/* Header */}
            <div className="w-full bg-[#181825] p-4 pt-safe flex justify-between items-center shadow-lg z-10 border-b border-gray-800">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-700 text-gray-400">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">SCORE</span>
                    <span className="text-3xl font-black text-white font-mono leading-none">{score}</span>
                </div>
                <div className="w-8">
                     <button onClick={startGame} className="text-gray-500 hover:text-white"><RefreshCw size={20}/></button>
                </div>
            </div>

            {!gameStarted ? (
                // --- Start Menu ---
                <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 w-full max-w-sm animate-in fade-in zoom-in duration-300">
                    <div className="text-center space-y-2">
                        <div className="w-24 h-24 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.5)] mb-6 rotate-3 hover:rotate-6 transition-transform">
                            <Grid3X3 size={48} className="text-white drop-shadow-md" />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">BLOCK BLAST</h1>
                        <p className="text-gray-400 font-medium">拖曳 • 填滿 • 消除</p>
                    </div>

                    <div className="w-full space-y-3">
                         <button 
                            onClick={startGame}
                            className="w-full py-5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-2xl font-black text-xl shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2 transition-transform active:scale-95 border-b-4 border-blue-800"
                         >
                            <Zap size={24} className="fill-white" />
                            開始遊戲
                        </button>
                        <p className="text-center text-xs text-gray-500 font-medium bg-gray-800/50 py-2 rounded-full">
                            消耗 1 愛心 • 剩餘: {user.hearts}
                        </p>
                    </div>
                </div>
            ) : (
                // --- Game Board ---
                <div className="flex-1 w-full max-w-md flex flex-col items-center justify-center p-4 relative">
                    
                    {/* The Grid Container */}
                    <div 
                        ref={gridRef}
                        className="bg-[#11111b] p-1 rounded-xl shadow-2xl relative border-2 border-[#313244]"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
                            width: 'min(90vw, 360px)',
                            aspectRatio: '1/1',
                            gap: '2px' 
                        }}
                    >
                        {grid.map((row, r) => 
                            row.map((cellColor, c) => {
                                const isClearing = clearingRows.includes(r) || clearingCols.includes(c);
                                return (
                                    <div 
                                        key={`${r}-${c}`}
                                        className={`
                                            rounded-[4px] transition-all duration-300
                                            ${cellColor ? cellColor : 'bg-[#313244]'}
                                            ${isClearing ? 'scale-0 opacity-0 bg-white brightness-200' : 'scale-100 opacity-100'}
                                        `}
                                        style={{
                                            boxShadow: cellColor ? 'inset 0 0 10px rgba(0,0,0,0.2)' : 'none'
                                        }}
                                    ></div>
                                );
                            })
                        )}
                        
                        {/* Ghost Preview */}
                        {renderGhost()}

                        {/* Combo Popup */}
                        {comboCount > 1 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                <div className="text-6xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)] animate-bounce stroke-black italic">
                                    {comboCount}x
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Dock (Shapes) */}
                    <div className="mt-8 w-full flex justify-between items-center px-4 h-32 gap-2">
                        {dockShapes.map((shape, idx) => {
                            // Only render shape if not being dragged
                            const isBeingDragged = draggingShape?.index === idx;
                            return (
                                <div 
                                    key={idx} 
                                    className={`
                                        flex-1 aspect-square flex items-center justify-center rounded-2xl transition-all duration-150
                                        ${shape && !isBeingDragged ? 'bg-[#313244] border-2 border-[#45475a] shadow-lg active:scale-95' : ''}
                                        ${!shape ? 'opacity-0 pointer-events-none' : ''}
                                    `}
                                    onMouseDown={(e) => handleDragStart(e, idx)}
                                    onTouchStart={(e) => handleDragStart(e, idx)}
                                >
                                    {shape && !isBeingDragged && renderShapePreview(shape, 16)} 
                                </div>
                            );
                        })}
                    </div>

                    {/* Drag Portal - Fixed size matching grid cells */}
                    {draggingShape && createPortal(
                        <div 
                            className="fixed pointer-events-none z-[100]"
                            style={{
                                left: draggingShape.x,
                                top: draggingShape.y,
                                // Offset the touch point so finger doesn't cover the block.
                                // We shift it up by 100px.
                                transform: `translate(-50%, -100px)`, 
                            }}
                        >
                            {/* Render exact size as board cells */}
                            {renderShapePreview(draggingShape.shape, boardCellSize)}
                        </div>,
                        document.body
                    )}

                    {/* Game Over Overlay */}
                    {gameOver && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/90 backdrop-blur-sm rounded-xl">
                            <div className="bg-gray-800 p-8 rounded-3xl text-center shadow-2xl border border-gray-700 w-4/5 animate-in zoom-in">
                                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <XCircle size={32} className="text-red-500" />
                                </div>
                                <h2 className="text-2xl font-black text-white mb-2">無法移動!</h2>
                                <div className="text-5xl font-mono font-black text-blue-400 mb-6 drop-shadow-lg">{score}</div>
                                
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

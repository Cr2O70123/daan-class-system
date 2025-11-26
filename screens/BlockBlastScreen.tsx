
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Trophy, Crown, Grid3X3, Zap, XCircle, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { User, GameResult } from '../types';
import { submitGameScore } from '../services/dataService';

// --- Constants & Types ---
const BOARD_SIZE = 8;
const TOUCH_OFFSET_Y = 70; // Slightly reduced offset for better control

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

// Define shapes with weights (Weighted Generation)
const SHAPE_DEFINITIONS: { matrix: number[][], weight: number }[] = [
    { matrix: [[1]], weight: 1 }, // Dot (Reduced chance)
    { matrix: [[1, 1]], weight: 3 }, // H-Line 2
    { matrix: [[1], [1]], weight: 3 }, // V-Line 2
    { matrix: [[1, 1, 1]], weight: 4 }, // H-Line 3
    { matrix: [[1], [1], [1]], weight: 4 }, // V-Line 3
    { matrix: [[1, 1, 1, 1]], weight: 3 }, // H-Line 4
    { matrix: [[1], [1], [1], [1]], weight: 3 }, // V-Line 4
    { matrix: [[1, 1, 1, 1, 1]], weight: 1 }, // H-Line 5
    { matrix: [[1], [1], [1], [1], [1]], weight: 1 }, // V-Line 5
    { matrix: [[1, 1], [1, 1]], weight: 5 }, // Square 2x2 (Common)
    { matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], weight: 2 }, // Square 3x3
    { matrix: [[1, 1, 0], [0, 1, 1]], weight: 3 }, // Z
    { matrix: [[0, 1, 1], [1, 1, 0]], weight: 3 }, // S
    { matrix: [[1, 1, 1], [0, 1, 0]], weight: 4 }, // T
    { matrix: [[1, 0], [1, 0], [1, 1]], weight: 4 }, // L
    { matrix: [[0, 1], [0, 1], [1, 1]], weight: 4 }, // J
    { matrix: [[1, 1], [1, 0]], weight: 5 }, // Small L
    { matrix: [[1, 0, 0], [1, 0, 0], [1, 1, 1]], weight: 2 }, // Big L
    { matrix: [[1, 1, 1], [1, 0, 1]], weight: 2 }, // U
    { matrix: [[1, 0], [1, 1]], weight: 4 }, // Small corner
];

interface BlockBlastScreenProps {
  user: User;
  onBack: () => void;
  onFinish: (result: GameResult) => void;
  onUpdateHearts: (hearts: number) => void;
}

// --- Audio System (Web Audio API) ---
class GameSynth {
    ctx: AudioContext | null = null;
    bgmInterval: number | null = null;
    isMuted: boolean = false;
    noteIndex: number = 0;

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) this.ctx = new AudioContext();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1) {
        if (this.isMuted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playSFX(type: 'place' | 'clear' | 'gameover' | 'select' | 'combo') {
        if (this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        switch(type) {
            case 'select':
                osc.frequency.setValueAtTime(600, now);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
                break;
            case 'place':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
                break;
            case 'clear':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(500, now);
                osc.frequency.linearRampToValueAtTime(1200, now + 0.2);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;
            case 'combo':
                [440, 554, 659].forEach((f, i) => {
                     const o = this.ctx!.createOscillator();
                     const g = this.ctx!.createGain();
                     o.connect(g);
                     g.connect(this.ctx!.destination);
                     o.type = 'square';
                     o.frequency.setValueAtTime(f, now + i*0.05);
                     g.gain.setValueAtTime(0.05, now + i*0.05);
                     g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                     o.start(now + i*0.05);
                     o.stop(now + 0.5);
                });
                break;
            case 'gameover':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 1);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.linearRampToValueAtTime(0, now + 1);
                osc.start(now);
                osc.stop(now + 1);
                break;
        }
    }

    startBGM() {
        if (this.bgmInterval) clearInterval(this.bgmInterval);
        this.noteIndex = 0;
        const sequence = [261.63, 329.63, 392.00, 329.63, 440.00, 392.00, 329.63, 293.66];
        const bass = [65.41, 65.41, 73.42, 73.42, 87.31, 87.31, 73.42, 65.41];

        this.bgmInterval = window.setInterval(() => {
            if (this.isMuted) return;
            this.playTone(sequence[this.noteIndex % sequence.length], 'sine', 0.3, 0.05);
            if (this.noteIndex % 2 === 0) {
                 this.playTone(bass[(this.noteIndex / 2) % bass.length], 'triangle', 0.6, 0.08);
            }
            this.noteIndex++;
        }, 400);
    }

    stopBGM() {
        if (this.bgmInterval) clearInterval(this.bgmInterval);
        this.bgmInterval = null;
    }
}

const synth = new GameSynth();

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
    const [isMuted, setIsMuted] = useState(false);
    
    const [clearingRows, setClearingRows] = useState<number[]>([]);
    const [clearingCols, setClearingCols] = useState<number[]>([]);
    const [comboCount, setComboCount] = useState(0);
    const [screenShake, setScreenShake] = useState(false);

    const [boardCellSize, setBoardCellSize] = useState(0);

    const [draggingShape, setDraggingShape] = useState<{
        index: number;
        shape: Shape;
        x: number;
        y: number;
    } | null>(null);

    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        synth.isMuted = isMuted;
    }, [isMuted]);

    useEffect(() => {
        return () => {
            synth.stopBGM();
        };
    }, []);

    useEffect(() => {
        const updateSize = () => {
            if (gridRef.current) {
                const rect = gridRef.current.getBoundingClientRect();
                setBoardCellSize(rect.width / BOARD_SIZE);
            }
        };
        updateSize();
        setTimeout(updateSize, 100);
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [gameStarted]);

    // --- Generation Logic (Weighted) ---
    const generateNewShapes = () => {
        const newShapes: Shape[] = [];
        const totalWeight = SHAPE_DEFINITIONS.reduce((sum, item) => sum + item.weight, 0);

        for (let i = 0; i < 3; i++) {
            // Weighted Random
            let randomNum = Math.random() * totalWeight;
            let selectedDef = SHAPE_DEFINITIONS[0].matrix;
            
            for (const item of SHAPE_DEFINITIONS) {
                if (randomNum < item.weight) {
                    selectedDef = item.matrix;
                    break;
                }
                randomNum -= item.weight;
            }

            const color = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
            newShapes.push({
                matrix: selectedDef,
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
        
        synth.init();
        synth.playSFX('select');
        synth.startBGM();

        setGrid(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
        setScore(0);
        setComboCount(0);
        setGameOver(false);
        setGameStarted(true);
        setDockShapes(generateNewShapes());
        
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

    // --- Drag Logic (Improved) ---

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent, index: number) => {
        if (gameOver) return;
        const shape = dockShapes[index];
        if (!shape) return;

        // Ensure we get coordinates correctly
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        synth.playSFX('select');
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
        
        // Prevent default to stop scrolling on mobile
        if (e.cancelable) e.preventDefault();

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
        
        setDraggingShape(prev => prev ? { ...prev, x: clientX, y: clientY } : null);
    }, [draggingShape]);

    const getDropTarget = (mouseX: number, mouseY: number, shape: Shape) => {
        if (!gridRef.current || boardCellSize === 0) return null;
        const rect = gridRef.current.getBoundingClientRect();
        
        // Visual Center is where the finger is
        const visualCenterX = mouseX;
        // Actual Block Center is visually offset upwards so finger doesn't cover it
        const visualCenterY = mouseY - TOUCH_OFFSET_Y;

        const shapeWidthPx = shape.matrix[0].length * boardCellSize;
        const shapeHeightPx = shape.matrix.length * boardCellSize;

        // Calculate Top-Left of shape
        const shapeTopLeftX = visualCenterX - (shapeWidthPx / 2);
        const shapeTopLeftY = visualCenterY - (shapeHeightPx / 2);

        const relativeX = shapeTopLeftX - rect.left;
        const relativeY = shapeTopLeftY - rect.top;

        const col = Math.round(relativeX / boardCellSize);
        const row = Math.round(relativeY / boardCellSize);

        return { r: row, c: col };
    };

    const handleDragEnd = useCallback((e: MouseEvent | TouchEvent) => {
        if (!draggingShape) return;

        const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as MouseEvent).clientY;

        const target = getDropTarget(clientX, clientY, draggingShape.shape);

        if (target && canPlace(grid, draggingShape.shape.matrix, target.r, target.c)) {
            placeShape(target.r, target.c, draggingShape.shape, draggingShape.index);
        }

        setDraggingShape(null);
    }, [draggingShape, grid, boardCellSize]);

    useEffect(() => {
        if (draggingShape) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
            // Use { passive: false } to allow preventDefault for scroll locking
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

    const placeShape = (r: number, c: number, shape: Shape, dockIndex: number) => {
        synth.playSFX('place');
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
            moveScore += (linesCleared * 10) * newCombo;
            
            setClearingRows(rowsToClear);
            setClearingCols(colsToClear);
            synth.playSFX(linesCleared > 1 || newCombo > 1 ? 'combo' : 'clear');
            vibrate(linesCleared * 50);
            
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
        synth.stopBGM();
        synth.playSFX('gameover');
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

    const renderShapePreview = (shape: Shape, blockSize: number) => {
        const rows = shape.matrix.length;
        const cols = shape.matrix[0].length;
        return (
            <div 
                style={{ 
                    display: 'grid', 
                    gridTemplateRows: `repeat(${rows}, ${blockSize}px)`,
                    gridTemplateColumns: `repeat(${cols}, ${blockSize}px)`,
                    gap: '2px', 
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
        
        const target = getDropTarget(draggingShape.x, draggingShape.y, draggingShape.shape);
        if (!target) return null;

        const { r, c } = target;

        if (!canPlace(grid, draggingShape.shape.matrix, r, c)) return null;

        const ghosts = [];
        for (let i = 0; i < draggingShape.shape.matrix.length; i++) {
            for (let j = 0; j < draggingShape.shape.matrix[i].length; j++) {
                if (draggingShape.shape.matrix[i][j] === 1) {
                    ghosts.push(
                        <div 
                            key={`ghost-${i}-${j}`}
                            className="absolute rounded-[4px] border-2 border-white/50 box-border z-0"
                            style={{
                                width: `${boardCellSize - 2}px`,
                                height: `${boardCellSize - 2}px`,
                                left: `${(c + j) * boardCellSize + 1}px`,
                                top: `${(r + i) * boardCellSize + 1}px`,
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                pointerEvents: 'none'
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
            style={{ touchAction: 'none' }} // Critical for disabling browser gestures
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
                <button onClick={() => { synth.stopBGM(); onBack(); }} className="p-2 -ml-2 rounded-full hover:bg-gray-700 text-gray-400">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">SCORE</span>
                    <span className="text-3xl font-black text-white font-mono leading-none">{score}</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsMuted(!isMuted)} className="text-gray-500 hover:text-white">
                        {isMuted ? <VolumeX size={20}/> : <Volume2 size={20}/>}
                    </button>
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

                    {/* Drag Portal */}
                    {draggingShape && createPortal(
                        <div 
                            className="fixed pointer-events-none z-[100]"
                            style={{
                                left: draggingShape.x,
                                top: draggingShape.y,
                                // Offset visual slightly up so finger doesn't cover it
                                transform: `translate(-50%, -50%) translateY(-${TOUCH_OFFSET_Y}px)`, 
                            }}
                        >
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

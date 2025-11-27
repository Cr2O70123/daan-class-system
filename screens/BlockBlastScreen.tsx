
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Trophy, Crown, Grid3X3, Zap, XCircle, RefreshCw, Volume2, VolumeX, BookOpen, X, AlertTriangle, Coins, Info } from 'lucide-react';
import { User, GameResult, GameLeaderboardEntry } from '../types';
import { submitGameScore, fetchGameLeaderboard } from '../services/dataService';

// --- Constants & Types ---
const BOARD_SIZE = 8;
const TOUCH_OFFSET_Y = 80; 
const MAX_PLAYS = 15;

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
    difficulty: 'easy' | 'medium' | 'hard';
};

// Define shapes with weights (Weighted Generation)
const SHAPE_DEFINITIONS: { matrix: number[][], weight: number, difficulty: 'easy'|'medium'|'hard' }[] = [
    { matrix: [[1]], weight: 2, difficulty: 'easy' }, // Dot
    { matrix: [[1, 1]], weight: 4, difficulty: 'easy' }, // H-Line 2
    { matrix: [[1], [1]], weight: 4, difficulty: 'easy' }, // V-Line 2
    { matrix: [[1, 1, 1]], weight: 4, difficulty: 'easy' }, // H-Line 3
    { matrix: [[1], [1], [1]], weight: 4, difficulty: 'easy' }, // V-Line 3
    { matrix: [[1, 1], [1, 0]], weight: 5, difficulty: 'easy' }, // Small L
    { matrix: [[1, 0], [1, 1]], weight: 5, difficulty: 'easy' }, // Small corner
    
    { matrix: [[1, 1, 1, 1]], weight: 3, difficulty: 'medium' }, // H-Line 4
    { matrix: [[1], [1], [1], [1]], weight: 3, difficulty: 'medium' }, // V-Line 4
    { matrix: [[1, 1], [1, 1]], weight: 5, difficulty: 'medium' }, // Square 2x2
    { matrix: [[1, 1, 0], [0, 1, 1]], weight: 3, difficulty: 'medium' }, // Z
    { matrix: [[0, 1, 1], [1, 1, 0]], weight: 3, difficulty: 'medium' }, // S
    { matrix: [[1, 1, 1], [0, 1, 0]], weight: 4, difficulty: 'medium' }, // T
    { matrix: [[1, 0], [1, 0], [1, 1]], weight: 4, difficulty: 'medium' }, // L
    { matrix: [[0, 1], [0, 1], [1, 1]], weight: 4, difficulty: 'medium' }, // J

    { matrix: [[1, 1, 1, 1, 1]], weight: 2, difficulty: 'hard' }, // H-Line 5
    { matrix: [[1], [1], [1], [1], [1]], weight: 2, difficulty: 'hard' }, // V-Line 5
    { matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], weight: 2, difficulty: 'hard' }, // Square 3x3
    { matrix: [[1, 0, 0], [1, 0, 0], [1, 1, 1]], weight: 2, difficulty: 'hard' }, // Big L
    { matrix: [[1, 1, 1], [1, 0, 1]], weight: 2, difficulty: 'hard' }, // U
];

interface BlockBlastScreenProps {
  user: User;
  onBack: () => void;
  onFinish: (result: GameResult) => void;
  onUpdateHearts: (newPlays: number) => void;
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

const getFrameStyle = (frameId?: string) => {
    switch(frameId) {
      case 'frame_gold': return 'ring-2 ring-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]';
      case 'frame_neon': return 'ring-2 ring-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]';
      case 'frame_fire': return 'ring-2 ring-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]';
      case 'frame_pixel': return 'ring-2 ring-purple-500 border-2 border-dashed border-white';
      case 'frame_beta': return 'ring-2 ring-amber-500 border-2 border-dashed border-yellow-200 shadow-[0_0_10px_rgba(245,158,11,0.6)]';
      default: return 'ring-2 ring-white/20';
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
    const [activeTab, setActiveTab] = useState<'play' | 'rank'>('play');
    const [leaderboard, setLeaderboard] = useState<GameLeaderboardEntry[]>([]);
    const [showHelp, setShowHelp] = useState(false);
    
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

    // Load Leaderboard
    useEffect(() => {
        const loadRank = async () => {
            const data = await fetchGameLeaderboard();
            setLeaderboard(data);
        };
        loadRank();
    }, [activeTab]);

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

    // --- ALGORITHM: Smart Shape Generation ---
    
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

    const isShapePlaceable = (currentGrid: (string | null)[][], matrix: number[][]) => {
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (canPlace(currentGrid, matrix, r, c)) return true;
            }
        }
        return false;
    };

    const getRandomShape = (difficultyFilter?: 'easy' | 'medium' | 'hard') => {
        let pool = SHAPE_DEFINITIONS;
        
        // If strict difficulty is requested
        if (difficultyFilter) {
            pool = SHAPE_DEFINITIONS.filter(s => s.difficulty === difficultyFilter);
            if (pool.length === 0) pool = SHAPE_DEFINITIONS; // Fallback
        }

        const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
        let randomNum = Math.random() * totalWeight;
        
        for (const item of pool) {
            if (randomNum < item.weight) {
                const color = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
                return {
                    matrix: item.matrix,
                    id: Math.random().toString(36).substr(2, 9),
                    color,
                    difficulty: item.difficulty
                };
            }
            randomNum -= item.weight;
        }
        // Fallback safety
        return {
            matrix: SHAPE_DEFINITIONS[0].matrix,
            id: Date.now().toString(),
            color: BLOCK_COLORS[0],
            difficulty: 'easy' as const
        };
    };

    // The Core Algorithm: Safety Generation
    const generateNewShapes = (currentGrid: (string | null)[][], currentScore: number) => {
        const newShapes: Shape[] = [];
        
        // 1. Determine Difficulty Mix based on Score
        // Score < 500: Mostly Easy
        // Score > 2000: Intro Hard
        let difficultyBias: 'easy' | 'medium' | 'hard' = 'easy';
        if (currentScore > 2000) difficultyBias = 'hard';
        else if (currentScore > 500) difficultyBias = 'medium';

        // 2. Look-ahead: Find shapes that CAN fit right now
        // We check ALL definitions to find fitting ones
        const fittingDefinitions = SHAPE_DEFINITIONS.filter(def => 
            isShapePlaceable(currentGrid, def.matrix)
        );

        // 3. Generate 3 Shapes
        // Rule: At least 1 shape MUST be playable (Safety Block)
        
        // Slot 1: The Safety Block
        if (fittingDefinitions.length > 0) {
            // Pick a fitting shape, preferably matching current difficulty bias if possible, else random fitting
            const fittingAndBiased = fittingDefinitions.filter(d => d.difficulty === difficultyBias || d.difficulty === 'easy');
            const pool = fittingAndBiased.length > 0 ? fittingAndBiased : fittingDefinitions;
            
            const selectedDef = pool[Math.floor(Math.random() * pool.length)];
            const color = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
            
            newShapes.push({
                matrix: selectedDef.matrix,
                id: Math.random().toString(36),
                color,
                difficulty: selectedDef.difficulty
            });
        } else {
            // If NO shape fits, the game is truly over. Just generate random (CheckGameOver will catch it).
            newShapes.push(getRandomShape('easy'));
        }

        // Slot 2 & 3: Random based on difficulty bias
        // At higher scores, we allow harder shapes, but we still mix in some easier ones to avoid frustration
        for (let i = 0; i < 2; i++) {
            // 20% chance to be strictly easier than current bias to help player
            const forceEasy = Math.random() < 0.2;
            const targetDiff = forceEasy ? 'easy' : difficultyBias;
            newShapes.push(getRandomShape(targetDiff));
        }

        // Shuffle the array so the "safe" block isn't always first
        return newShapes.sort(() => 0.5 - Math.random());
    };

    const startGame = () => {
        if (user.dailyPlays >= MAX_PLAYS) {
            alert("今日遊玩次數已達 15 次上限！");
            return;
        }
        // Increment plays
        onUpdateHearts(user.dailyPlays + 1);
        
        synth.init();
        synth.playSFX('select');
        synth.startBGM();

        const emptyGrid = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
        setGrid(emptyGrid);
        setScore(0);
        setComboCount(0);
        setGameOver(false);
        setGameStarted(true);
        // Initial generation on empty grid is always safe
        setDockShapes(generateNewShapes(emptyGrid, 0));
        
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
            if (isShapePlaceable(currentGrid, shape.matrix)) {
                return false; // Found at least one move
            }
        }
        return true; // No moves left
    }, []);

    // --- Drag Logic ---

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent, index: number) => {
        if (gameOver) return;
        const shape = dockShapes[index];
        if (!shape) return;

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
        if (e.cancelable) e.preventDefault();

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
        
        setDraggingShape(prev => prev ? { ...prev, x: clientX, y: clientY } : null);
    }, [draggingShape]);

    const getDropTarget = (mouseX: number, mouseY: number, shape: Shape) => {
        if (!gridRef.current || boardCellSize === 0) return null;
        const rect = gridRef.current.getBoundingClientRect();
        
        const visualCenterX = mouseX;
        const visualCenterY = mouseY - TOUCH_OFFSET_Y;

        const shapeWidthPx = shape.matrix[0].length * boardCellSize;
        const shapeHeightPx = shape.matrix.length * boardCellSize;

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
        
        // If dock empty, regenerate SAFELY
        if (currentDock.every(s => s === null)) {
            nextDock = generateNewShapes(currentGrid, newScore);
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
            // Calculate PT: 100 Score = 1 PT
            // Bonus: > 5000 score = +50 PT extra
            let pt = Math.floor(score / 100);
            if (score >= 5000) pt += 50;
            
            await onFinish({ score, maxCombo: 0, correctCount: Math.floor(pt) }); 
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
            style={{ touchAction: 'none' }}
        >
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
                    {!gameStarted && (
                        <button onClick={() => setShowHelp(true)} className="text-gray-500 hover:text-white">
                            <BookOpen size={20}/>
                        </button>
                    )}
                    <button onClick={() => setIsMuted(!isMuted)} className="text-gray-500 hover:text-white">
                        {isMuted ? <VolumeX size={20}/> : <Volume2 size={20}/>}
                    </button>
                    {gameStarted && (
                        <button onClick={startGame} className="text-gray-500 hover:text-white"><RefreshCw size={20}/></button>
                    )}
                </div>
            </div>

            {!gameStarted ? (
                // --- Start Menu ---
                <div className="flex-1 w-full max-w-md flex flex-col overflow-hidden">
                    {/* Tabs */}
                    <div className="flex bg-[#252535] p-1 mx-6 mt-4 rounded-xl">
                        <button 
                            onClick={() => setActiveTab('play')}
                            className={`flex-1 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'play' ? 'bg-[#3b82f6] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Zap size={16} /> 挑戰
                        </button>
                        <button 
                            onClick={() => setActiveTab('rank')}
                            className={`flex-1 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'rank' ? 'bg-[#3b82f6] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Trophy size={16} /> 排行榜
                        </button>
                    </div>

                    {activeTab === 'play' ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in zoom-in duration-300">
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
                                    消耗 1 愛心 • 剩餘: {Math.max(0, MAX_PLAYS - user.dailyPlays)}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
                            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Crown size={14} className="text-yellow-500"/> 本週高分
                            </h3>
                            {leaderboard.length === 0 ? (
                                <div className="text-center text-gray-500 py-10">暫無紀錄</div>
                            ) : (
                                leaderboard.map((entry, idx) => (
                                    <div key={idx} className="bg-[#252535] p-3 rounded-xl flex items-center border border-gray-700/50">
                                        <div className={`w-8 text-center font-black text-lg italic ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-orange-500' : 'text-blue-300'}`}>
                                            {entry.rank}
                                        </div>
                                        <div className={`w-10 h-10 rounded-full mx-3 ${entry.avatarColor} flex items-center justify-center font-bold text-white text-xs ${getFrameStyle(entry.avatarFrame)} overflow-hidden`}>
                                            {entry.name[0]}
                                        </div>
                                        <div className="flex-1">
                                            <span className="font-bold text-sm text-gray-200 block">{entry.name}</span>
                                            <span className="text-[10px] text-gray-500">Score</span>
                                        </div>
                                        <div className="font-mono font-bold text-blue-400">
                                            {entry.score}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
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
                        {renderGhost()}
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
                                
                                <div className="bg-blue-900/30 p-4 rounded-xl mb-6 text-left">
                                    <h3 className="text-blue-300 font-bold text-xs mb-2 flex items-center gap-1">
                                        <Coins size={12} /> PT 獎勵計算
                                    </h3>
                                    <ul className="text-xs text-gray-400 space-y-1">
                                        <li>基礎：{Math.floor(score/100)} (每100分=1PT)</li>
                                        {score >= 5000 && <li className="text-yellow-400">滿分加成：+50</li>}
                                    </ul>
                                </div>

                                <button 
                                    onClick={handleSubmitScore}
                                    className="w-full py-4 bg-white text-gray-900 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"
                                >
                                    <Crown size={20} className="text-yellow-500 fill-current" />
                                    領取獎勵
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Help Modal */}
            {showHelp && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
                    <div className="bg-[#252535] w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <BookOpen size={20} className="text-blue-400"/> 遊戲說明
                            </h3>
                            <button onClick={() => setShowHelp(false)} className="bg-gray-700 p-1 rounded-full text-white">
                                <X size={16}/>
                            </button>
                        </div>
                        <div className="space-y-4 text-sm text-gray-300">
                            <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700">
                                <h4 className="font-bold text-white mb-1 flex items-center gap-2"><Zap size={14} className="text-yellow-400"/> 智慧生成系統 v2.0</h4>
                                <p className="text-xs leading-relaxed">
                                    我們優化了方塊生成演算法！現在系統會確保每次生成的 3 個方塊中，<span className="text-green-400 font-bold">至少有 1 個</span>可以放入當前棋盤，告別無解死局。
                                </p>
                            </div>
                            <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700">
                                <h4 className="font-bold text-white mb-1 flex items-center gap-2"><Coins size={14} className="text-blue-400"/> PT 獲取規則</h4>
                                <ul className="text-xs space-y-1 list-disc list-inside">
                                    <li>基礎獎勵：<span className="text-white font-bold">每 100 分 = 1 PT</span></li>
                                    <li>高分獎勵：單局超過 5000 分，額外獲得 <span className="text-yellow-400 font-bold">50 PT</span></li>
                                </ul>
                            </div>
                        </div>
                        <button onClick={() => setShowHelp(false)} className="w-full mt-6 py-3 bg-blue-600 text-white rounded-xl font-bold">了解</button>
                    </div>
                </div>
            )}
        </div>
    );
};

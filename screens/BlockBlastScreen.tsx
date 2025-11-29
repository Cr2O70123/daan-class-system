
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Trophy, Crown, Grid3X3, Zap, XCircle, RefreshCw, Volume2, VolumeX, BookOpen, X, AlertTriangle, Coins, Info, Flame } from 'lucide-react';
import { User, GameResult, GameLeaderboardEntry } from '../types';
import { submitGameScore, fetchGameLeaderboard } from '../services/dataService';

// --- Constants & Types ---
const BOARD_SIZE = 8;
const TOUCH_OFFSET_Y = 80; // Reduced offset for better control
const MAX_PLAYS = 15;

// Visual: Gradient Colors for "Jewel" feel
const SHAPE_COLORS: Record<string, string> = {
    'blue': 'bg-gradient-to-br from-blue-400 to-blue-600 border-blue-300',
    'cyan': 'bg-gradient-to-br from-cyan-300 to-cyan-500 border-cyan-200',
    'green': 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300',
    'yellow': 'bg-gradient-to-br from-yellow-300 to-yellow-500 border-yellow-200',
    'orange': 'bg-gradient-to-br from-orange-400 to-orange-600 border-orange-300',
    'red': 'bg-gradient-to-br from-rose-400 to-rose-600 border-rose-300',
    'purple': 'bg-gradient-to-br from-violet-400 to-violet-600 border-violet-300',
    'pink': 'bg-gradient-to-br from-pink-400 to-pink-600 border-pink-300',
};

type Shape = {
    matrix: number[][]; // 1 for block, 0 for empty
    id: string;
    color: string;
    typeId: number; 
};

// Shape Definitions (Standard Block Blast Set)
const SHAPES_DB = [
    // 1. Single Dot (Simple)
    { matrix: [[1]], color: 'blue' },
    // 2. Lines
    { matrix: [[1, 1]], color: 'cyan' },
    { matrix: [[1], [1]], color: 'cyan' },
    { matrix: [[1, 1, 1]], color: 'orange' },
    { matrix: [[1], [1], [1]], color: 'orange' },
    { matrix: [[1, 1, 1, 1]], color: 'red' }, // 4
    { matrix: [[1], [1], [1], [1]], color: 'red' },
    { matrix: [[1, 1, 1, 1, 1]], color: 'yellow' }, // 5
    // 3. Squares
    { matrix: [[1, 1], [1, 1]], color: 'green' }, // 2x2
    { matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: 'purple' }, // 3x3
    // 4. L Shapes
    { matrix: [[1, 0], [1, 0], [1, 1]], color: 'pink' }, // L
    { matrix: [[0, 1], [0, 1], [1, 1]], color: 'pink' }, // J (inverse L)
    { matrix: [[1, 1, 1], [1, 0, 0]], color: 'pink' },
    { matrix: [[1, 1, 1], [0, 0, 1]], color: 'pink' },
    // 5. Small Corners
    { matrix: [[1, 1], [1, 0]], color: 'blue' },
    { matrix: [[1, 1], [0, 1]], color: 'blue' },
    { matrix: [[1, 0], [1, 1]], color: 'blue' },
    { matrix: [[0, 1], [1, 1]], color: 'blue' },
    // 6. T Shapes
    { matrix: [[1, 1, 1], [0, 1, 0]], color: 'purple' },
    { matrix: [[0, 1, 0], [1, 1, 1]], color: 'purple' },
    { matrix: [[1, 0], [1, 1], [1, 0]], color: 'purple' },
    { matrix: [[0, 1], [1, 1], [0, 1]], color: 'purple' },
    // 7. Z / S Shapes
    { matrix: [[1, 1, 0], [0, 1, 1]], color: 'red' },
    { matrix: [[0, 1, 1], [1, 1, 0]], color: 'green' },
    { matrix: [[1, 0], [1, 1], [0, 1]], color: 'red' },
    { matrix: [[0, 1], [1, 1], [1, 0]], color: 'green' },
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

    playSFX(type: 'pickup' | 'place' | 'clear' | 'combo' | 'gameover') {
        if (this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        switch(type) {
            case 'pickup':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.linearRampToValueAtTime(600, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'place':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(200, now); // Thud sound
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'clear':
                // Bright chime
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;
            case 'combo':
                // Ascending chord
                [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
                     const o = this.ctx!.createOscillator();
                     const g = this.ctx!.createGain();
                     o.connect(g);
                     g.connect(this.ctx!.destination);
                     o.type = 'square';
                     o.frequency.setValueAtTime(f, now + i*0.05);
                     g.gain.setValueAtTime(0.05, now + i*0.05);
                     g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                     o.start(now + i*0.05);
                     o.stop(now + 0.4);
                });
                break;
            case 'gameover':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
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
        const sequence = [329.63, 392.00, 440.00, 392.00, 329.63, 293.66, 261.63, 293.66];
        this.bgmInterval = window.setInterval(() => {
            if (this.isMuted) return;
            // Very soft background melody
            this.playTone(sequence[this.noteIndex % sequence.length], 'sine', 0.2, 0.03);
            this.noteIndex++;
        }, 500);
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
    
    // Animation States
    const [clearingRows, setClearingRows] = useState<number[]>([]);
    const [clearingCols, setClearingCols] = useState<number[]>([]);
    const [comboCount, setComboCount] = useState(0); // Consecutive moves with clears
    const [streakText, setStreakText] = useState<{text: string, scale: number} | null>(null); // For "Great!", "Excellent!"
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
        const loadRank = async () => {
            if (activeTab === 'rank') {
                const data = await fetchGameLeaderboard('block_blast');
                setLeaderboard(data);
            }
        };
        loadRank();
    }, [activeTab]);

    useEffect(() => {
        synth.isMuted = isMuted;
    }, [isMuted]);

    useEffect(() => {
        return () => synth.stopBGM();
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

    // --- LOGIC: Shape Generation ---
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

    const generateNewShapes = (currentGrid: (string | null)[][]) => {
        const newShapes: Shape[] = [];
        const isEmptyBoard = currentGrid.every(row => row.every(cell => cell === null));
        
        // 1. Identify Valid Shapes
        const validShapes = SHAPES_DB.filter(s => isShapePlaceable(currentGrid, s.matrix));
        
        // 2. Generate 3 Shapes
        for (let i = 0; i < 3; i++) {
            let selectedDef;
            
            // First hand logic: If board is empty, force at least one complex shape (not single dot or small line)
            if (isEmptyBoard && i === 0) {
                // Filter out simple shapes (matrix size < 2)
                const complexShapes = SHAPES_DB.filter(s => {
                    const blockCount = s.matrix.flat().filter(x => x === 1).length;
                    return blockCount > 2;
                });
                selectedDef = complexShapes[Math.floor(Math.random() * complexShapes.length)];
            } else if (i === 0 && validShapes.length > 0 && Math.random() < 0.8) {
                // Guaranteed playable if possible (80% chance for first slot)
                selectedDef = validShapes[Math.floor(Math.random() * validShapes.length)];
            } else {
                // Random
                selectedDef = SHAPES_DB[Math.floor(Math.random() * SHAPES_DB.length)];
            }

            newShapes.push({
                matrix: selectedDef.matrix,
                id: Math.random().toString(36).substr(2, 9),
                color: SHAPE_COLORS[selectedDef.color],
                typeId: SHAPES_DB.indexOf(selectedDef)
            });
        }

        // Shuffle to hide which one is the "safe" one
        return newShapes.sort(() => 0.5 - Math.random());
    };

    const startGame = () => {
        if (user.dailyPlays >= MAX_PLAYS) {
            alert("今日遊玩次數已達 15 次上限！");
            return;
        }
        onUpdateHearts(user.dailyPlays + 1);
        
        synth.init();
        synth.playSFX('pickup');
        synth.startBGM();

        const emptyGrid = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
        setGrid(emptyGrid);
        setScore(0);
        setComboCount(0);
        setGameOver(false);
        setGameStarted(true);
        setDockShapes(generateNewShapes(emptyGrid));
    };

    const checkGameOver = useCallback((currentGrid: (string | null)[][], currentDock: (Shape | null)[]) => {
        const availableShapes = currentDock.filter(s => s !== null);
        if (availableShapes.length === 0) return false;

        for (const shape of availableShapes) {
            if (!shape) continue;
            if (isShapePlaceable(currentGrid, shape.matrix)) {
                return false;
            }
        }
        return true;
    }, []);

    // --- Drag Handlers ---
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent, index: number) => {
        if (gameOver) return;
        const shape = dockShapes[index];
        if (!shape) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        synth.playSFX('pickup');
        vibrate(10);

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

        // More forgiving drop logic: Round to nearest cell
        const col = Math.round(relativeX / boardCellSize);
        const row = Math.round(relativeY / boardCellSize);

        // Basic boundary check to prevent out of bounds logic
        if (row < -2 || row > BOARD_SIZE + 1 || col < -2 || col > BOARD_SIZE + 1) {
            return null;
        }

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

    // --- Core Gameplay Logic ---
    const placeShape = (r: number, c: number, shape: Shape, dockIndex: number) => {
        synth.playSFX('place');
        vibrate(15);
        
        const newGrid = grid.map(row => [...row]);
        let cellsFilled = 0;

        for (let i = 0; i < shape.matrix.length; i++) {
            for (let j = 0; j < shape.matrix[i].length; j++) {
                if (shape.matrix[i][j] === 1) {
                    newGrid[r + i][c + j] = shape.color;
                    cellsFilled++;
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
        
        // Scoring Logic (Market Standard)
        // 1. Placement Score: Number of cells placed
        let moveScore = cellsFilled; 

        if (linesCleared > 0) {
            const newCombo = comboCount + 1;
            setComboCount(newCombo);
            
            // 2. Line Clear Score: 10 per line
            const baseClearScore = linesCleared * 10;
            
            // 3. Multi-Line Bonus (Streak): Clearing multiple lines at once
            // e.g. 2 lines -> 20, 3 lines -> 60, 4 lines -> 100 extra?
            // Simplified: Lines * Lines * 10
            const streakBonus = linesCleared * linesCleared * 5; 

            // 4. Combo Bonus: Multiplier based on consecutive clears
            const comboBonus = newCombo * 10;

            moveScore += baseClearScore + streakBonus + comboBonus;
            
            setClearingRows(rowsToClear);
            setClearingCols(colsToClear);
            
            synth.playSFX(linesCleared > 1 || newCombo > 1 ? 'combo' : 'clear');
            vibrate(linesCleared * 30);
            
            // Visual Feedback
            if (linesCleared > 1) {
                setStreakText({ text: linesCleared > 2 ? "AMAZING!" : "GREAT!", scale: 1.5 });
            } else if (newCombo > 1) {
                setStreakText({ text: `COMBO x${newCombo}`, scale: 1 + (newCombo * 0.1) });
            }
            setScreenShake(true);

            setTimeout(() => {
                setScreenShake(false);
                setStreakText(null);
                
                const finalGrid = newGrid.map(row => [...row]);
                rowsToClear.forEach(ri => finalGrid[ri].fill(null));
                colsToClear.forEach(ci => { for(let row=0; row<BOARD_SIZE; row++) finalGrid[row][ci] = null; });

                setGrid(finalGrid);
                setClearingRows([]);
                setClearingCols([]);
                checkRegenAndGameOver(finalGrid, newDock, score + moveScore);
            }, 350); // Delay for animation
        } else {
            // Combo Breaker
            setComboCount(0);
            setGrid(newGrid);
            checkRegenAndGameOver(newGrid, newDock, score + moveScore);
        }
    };

    const checkRegenAndGameOver = (currentGrid: (string|null)[][], currentDock: (Shape|null)[], newScore: number) => {
        let nextDock = currentDock;
        
        // Regenerate if empty
        if (currentDock.every(s => s === null)) {
            nextDock = generateNewShapes(currentGrid);
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
            await submitGameScore(user, score, 'block_blast');
            // PT Reward Logic: 100 Score = 1 PT. Bonus 50PT for > 5000.
            let pt = Math.floor(score / 100);
            if (score >= 5000) pt += 50;
            
            await onFinish({ score, maxCombo: 0, correctCount: Math.floor(pt) }); 
            onBack();
        } catch(e) {
            alert("上傳失敗，請檢查網路");
            onBack();
        }
    };

    // Render Helpers
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
                            className={`rounded-md border ${cell ? shape.color : 'bg-transparent border-transparent'}`}
                            style={{ opacity: cell ? 1 : 0 }}
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
        
        const isValid = canPlace(grid, draggingShape.shape.matrix, r, c);

        const ghosts = [];
        for (let i = 0; i < draggingShape.shape.matrix.length; i++) {
            for (let j = 0; j < draggingShape.shape.matrix[i].length; j++) {
                if (draggingShape.shape.matrix[i][j] === 1) {
                    ghosts.push(
                        <div 
                            key={`ghost-${i}-${j}`}
                            className={`absolute rounded-md box-border z-0 ${isValid ? 'bg-white/30' : 'bg-red-500/30'}`}
                            style={{
                                width: `${boardCellSize - 3}px`,
                                height: `${boardCellSize - 3}px`,
                                left: `${(c + j) * boardCellSize + 1.5}px`,
                                top: `${(r + i) * boardCellSize + 1.5}px`,
                                pointerEvents: 'none'
                            }}
                        />
                    );
                }
            }
        }
        return <>{ghosts}</>;
    };

    // --- UI Render ---
    return (
        <div 
            className={`fixed inset-0 z-50 bg-[#181825] flex flex-col items-center select-none overflow-hidden ${screenShake ? 'animate-[shake_0.2s_ease-in-out]' : ''}`} 
            style={{ touchAction: 'none' }}
        >
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px) rotate(-1deg); }
                    75% { transform: translateX(5px) rotate(1deg); }
                }
                .bg-grid-pattern {
                    background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
                    background-size: 20px 20px;
                }
            `}</style>

            {/* Header */}
            <div className="w-full bg-[#11111b] p-4 pt-safe flex justify-between items-center shadow-md z-10 border-b border-[#313244]">
                <button onClick={() => { synth.stopBGM(); onBack(); }} className="p-2 -ml-2 rounded-full hover:bg-gray-800 text-gray-400 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">SCORE</span>
                    <span className="text-3xl font-black text-white font-mono leading-none tracking-tight">{score}</span>
                </div>
                <div className="flex gap-3">
                    {!gameStarted && (
                        <button onClick={() => setShowHelp(true)} className="text-gray-500 hover:text-white transition-colors">
                            <BookOpen size={20}/>
                        </button>
                    )}
                    <button onClick={() => setIsMuted(!isMuted)} className="text-gray-500 hover:text-white transition-colors">
                        {isMuted ? <VolumeX size={20}/> : <Volume2 size={20}/>}
                    </button>
                    {gameStarted && (
                        <button onClick={startGame} className="text-gray-500 hover:text-white transition-colors"><RefreshCw size={20}/></button>
                    )}
                </div>
            </div>

            {/* Background Pattern */}
            <div className="absolute inset-0 bg-grid-pattern opacity-50 pointer-events-none z-0"></div>

            {!gameStarted ? (
                // --- Start Menu ---
                <div className="flex-1 w-full max-w-md flex flex-col overflow-hidden relative z-10">
                    <div className="flex bg-[#1e1e2e] p-1 mx-6 mt-4 rounded-xl border border-[#313244]">
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
                        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-10 animate-in fade-in zoom-in duration-300">
                            <div className="text-center">
                                <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-3xl mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.4)] mb-6 rotate-6 hover:rotate-12 transition-transform duration-500 border-4 border-white/10">
                                    <Grid3X3 size={48} className="text-white drop-shadow-md" />
                                </div>
                                <h1 className="text-4xl font-black text-white tracking-tighter mb-2">BLOCK BLAST</h1>
                                <p className="text-gray-400 font-medium text-sm">拖曳方塊 • 消除連擊 • 挑戰高分</p>
                            </div>

                            <div className="w-full space-y-4">
                                <button 
                                    onClick={startGame}
                                    className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-xl shadow-[0_10px_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-3 transition-all active:scale-95 active:shadow-none border-t border-white/20"
                                >
                                    <Zap size={24} className="fill-white" />
                                    開始遊戲
                                </button>
                                <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-500 bg-[#1e1e2e] py-2 px-4 rounded-full w-fit mx-auto border border-[#313244]">
                                    <Flame size={12} className="text-orange-500" />
                                    消耗 1 愛心 • 剩餘: {Math.max(0, MAX_PLAYS - user.dailyPlays)}
                                </div>
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
                                    <div key={idx} className="bg-[#1e1e2e] p-4 rounded-xl flex items-center border border-[#313244] shadow-sm">
                                        <div className={`w-8 text-center font-black text-lg italic ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-orange-500' : 'text-blue-300'}`}>
                                            {entry.rank}
                                        </div>
                                        <div className={`w-10 h-10 rounded-full mx-3 ${entry.avatarColor} flex items-center justify-center font-bold text-white text-xs ${getFrameStyle(entry.avatarFrame)} overflow-hidden`}>
                                            {entry.name[0]}
                                        </div>
                                        <div className="flex-1">
                                            <span className="font-bold text-sm text-white block">{entry.name}</span>
                                            <span className="text-[10px] text-gray-500 font-mono">Score</span>
                                        </div>
                                        <div className="font-mono font-bold text-blue-400 text-lg">
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
                <div className="flex-1 w-full max-w-md flex flex-col items-center justify-center p-4 relative z-10">
                    
                    {/* The Grid Container */}
                    <div 
                        ref={gridRef}
                        className="bg-[#11111b] p-3 rounded-xl shadow-2xl relative border-4 border-[#313244]"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
                            width: 'min(90vw, 360px)',
                            aspectRatio: '1/1',
                            gap: '4px' 
                        }}
                    >
                        {grid.map((row, r) => 
                            row.map((cellColor, c) => {
                                const isClearing = clearingRows.includes(r) || clearingCols.includes(c);
                                return (
                                    <div 
                                        key={`${r}-${c}`}
                                        className={`
                                            rounded-md transition-all duration-300 border
                                            ${cellColor ? cellColor : 'bg-[#1e1e2e] border-transparent'}
                                            ${isClearing ? 'scale-0 opacity-0 bg-white brightness-200' : 'scale-100 opacity-100'}
                                        `}
                                        style={{
                                            boxShadow: cellColor ? 'inset 0 2px 4px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.2)' : 'inset 0 0 5px rgba(0,0,0,0.5)'
                                        }}
                                    ></div>
                                );
                            })
                        )}
                        {renderGhost()}
                        
                        {/* Streak Text Overlay */}
                        {streakText && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                                <div 
                                    className="text-5xl font-black text-yellow-400 drop-shadow-[0_4px_0_rgba(0,0,0,0.5)] italic tracking-tighter stroke-black animate-bounce"
                                    style={{ transform: `scale(${streakText.scale})` }}
                                >
                                    {streakText.text}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Dock (Shapes) */}
                    <div className="mt-8 w-full flex justify-between items-center px-2 h-32 gap-3">
                        {dockShapes.map((shape, idx) => {
                            const isBeingDragged = draggingShape?.index === idx;
                            return (
                                <div 
                                    key={idx} 
                                    className={`
                                        flex-1 aspect-square flex items-center justify-center rounded-2xl transition-all duration-150 relative
                                        ${shape && !isBeingDragged ? 'bg-[#1e1e2e] border-2 border-[#313244] shadow-lg active:scale-95' : ''}
                                        ${!shape ? 'opacity-0 pointer-events-none' : ''}
                                    `}
                                    onMouseDown={(e) => handleDragStart(e, idx)}
                                    onTouchStart={(e) => handleDragStart(e, idx)}
                                >
                                    {shape && !isBeingDragged && renderShapePreview(shape, 14)} 
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
                                transform: `translate(-50%, -50%) translateY(-${TOUCH_OFFSET_Y}px) scale(1.05)`, // Fixed Scaling Bug: Reduced to 1.05
                            }}
                        >
                            {renderShapePreview(draggingShape.shape, boardCellSize)}
                        </div>,
                        document.body
                    )}

                    {/* Game Over Overlay */}
                    {gameOver && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#181825]/95 backdrop-blur-md rounded-xl animate-in fade-in duration-300">
                            <div className="w-full max-w-xs p-8 text-center">
                                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce border-2 border-red-500/50">
                                    <XCircle size={40} className="text-red-500" />
                                </div>
                                <h2 className="text-3xl font-black text-white mb-1">NO MOVES!</h2>
                                <p className="text-gray-400 text-sm mb-6 font-bold uppercase tracking-widest">Game Over</p>
                                
                                <div className="bg-[#11111b] border border-[#313244] p-6 rounded-2xl mb-8 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-blue-500/5"></div>
                                    <div className="text-xs text-blue-400 font-bold uppercase mb-1">Final Score</div>
                                    <div className="text-5xl font-mono font-black text-white tracking-tighter">{score}</div>
                                    
                                    <div className="mt-4 pt-4 border-t border-[#313244] flex justify-between items-center text-xs">
                                        <span className="text-gray-500">PT Earned</span>
                                        <span className="text-yellow-400 font-bold flex items-center gap-1">
                                            <Coins size={12}/> +{Math.floor(score/100) + (score >= 5000 ? 50 : 0)}
                                        </span>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleSubmitScore}
                                    className="w-full py-4 bg-white text-[#181825] rounded-xl font-black text-lg shadow-xl hover:scale-105 transition-transform flex items-center justify-center gap-2"
                                >
                                    <Crown size={20} className="text-yellow-500 fill-current" />
                                    領取獎勵並結束
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
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <BookOpen size={24} className="text-blue-400"/> 遊戲規則
                            </h3>
                            <button onClick={() => setShowHelp(false)} className="bg-gray-700 p-2 rounded-full text-white hover:bg-gray-600 transition-colors">
                                <X size={16}/>
                            </button>
                        </div>
                        <div className="space-y-4 text-sm text-gray-300">
                            <div className="bg-[#1e1e2e] p-4 rounded-xl border border-gray-700">
                                <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Zap size={16} className="text-yellow-400 fill-current"/> 智慧生成 v2.0</h4>
                                <p className="text-xs leading-relaxed text-gray-400">
                                    系統會確保每次生成的 3 個方塊中，<span className="text-green-400 font-bold">至少有 1 個</span>可以放入當前棋盤，大幅降低死局機率。
                                </p>
                            </div>
                            
                            <div className="bg-[#1e1e2e] p-4 rounded-xl border border-gray-700">
                                <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Trophy size={16} className="text-blue-400 fill-current"/> 計分規則</h4>
                                <ul className="text-xs space-y-2 list-disc list-inside text-gray-400">
                                    <li><span className="text-white">放置</span>：方塊格數 (例如 4格 = 4分)</li>
                                    <li><span className="text-white">消除</span>：每行/列 10 分</li>
                                    <li><span className="text-white">連擊 (Combo)</span>：連續消除回合，分數 x Combo數</li>
                                    <li><span className="text-white">多行 (Streak)</span>：一次消除多行，分數指數加成！</li>
                                </ul>
                            </div>
                        </div>
                        <button onClick={() => setShowHelp(false)} className="w-full mt-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors">了解</button>
                    </div>
                </div>
            )}
        </div>
    );
};

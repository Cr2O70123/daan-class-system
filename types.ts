
import React from 'react';

export enum Tab {
  HOME = 'HOME',
  ASK = 'ASK', // Hidden from nav, triggered by FAB
  RESOURCE = 'RESOURCE', 
  AI_TUTOR = 'AI_TUTOR', 
  PLAYGROUND = 'PLAYGROUND', 
  EXAM = 'EXAM', 
  STORE = 'STORE',
  LEADERBOARD = 'LEADERBOARD', 
  PROFILE = 'PROFILE', 
}

export interface AppSettings {
  darkMode: boolean;
  notifications: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

// Helper interface for DB storage JSON
export interface AvatarData {
  color: string;
  image?: string;
  frame?: string;
  nameColor?: string;
}

export interface User {
  name: string;
  studentId: string;
  avatarColor: string;
  avatarImage?: string; 
  avatarFrame?: string;
  profileBackgroundImage?: string; // New: Profile Cover Image
  points: number; // Current Currency
  lifetimePoints?: number; // Total XP for Leveling (Never decreases)
  level: number;
  isAdmin?: boolean;
  inventory: string[];
  settings?: AppSettings;
  nameColor?: string;
  
  // Game System (New Unified Limit)
  dailyPlays: number; // Count up to 15
  lastDailyReset: string; // Date string to track daily reset
  // hearts: number; // Deprecated

  // Personalization
  lastNicknameChange?: number; // Timestamp

  // Lucky Wheel System (New)
  dailyWheelSpins?: number; // Track spins used today
  lastWheelDate?: string; // Track date of last spin

  // PK Rank System (New)
  pkRating?: number; // Classic Mode Rating
  pkRatingOverload?: number; // Overload Mode Rating

  // Check-in System
  lastCheckInDate?: string;
  checkInStreak?: number;

  // Moderation
  isBanned?: boolean;
  banExpiresAt?: string;

  // Notifications (HBuilderX)
  pushClientId?: string;
}

export interface Notification {
  id: number;
  userId: string;
  type: 'reply' | 'system' | 'rank' | 'checkin';
  title: string;
  content: string;
  link?: string; // Optional: ID to navigate to (e.g., Question ID)
  isRead: boolean;
  createdAt: string;
}

export interface Reply {
  id: number;
  author: string;
  content: string;
  image?: string; 
  date: string;
  avatarColor: string;
  avatarImage?: string;
  avatarFrame?: string;
  nameColor?: string;
  isAi?: boolean; 
  isBestAnswer?: boolean;
}

export interface Question {
  id: number;
  title: string;
  content: string;
  image?: string;
  author: string;
  date: string;
  tags: string[];
  status: 'solved' | 'open';
  replyCount: number;
  views: number;
  replies: Reply[];
  authorAvatarColor?: string;
  authorAvatarImage?: string;
  authorAvatarFrame?: string;
  authorNameColor?: string;
  isAnonymous?: boolean; // New: Anonymous flag
}

export interface Resource {
  id: number;
  title: string;
  description: string;
  images?: string[];
  tags: string[];
  author: string;
  authorAvatarColor: string;
  authorAvatarImage?: string;
  authorAvatarFrame?: string;
  authorNameColor?: string;
  date: string;
  likes: number;
  likedBy: string[];
}

export interface Exam {
  id: number;
  subject: string;
  title: string;
  date: string; 
  time: string; 
  author: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  studentId: string;
  points: number;
  level: number; // New
  avatarColor: string;
  avatarImage?: string;
  avatarFrame?: string;
  checkInStreak?: number; // New
  lastCheckInDate?: string; // New
}

export interface Product {
  id: string;
  name: string;
  price: number;
  icon: React.ReactNode;
  color: string;
  description: string;
  category: 'tool' | 'cosmetic' | 'frame' | 'consumable';
  isRare?: boolean; // New: For shiny effect
  tag?: string; // New: For labels like "Sale"
}

export interface Report {
  id: number;
  targetType: 'question' | 'reply';
  targetId: number;
  reason: string;
  contentSnippet: string;
  reporter: string;
}

// --- Word Challenge Types ---
export type WordLevel = 3 | 4 | 5 | 6;

export interface Word {
  id: number;
  en: string;
  zh: string;
  level: WordLevel;
  example?: string; // New
  definition?: string; // New
  partOfSpeech?: string; // New (v., n., adj.)
}

export interface GameResult {
  score: number;
  maxCombo: number;
  correctCount: number;
}

// --- PK Game Types (Realtime) ---
export interface PkMistake {
    word: Word;
    correctAnswer: string;
    timestamp: number;
}

export interface PkResult {
  isWin: boolean;
  score: number;
  ratingChange: number; // New
  opponentName: string;
  mistakes?: PkMistake[]; // New: For review
  reason?: 'normal' | 'surrender' | 'opponent_left' | 'timeout'; // New
  mode?: PkGameMode; // Return the mode played
}

export interface PkPlayerState {
    studentId: string;
    name: string;
    avatarColor: string;
    avatarImage?: string;
    avatarFrame?: string;
    level: number;
    pkRating?: number; // New
    status: 'idle' | 'matched' | 'playing';
    roomId?: string;
    joinedAt: number; // Timestamp for FIFO queue
    isAi?: boolean; // New: Flag for AI players
}

// Skills (Updated for Overload Arena)
export type SkillType = 'HEAL' | 'SHIELD' | 'CRIT' | 'BLIND' | 'MIRROR' | 'CHAOS' | 'FIFTY_FIFTY' | 'NONE';

export interface BattleCard {
    type: 'WORD' | 'SKILL';
    word?: Word;
    skill?: SkillType;
    id: string; // Unique ID for selection
}

export type PkGameMode = 'CLASSIC' | 'OVERLOAD';
export type OverloadLevel = 1 | 2 | 3;

export interface PkGamePayload {
    type: 'START_GAME' | 'SEND_ACTION' | 'REPORT_RESULT' | 'GAME_OVER' | 'SURRENDER' | 'OPPONENT_LEFT';
    
    // START_GAME
    attackerId?: string; // JSON of user profile or 'ai_bot'
    gameMode?: PkGameMode; // New

    // SEND_ACTION (Attack Phase)
    wordId?: number; // If word attack
    skill?: SkillType; // If skill used
    chargeLevel?: OverloadLevel; // New: For Overload Mode
    
    // REPORT_RESULT (Defense Phase Result)
    defenderId?: string;
    damageTaken?: number; 
    isCorrect?: boolean;
    isPerfectParry?: boolean; // New: For Overload Mode
    backlashDamage?: number; // New: For Overload Mode (Damage returned to attacker)

    // GAME_OVER / SURRENDER
    winnerId?: string;
}

export interface GameLeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  avatarColor: string;
  avatarFrame?: string;
}

// --- Resistor Game Types ---
export interface ResistorColor {
  name: string;
  value: number; // Digit value (0-9) or -1 for none
  multiplier: number; // 10^x
  tolerance: number | null; // %
  hex: string;
  textColor: string;
}

export interface ResistorTask {
  resistance: number; // e.g. 4700 (4.7k)
  toleranceValue: number; // e.g. 5 (%)
  displayValue: string; // "4.7 kΩ"
  bands: number; // 4 or 5
  correctColors: string[]; // ['Yellow', 'Violet', 'Red', 'Gold']
}

// --- Draw & Guess Types ---
export interface DrawPoint {
    x: number;
    y: number;
}

export interface DrawStroke {
    points: DrawPoint[];
    color: string;
    width: number;
    isEraser?: boolean;
}

export interface DrawEvent {
    type: 'DRAW_START' | 'DRAW_MOVE' | 'DRAW_END' | 'CLEAR' | 'UNDO';
    payload?: any;
    userId?: string;
}

export interface ChatMsg {
    id: string;
    sender: string;
    text: string;
    isSystem?: boolean;
}

// --- New: Visual Vocab Types ---
export type DrawDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface DrawGuessWord {
    en: string;
    zh: string;
    difficulty: DrawDifficulty;
    category: string; // 'General', 'Food', 'Pokemon' etc.
    points: number; // 1, 2, or 3
}

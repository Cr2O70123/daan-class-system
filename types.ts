
import React from 'react';

export enum Tab {
  HOME = 'HOME',
  ASK = 'ASK', // Hidden from nav, triggered by FAB
  RESOURCE = 'RESOURCE', 
  PLAYGROUND = 'PLAYGROUND', // New: Replaces Exam in Nav
  EXAM = 'EXAM', // Kept for data structure but moved out of main nav
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
  points: number; // Current Currency
  lifetimePoints?: number; // Total XP for Leveling (Never decreases)
  level: number;
  isAdmin?: boolean;
  inventory: string[];
  settings?: AppSettings;
  nameColor?: string;
  
  // Game System
  hearts: number; // Max 3
  lastHeartReset: string; // Date string to track daily reset

  // Lucky Wheel System (New)
  dailyWheelSpins?: number; // Track spins used today
  lastWheelDate?: string; // Track date of last spin

  // PK Rank System (New)
  pkRating?: number; // ELO-like rating for PK

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
}

export type SkillType = 'HEAL' | 'SHIELD' | 'CRIT' | 'BLIND' | 'NONE';

export interface BattleCard {
    type: 'WORD' | 'SKILL';
    word?: Word;
    skill?: SkillType;
    id: string; // Unique ID for selection
}

export interface PkGamePayload {
    type: 'START_GAME' | 'SEND_ACTION' | 'REPORT_RESULT' | 'GAME_OVER' | 'SURRENDER' | 'OPPONENT_LEFT';
    
    // SEND_ACTION (Attack Phase)
    attackerId?: string;
    wordId?: number; // If word attack
    skill?: SkillType; // If skill used
    
    // REPORT_RESULT (Defense Phase Result)
    defenderId?: string;
    damageTaken?: number; 
    isCorrect?: boolean;

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

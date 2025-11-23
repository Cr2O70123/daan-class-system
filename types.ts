import React from 'react';

export enum Tab {
  HOME = 'HOME',
  ASK = 'ASK', // Hidden from nav, triggered by FAB
  RESOURCE = 'RESOURCE', // New Tab
  EXAM = 'EXAM', // New Tab
  STORE = 'STORE',
  LEADERBOARD = 'LEADERBOARD', // Accessed from Profile
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
  points: number;
  level: number;
  isAdmin?: boolean;
  inventory: string[];
  settings?: AppSettings;
  nameColor?: string;
  
  // Game System
  hearts: number; // Max 3
  lastHeartReset: string; // Date string to track daily reset

  // Moderation
  isBanned?: boolean;
  banExpiresAt?: string;
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
}

export interface Product {
  id: string;
  name: string;
  price: number;
  icon: React.ReactNode;
  color: string;
  description: string;
  category: 'tool' | 'cosmetic' | 'frame';
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

export interface GameLeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  avatarColor: string;
  avatarFrame?: string;
}
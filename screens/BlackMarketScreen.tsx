
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, ShoppingBag, Shield, Skull, Zap, Crown, UserMinus, Volume2, Gem, TrendingUp, TrendingDown, Users, ArrowRightLeft, Database, Eye, Activity, Target, AlertTriangle, Siren, Crosshair, Loader2, RefreshCw, Plus, Minus, Info, Box, HelpCircle, FileText } from 'lucide-react';
import { User, Product } from '../types';
import { updateUserInDb } from '../services/authService';
import { transferBlackCoins, fetchBlackMarketStats, fetchUserListLite } from '../services/dataService';
import { createNotification } from '../services/notificationService';

interface BlackMarketScreenProps {
  user: User;
  onBack: () => void;
  onBuy: (product: Product) => void;
  setUser: (user: User) => void;
}

// Define Icon first to avoid reference errors
const TerminalIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
);

const getDynamicPrice = (base: number, multiplier: number) => {
    return Math.ceil(base * multiplier);
};

const BLACK_MARKET_ITEMS: Product[] = [
    { id: 'chip_basic', name: '基礎破解晶片', price: 200, currency: 'BMC', color: 'bg-blue-900 text-blue-300', icon: <TerminalIcon />, description: '嘗試駭入他人帳戶 (30% 成功率)', category: 'black_market', tag: '消耗品' },
    { id: 'chip_adv', name: '高階滲透軟體', price: 800, currency: 'BMC', color: 'bg-red-900 text-red-300', icon: <Skull size={20}/>, description: '高機率駭入他人帳戶 (60% 成功率)', category: 'black_market', tag: '消耗品' },
    { id: 'item_
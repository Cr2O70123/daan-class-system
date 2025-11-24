import { ResistorColor, ResistorTask } from '../types';

export const RESISTOR_COLORS: ResistorColor[] = [
  { name: 'Black', value: 0, multiplier: 1, tolerance: null, hex: '#000000', textColor: 'text-white' },
  { name: 'Brown', value: 1, multiplier: 10, tolerance: 1, hex: '#8B4513', textColor: 'text-white' },
  { name: 'Red', value: 2, multiplier: 100, tolerance: 2, hex: '#FF0000', textColor: 'text-white' },
  { name: 'Orange', value: 3, multiplier: 1000, tolerance: null, hex: '#FF8C00', textColor: 'text-black' },
  { name: 'Yellow', value: 4, multiplier: 10000, tolerance: null, hex: '#FFD700', textColor: 'text-black' },
  { name: 'Green', value: 5, multiplier: 100000, tolerance: 0.5, hex: '#008000', textColor: 'text-white' },
  { name: 'Blue', value: 6, multiplier: 1000000, tolerance: 0.25, hex: '#0000FF', textColor: 'text-white' },
  { name: 'Violet', value: 7, multiplier: 10000000, tolerance: 0.1, hex: '#8A2BE2', textColor: 'text-white' },
  { name: 'Gray', value: 8, multiplier: 100000000, tolerance: 0.05, hex: '#808080', textColor: 'text-white' },
  { name: 'White', value: 9, multiplier: 1000000000, tolerance: null, hex: '#FFFFFF', textColor: 'text-black' },
  { name: 'Gold', value: -1, multiplier: 0.1, tolerance: 5, hex: '#D4AF37', textColor: 'text-black' },
  { name: 'Silver', value: -1, multiplier: 0.01, tolerance: 10, hex: '#C0C0C0', textColor: 'text-black' },
];

// E12 Series (Standard resistor values)
const E12_BASE = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];

export const formatResistance = (ohms: number): string => {
  if (ohms >= 1000000) {
      const val = ohms / 1000000;
      return `${Number.isInteger(val) ? val : val.toFixed(1)} MΩ`;
  }
  if (ohms >= 1000) {
      const val = ohms / 1000;
      return `${Number.isInteger(val) ? val : val.toFixed(1)} kΩ`;
  }
  return `${Number.isInteger(ohms) ? ohms : ohms.toFixed(1)} Ω`;
};

const getColorsForValue4Band = (ohms: number, tolerance: number): string[] => {
    // 1. Normalize to 2 significant digits (E12)
    let temp = ohms;
    let multiplierPower = 0;
    
    // Adjust to be between 10 and 99
    while (temp >= 100) {
        temp /= 10;
        multiplierPower++;
    }
    while (temp < 10) {
        temp *= 10;
        multiplierPower--;
    }
    
    // E.g. 4700 -> 47 * 10^2
    const digit1 = Math.floor(temp / 10);
    const digit2 = Math.floor(temp % 10);
    
    // Find Colors
    const c1 = RESISTOR_COLORS.find(c => c.value === digit1)?.name || 'Black';
    const c2 = RESISTOR_COLORS.find(c => c.value === digit2)?.name || 'Black';
    
    // Multiplier logic
    // 47 * 10^2. Band 1(4), Band 2(7).
    // The multiplier band represents 10^x. 
    // Brown(10^1) -> 470. Red(10^2) -> 4700.
    // If original was 4.7 (E12 base is 47, so 47 * 10^-1), Gold(0.1)
    
    let multiplierColorName = 'Black';
    // Calculate multiplier needed to get from (digit1*10 + digit2) to ohms
    const baseVal = digit1 * 10 + digit2;
    const ratio = ohms / baseVal;
    
    // Match ratio to multiplier
    const mColor = RESISTOR_COLORS.find(c => Math.abs(c.multiplier - ratio) < 0.0001);
    if (mColor) multiplierColorName = mColor.name;
    
    // Tolerance
    const tColor = RESISTOR_COLORS.find(c => c.tolerance === tolerance)?.name || 'Gold';
    
    return [c1, c2, multiplierColorName, tColor];
};

const getColorsForValue5Band = (ohms: number, tolerance: number): string[] => {
    // 5 Band: 3 significant digits + Multiplier + Tolerance
    // Using E12 base for simplicity, but treating as 3 digits (e.g., 470)
    
    let temp = ohms;
    // Normalize to 3 sig figs (100 - 999)
    while (temp >= 1000) temp /= 10;
    while (temp < 100) temp *= 10;
    
    const digit1 = Math.floor(temp / 100);
    const digit2 = Math.floor((temp % 100) / 10);
    const digit3 = Math.floor(temp % 10);
    
    const c1 = RESISTOR_COLORS.find(c => c.value === digit1)?.name || 'Black';
    const c2 = RESISTOR_COLORS.find(c => c.value === digit2)?.name || 'Black';
    const c3 = RESISTOR_COLORS.find(c => c.value === digit3)?.name || 'Black';
    
    const baseVal = digit1 * 100 + digit2 * 10 + digit3;
    const ratio = ohms / baseVal;
    
    const mColor = RESISTOR_COLORS.find(c => Math.abs(c.multiplier - ratio) < 0.0001)?.name || 'Black';
    const tColor = RESISTOR_COLORS.find(c => c.tolerance === tolerance)?.name || 'Brown';
    
    return [c1, c2, c3, mColor, tColor];
};

export const generateResistorTask = (difficulty: 'easy' | 'medium' | 'hard'): ResistorTask => {
  // 1. Pick E12 Base
  const base = E12_BASE[Math.floor(Math.random() * E12_BASE.length)];
  
  // 2. Pick Multiplier Power (-1 to 6)
  // Easy: 10 ohm to 1M ohm (0 to 4)
  // Hard: include gold/silver logic more often?
  const minPow = difficulty === 'hard' ? -1 : 0;
  const maxPow = difficulty === 'hard' ? 6 : 5;
  const power = Math.floor(Math.random() * (maxPow - minPow + 1)) + minPow;
  
  let resistance = base * Math.pow(10, power);
  
  // Floating point correction
  resistance = parseFloat(resistance.toPrecision(3));

  let tolerance = 5; // Default Gold
  let bands = 4;

  if (difficulty === 'medium') {
      // 5% or 10%
      tolerance = Math.random() > 0.5 ? 5 : 10;
  } else if (difficulty === 'hard') {
      bands = 5;
      // 1% or 2% usually for 5-band precision
      const tols = [1, 2, 0.5];
      tolerance = tols[Math.floor(Math.random() * tols.length)];
  }

  let correctColors: string[];
  if (bands === 5) {
      correctColors = getColorsForValue5Band(resistance, tolerance);
  } else {
      correctColors = getColorsForValue4Band(resistance, tolerance);
  }

  return {
      resistance,
      toleranceValue: tolerance,
      displayValue: formatResistance(resistance),
      bands,
      correctColors
  };
};
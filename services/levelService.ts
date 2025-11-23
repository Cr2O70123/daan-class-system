
export const POINTS_PER_LEVEL = 500;

export const calculateLevel = (points: number): number => {
    // Level 1 starts at 0. Level 2 at 500, etc.
    return Math.floor(points / POINTS_PER_LEVEL) + 1;
};

export const calculateProgress = (points: number): number => {
    const currentLevelPoints = points % POINTS_PER_LEVEL;
    return Math.min(Math.floor((currentLevelPoints / POINTS_PER_LEVEL) * 100), 100);
};

export const getNextLevelThreshold = (level: number): number => {
    return level * POINTS_PER_LEVEL;
};
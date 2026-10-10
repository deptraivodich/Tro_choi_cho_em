export type GameId =
  | 'energy-defense'
  | 'planet-rescue'
  | 'terrain-racing'
  | 'race-to-finish'
  | 'block-island'
  | 'vault-code'
  | 'floating-market'
  | 'rhythm-bakery'
  | 'treasure-dive'
  | 'royal-artillery';

export type GameDifficulty = 'easy' | 'medium' | 'hard';

export interface GameMetadata {
  id: GameId;
  title: string;
  tagline: string;
  topic: string;
  mathSkill: string;
  description: string;
  recommendedGrade: string;
  durationMinutes: number;
  difficulty: GameDifficulty;
  accentColor: string;
  badgeText: string;
}

export interface GameSessionResult {
  sessionId: string;
  gameId: GameId;
  profileId: string;
  difficulty: GameDifficulty;
  startedAt: string;
  completedAt: string;
  actualPlaytimeSeconds: number;
  isWon: boolean;
  score: number;
  maxScore: number;
  correctCount: number;
  incorrectCount: number;
  skillsPracticed: string[];
  feedbackNotes?: string;
  schemaVersion: number;
}

export interface LocalUserProfile {
  profileId: string;
  displayName: string;
  avatarId: string;
  createdAt: string;
  lastActiveAt: string;
  settings: {
    soundEnabled: boolean;
    musicEnabled: boolean;
    reducedMotion: boolean;
    highContrast: boolean;
    testMode: boolean;
  };
}

export interface DailyQuotaStatus {
  date: string;
  vaultCodeCompleted: number;
  islandStaminaUsed: number;
  floatingMarketTrips: number;
}

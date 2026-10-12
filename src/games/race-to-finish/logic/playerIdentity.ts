import { CHARACTERS_META, CharacterId, GameMode } from '../types';

// Default bot names belong to the selected character, never to a setup slot.
// A name typed by the user belongs to the participant and survives character swaps.
export function defaultSetupName(mode: GameMode, index: number, character: CharacterId): string {
  if (mode === 'single') return index === 0 ? 'Em' : `${CHARACTERS_META[character].defaultPlayerName} Máy`;
  return `Người chơi ${index + 1}`;
}

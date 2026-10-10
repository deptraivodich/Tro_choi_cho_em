import { BonusEffectType, PenaltyEffectType, MysteryRollState } from '../types/index';
import { getPenaltyReelCards } from './gameEngine';

export const REEL_CARD_WIDTH = 90;
export const REEL_STRIDE = 98;
export function reelPlan(state: MysteryRollState) {
  const options: (BonusEffectType | PenaltyEffectType)[] = state.type === 'bonus'
    ? ['advance_1', 'advance_2', 'shield', 'cleanse'] : getPenaltyReelCards(state.tileId);
  const index = options.indexOf(state.result);
  if (index < 0) throw new Error('Invalid outcome for reel');
  const targetSlot = options.length * 4 + index;
  const slots = Array.from({ length: targetSlot + options.length + 1 }, (_, slot) => options[slot % options.length]);
  return { options, slots, targetSlot, targetX: -targetSlot * REEL_STRIDE };
}

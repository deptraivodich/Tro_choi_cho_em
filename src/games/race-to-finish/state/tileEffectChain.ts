export const MAX_CHAIN_EFFECTS = 8;

export interface TileEffectChain {
  id: number;
  turnId: number;
  playerIndex: number;
  currentTileId: string;
  triggeredTileIds: string[];
  effectCount: number;
  effectActionId: number;
}

// Called before drawing a result as well as before accepting LAND. Revisiting
// a tile still completes movement, but cannot consume RNG or open another reel.
export function canActivateTileEffect(chain: TileEffectChain | null, tileId: string): boolean {
  return !chain || (chain.effectCount < MAX_CHAIN_EFFECTS && !chain.triggeredTileIds.includes(tileId));
}

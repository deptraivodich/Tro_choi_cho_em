import { BOARD_TILES, getTile } from '../data/boardConfig';
import { Player } from '../types/index';

export interface TokenPlacement { x: number; y: number; size: number }
// Use the local track tangent for a compact symmetric arrangement on curves and forks.
export function tokenPlacements(players: Player[], width: number, height: number): Record<string, TokenPlacement> {
  const result: Record<string, TokenPlacement> = {};
  const groups = new Map<string, Player[]>();
  for (const player of players) groups.set(player.currentTileId, [...(groups.get(player.currentTileId) ?? []), player]);
  for (const [tileId, occupants] of groups) {
    const tile = getTile(tileId), cx = tile.xPercent * width / 100, cy = tile.yPercent * height / 100;
    const neighbours = Object.values(BOARD_TILES).filter(t => t.id !== tile.id).map(t => Math.hypot(t.xPercent * width / 100 - cx, t.yPercent * height / 100 - cy));
    const tileSize = Math.max(18, Math.min(48, ...neighbours));
    const baseSize = Math.max(28, Math.min(52, width * 0.05));
    const size = occupants.length > 1 ? Math.min(baseSize, tileSize * 0.9 + 10) : baseSize;
    const next = getTile(tile.nextTileIds.main ?? tile.id);
    const dx = (next.xPercent - tile.xPercent) * width, dy = (next.yPercent - tile.yPercent) * height;
    const length = Math.hypot(dx, dy) || 1;
    const tx = length === 1 ? 1 : dx / length, ty = length === 1 ? 0 : dy / length;
    const spacing = size * 0.8;
    occupants.sort((a, b) => a.id.localeCompare(b.id)).forEach((player, index) => {
      let ox = 0, oy = 0;
      if (occupants.length === 2) { ox = (index - 0.5) * spacing; }
      else if (occupants.length > 2) {
        const angle = -Math.PI / 2 + index * 2 * Math.PI / occupants.length;
        const radius = size * (occupants.length > 4 ? 0.85 : 0.62);
        ox = Math.cos(angle) * radius; oy = Math.sin(angle) * radius;
      }
      result[player.id] = {
        x: Math.max(0, Math.min(width - size, cx + ox * tx - oy * ty - size / 2)),
        y: Math.max(0, Math.min(height - size, cy + ox * ty + oy * tx - size * 0.85)), size,
      };
    });
  }
  return result;
}

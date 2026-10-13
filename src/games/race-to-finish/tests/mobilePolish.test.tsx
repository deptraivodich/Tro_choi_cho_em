import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { RaceHUD } from '../components/RaceHUD';
import { GameBoardView } from '../components/GameBoardView';
import { SPRITE_FRAMES, AVATAR_BOUNDS } from '../assets/spriteBounds';
import { CharacterType, CharacterPose } from '../assets';
import { Player } from '../types';

const roster: Player[] = (['fox', 'penguin', 'bunny', 'turtle'] as const).map((character, i) => ({
  id: `p${i + 1}`, name: character, character, isBot: i > 0, currentTileId: 'tile_0', position: 0,
  pathHistory: ['tile_0'], hasShield: false, cleanseCount: 0, skipNextTurn: false, currentPose: 'idle_1', rank: null,
}));
test.each([2, 3, 4])('HUD renders exactly %i actual participants and board renders each sprite once', count => {
  const players = roster.slice(0, count);
  const html = renderToStaticMarkup(<RaceHUD player={players[0]} players={players} canRoll intro={false}
    rolling={false} message="" onRoll={() => {}} onPause={() => {}} />);
  expect((html.match(/data-testid="race-avatar-p\d"/g) || []).length).toBe(count);
  const board = renderToStaticMarkup(<GameBoardView players={players} activePlayerIndex={0} boardWidth={1024}
    boardHeight={576} moving={false} paused={false} actionId={1} onMovementComplete={() => {}} />);
  expect((board.match(/data-testid="token-p\d"/g) || []).length).toBe(count);
  expect((board.match(/data-testid="player-sprite-clip"/g) || []).length).toBe(count);
  for (const absent of roster.slice(count)) { expect(html).not.toContain(`race-avatar-${absent.id}`); expect(board).not.toContain(`token-${absent.id}`); }
});

// Read the real PNG pixels; the asset mock cannot reveal sprite-sheet contamination.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Node-only pixel decoder has no TypeScript declarations here.
const { PNG } = require('pngjs');
test('cleaned header retains board dimensions and all pixels of the playable track and wooden title', () => {
  const before = PNG.sync.read(readFileSync(join(__dirname, '../assets/map_landscape_clean.png')));
  const after = PNG.sync.read(readFileSync(join(__dirname, '../assets/map_landscape_roster.png')));
  expect([after.width, after.height]).toEqual([1024, 576]);
  expect(after.data.subarray(90 * 1024 * 4).equals(before.data.subarray(90 * 1024 * 4))).toBe(true);
  for (let y = 0; y < 90; y++) expect(after.data.subarray(y * 1024 * 4, (y * 1024 + 350) * 4)
    .equals(before.data.subarray(y * 1024 * 4, (y * 1024 + 350) * 4))).toBe(true);
});
// Connected components at alpha > 10 identify the complete original drawings,
// rather than incorrectly accepting already truncated extracted PNGs as complete.
function components(png: { width: number; height: number; data: Buffer }): number[][] {
  const { width, height, data } = png, seen = new Uint8Array(width * height), result: number[][] = [];
  for (let pixel = 0; pixel < seen.length; pixel++) {
    if (seen[pixel] || data[pixel * 4 + 3] <= 10) continue;
    const queue = [pixel]; seen[pixel] = 1;
    for (let head = 0; head < queue.length; head++) {
      const index = queue[head], x = index % width, y = Math.floor(index / width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, next = ny * width + nx;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height || seen[next] || data[next * 4 + 3] <= 10) continue;
        seen[next] = 1; queue.push(next);
      }
    }
    result.push(queue);
  }
  return result.sort((a, b) => b.length - a.length);
}
const atlas = PNG.sync.read(readFileSync(join(__dirname, '../assets/raw/model_nv.png')));
const atlasParts = components(atlas).filter(part => part.length > 20);
const contains = (bounds: { x: number; y: number; width: number; height: number }, width: number, index: number) =>
  index % width >= bounds.x && index % width < bounds.x + bounds.width &&
  Math.floor(index / width) >= bounds.y && Math.floor(index / width) < bounds.y + bounds.height;

test.each(Object.entries(SPRITE_FRAMES).flatMap(([character, poses]) => Object.entries(poses).map(([pose, bounds]) =>
  [character as CharacterType, pose as CharacterPose, bounds] as const)))('%s/%s uses the complete original drawing without pixels from another character', (character, pose, bounds) => {
  expect([atlas.width, atlas.height]).toEqual([1024, 682]);
  const inside = (index: number) => contains(bounds, atlas.width, index);
  const touching = atlasParts.filter(part => part.some(inside));
  expect(touching).toHaveLength(1);
  expect(touching[0].every(inside)).toBe(true);
  // The intact rabbit has feet BELOW the old extraction's bottom (atlas y=512).
  if (character === 'bunny' && pose !== 'victory')
    expect(touching[0].filter(index => Math.floor(index / atlas.width) > 512).length).toBeGreaterThan(200);
});

test.each(Object.entries(AVATAR_BOUNDS))('%s portrait keeps its own face and excludes neighbouring feet', (character, bounds) => {
  const png = PNG.sync.read(readFileSync(join(__dirname, '../assets/characters', `${character}_avatar.png`)));
  const parts = components(png), inside = (index: number) => contains(bounds, png.width, index);
  expect(parts[0].every(inside)).toBe(true);
  for (const residue of parts.slice(1).filter(part => part.length > 10)) expect(residue.some(inside)).toBe(false);
});

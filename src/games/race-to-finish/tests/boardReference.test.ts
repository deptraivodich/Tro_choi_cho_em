import { BOARD_TILES, START_TILE_ID, FINISH_TILE_ID, SHORTCUTS, TILE_ARTWORK_SOURCES, getTileDirection } from '../data/boardConfig';
import { getPenaltyReelCards } from '../logic/gameEngine';
import { BoardTile } from '../types';

test('every visible main-route circle is visited once and penalties match the artwork', () => {
  const ids: string[] = [];
  let id: string | undefined = START_TILE_ID;
  while (id) {
    expect(ids).not.toContain(id);
    ids.push(id);
    const tile: BoardTile = BOARD_TILES[id];
    expect(tile).toBeDefined();
    expect(tile.order).toBe(ids.length - 1);
    id = tile.nextTileIds.main;
  }
  expect(ids).toHaveLength(53);
  expect(ids).toHaveLength(Object.keys(BOARD_TILES).length);
  expect(ids.at(-1)).toBe(FINISH_TILE_ID);
  expect(BOARD_TILES.tile_4_bonus.type).toBe('bonus');
  expect(BOARD_TILES.tile_4_bonus.yPercent).toBeLessThan(BOARD_TILES.tile_4.yPercent);
  expect(BOARD_TILES.tile_33.type).toBe('penalty');
  expect(BOARD_TILES.tile_34.type).toBe('normal');
  expect(BOARD_TILES.tile_47.nextTileIds.main).toBe(FINISH_TILE_ID);
  for (const tile of Object.values(BOARD_TILES)) {
    expect(tile.xPercent).toBeGreaterThanOrEqual(0); expect(tile.xPercent).toBeLessThanOrEqual(100);
    expect(tile.yPercent).toBeGreaterThanOrEqual(0); expect(tile.yPercent).toBeLessThan(80);
    for (const nextId of Object.values(tile.nextTileIds)) expect(BOARD_TILES[nextId!]).toBeDefined();
  }
});

test('main-route directions follow the actual corners and shortcut entrances', () => {
  const directions = [
    ['tile_4', -50, -20], ['tile_8', 120, 150], ['tile_9', 100, 130],
    ['tile_16', -100, -80], ['tile_17', -120, -90], ['tile_18', -120, -90],
    ['tile_20', -90, -60], ['tile_21', -60, -30], ['tile_31', -10, 10], ['tile_34', -125, -95],
    ['tile_35', -125, -95], ['tile_45', 45, 75], ['tile_47', -80, -50],
    ['tile_13', 10, 40], ['tile_29', 65, 90], ['tile_30', 15, 45], ['tile_40', -40, -15],
  ] as const;
  for (const [id, min, max] of directions) {
    expect(getTileDirection(id)).toBeGreaterThan(min);
    expect(getTileDirection(id)).toBeLessThan(max);
  }
  expect(getTileDirection(FINISH_TILE_ID)).toBeUndefined();
});

test('new reference swaps the bonus with its predecessor, without moving route or shortcut endpoints', () => {
  expect(BOARD_TILES.tile_27.nextTileIds.main).toBe('tile_28');
  expect(BOARD_TILES.tile_28).toMatchObject({ type: 'bonus', xPercent: 60.3, yPercent: 57.1, nextTileIds: { main: 'tile_29' } });
  expect(BOARD_TILES.tile_29).toMatchObject({ type: 'normal', xPercent: 58.6, yPercent: 63.2, nextTileIds: { main: 'tile_30' } });
  expect(TILE_ARTWORK_SOURCES.tile_28).toBe('tile_29');
  expect(TILE_ARTWORK_SOURCES.tile_29).toBe('tile_28');
  expect(BOARD_TILES.tile_28.order + 1).toBe(BOARD_TILES.tile_29.order);
});

test('shortcut endpoints correspond to the two painted cross-paths', () => {
  expect(SHORTCUTS.map(s => [s.forkTileId, s.mergeTileId])).toEqual([
    ['tile_4', 'tile_8_mid'], ['tile_16', 'tile_30'],
  ]);
  for (const shortcut of SHORTCUTS) {
    const start = BOARD_TILES[shortcut.forkTileId], end = BOARD_TILES[shortcut.mergeTileId];
    expect(start.nextTileIds.shortcut).toBe(end.id);
    expect(start.nextTileIds.main).toBe(shortcut.mainNextId);
    expect(end.order - start.order - 1).toBe(shortcut.savedTilesCount);
  }
});

test('reset is only available inside the first ten actual circles, including inserted circles', () => {
  const early = Object.values(BOARD_TILES).filter(tile => tile.isFirstTenTiles);
  expect(early.map(t => t.order).sort((a,b) => a-b)).toEqual([1,2,3,4,5,6,7,8,9,10]);
  for (const tile of Object.values(BOARD_TILES)) {
    expect(getPenaltyReelCards(tile.id).includes('reset_start')).toBe(tile.order >= 1 && tile.order <= 10);
  }
});
